import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WhatsappTextMessage {
  to: string;
  text: string;
}

export interface WhatsappMediaMessage {
  to: string;
  filename: string;
  content: Buffer;
  mimetype?: string;
  caption?: string;
}

export type WhatsappSkipReason =
  | 'NOT_CONFIGURED'
  | 'INVALID_NUMBER'
  | 'PROVIDER_ERROR'
  | 'TRANSPORT_ERROR';

export interface WhatsappSendResult {
  delivered: boolean;
  provider: 'evolution' | 'none';
  messageId?: string;
  reason?: WhatsappSkipReason;
  errorMessage?: string;
  normalizedNumber?: string;
}

/**
 * Wrapper sobre Evolution API (https://github.com/EvolutionAPI/evolution-api).
 *
 * Endpoints usados (Evolution v2):
 *   POST {EVOLUTION_API_URL}/message/sendText/{instance}
 *   POST {EVOLUTION_API_URL}/message/sendMedia/{instance}
 *
 * Headers: `apikey: <EVOLUTION_API_KEY>`, `Content-Type: application/json`.
 *
 * Si faltan envs (URL/KEY/INSTANCE) → log warn y `delivered=false` con
 * `reason='NOT_CONFIGURED'`. No rompe el flujo del caller (mismo patrón que
 * MailerService cuando RESEND_API_KEY no está seteado).
 *
 * Normalización de números: limpia caracteres no numéricos. Para móviles
 * peruanos de 9 dígitos que arrancan con `9` agrega prefijo `51` (E.164 sin `+`).
 * Si quieres otros países / fijos / pasa el número ya con código (ej: `5491155...`)
 * dejará el número tal cual y solo limpia el `+`/espacios/guiones.
 */
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('EVOLUTION_API_URL') &&
        this.config.get<string>('EVOLUTION_API_KEY') &&
        this.config.get<string>('EVOLUTION_INSTANCE_NAME'),
    );
  }

  /**
   * Normaliza un teléfono al formato E.164 sin `+` que Evolution API espera.
   * Acepta: `+51 999 999 999`, `999999999`, `00 51 999...`, `51999999999`.
   * Si no puede normalizar a un número válido (p.ej. menos de 7 dígitos),
   * devuelve `null` y el caller debe omitir el envío.
   */
  normalize(phone: string | null | undefined): string | null {
    if (!phone) return null;
    const digits = phone.replace(/\D+/g, '').replace(/^00/, '');
    if (digits.length < 7) return null;
    // Móvil peruano de 9 dígitos que empieza con 9 → prepender 51
    if (digits.length === 9 && digits.startsWith('9')) return `51${digits}`;
    return digits;
  }

  async sendText(msg: WhatsappTextMessage): Promise<WhatsappSendResult> {
    if (!this.isConfigured()) {
      return this.skipNotConfigured(msg.to);
    }
    const number = this.normalize(msg.to);
    if (!number) {
      return this.skipInvalidNumber(msg.to);
    }
    return this.request('sendText', number, { number, text: msg.text });
  }

  async sendMedia(msg: WhatsappMediaMessage): Promise<WhatsappSendResult> {
    if (!this.isConfigured()) {
      return this.skipNotConfigured(msg.to);
    }
    const number = this.normalize(msg.to);
    if (!number) {
      return this.skipInvalidNumber(msg.to);
    }
    const mimetype = msg.mimetype ?? guessMimetype(msg.filename);
    const mediatype = mediatypeFromMime(mimetype);
    return this.request('sendMedia', number, {
      number,
      mediatype,
      mimetype,
      media: msg.content.toString('base64'),
      fileName: msg.filename,
      ...(msg.caption ? { caption: msg.caption } : {}),
    });
  }

  private async request(
    endpoint: 'sendText' | 'sendMedia',
    number: string,
    body: Record<string, unknown>,
  ): Promise<WhatsappSendResult> {
    const baseUrl = this.config.getOrThrow<string>('EVOLUTION_API_URL');
    const apiKey = this.config.getOrThrow<string>('EVOLUTION_API_KEY');
    const instance = this.config.getOrThrow<string>('EVOLUTION_INSTANCE_NAME');
    const url = `${baseUrl.replace(/\/$/, '')}/message/${endpoint}/${encodeURIComponent(instance)}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const raw = await response.text();
      const data = safeParseJson(raw);

      if (!response.ok) {
        const errorMessage =
          extractEvolutionError(data) || `${response.status} ${response.statusText}`;
        this.logger.error(
          `Evolution rechazó ${endpoint} → ${number}: ${errorMessage}`,
        );
        return {
          delivered: false,
          provider: 'evolution',
          reason: 'PROVIDER_ERROR',
          errorMessage,
          normalizedNumber: number,
        };
      }

      const messageId = extractMessageId(data);
      this.logger.log(
        `WhatsApp ${endpoint} → ${number} OK (evolution:${messageId ?? 'unknown'})`,
      );
      return {
        delivered: true,
        provider: 'evolution',
        messageId,
        normalizedNumber: number,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Falla al enviar WhatsApp ${endpoint} a ${number}: ${message}`,
        err instanceof Error ? err.stack : undefined,
      );
      return {
        delivered: false,
        provider: 'evolution',
        reason: 'TRANSPORT_ERROR',
        errorMessage: message,
        normalizedNumber: number,
      };
    }
  }

  private skipNotConfigured(to: string): WhatsappSendResult {
    this.logger.warn(
      `Evolution API no configurada. WhatsApp para ${to} NO enviado.`,
    );
    return {
      delivered: false,
      provider: 'none',
      reason: 'NOT_CONFIGURED',
    };
  }

  private skipInvalidNumber(to: string): WhatsappSendResult {
    this.logger.warn(`Número WhatsApp inválido: "${to}". Envío omitido.`);
    return {
      delivered: false,
      provider: 'none',
      reason: 'INVALID_NUMBER',
    };
  }
}

function safeParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function extractMessageId(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  // Evolution v2 devuelve: { key: { id: '...' }, message: {...}, ... }
  const key = (data as { key?: { id?: string } }).key;
  if (key && typeof key.id === 'string') return key.id;
  return undefined;
}

function extractEvolutionError(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') {
    return typeof data === 'string' ? data : undefined;
  }
  const obj = data as { message?: unknown; response?: { message?: unknown } };
  const msg = obj.response?.message ?? obj.message;
  if (Array.isArray(msg)) return msg.join('; ');
  if (typeof msg === 'string') return msg;
  return undefined;
}

function guessMimetype(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'mp3') return 'audio/mpeg';
  if (ext === 'zip') return 'application/zip';
  if (ext === 'xml') return 'application/xml';
  return 'application/octet-stream';
}

function mediatypeFromMime(mime: string): 'image' | 'video' | 'audio' | 'document' {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'document';
}
