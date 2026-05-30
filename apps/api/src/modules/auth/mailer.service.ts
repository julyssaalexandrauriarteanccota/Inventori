import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface MailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface MailMessage {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: MailAttachment[];
}

export type MailSkipReason =
  | 'NO_API_KEY'
  | 'NO_FROM'
  | 'PROVIDER_ERROR'
  | 'TRANSPORT_ERROR';

export interface MailSendResult {
  delivered: boolean;
  provider: 'resend' | 'none';
  messageId?: string;
  reason?: MailSkipReason;
  errorMessage?: string;
}

/**
 * Transport-agnostic mailer wrapper.
 *
 * - Usa Resend SDK como proveedor único.
 * - Si `RESEND_API_KEY` o `MAIL_FROM` no están seteados → log warn y
 *   `delivered=false` (no rompe el flujo del caller).
 * - Mantiene cliente Resend en cache; reconecta si la API key cambia
 *   (útil cuando el ConfigService recarga env en hot-reload de dev).
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private resend: Resend | null = null;
  private resolvedApiKey: string | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(): Resend | null {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (!apiKey) return null;
    if (this.resend && this.resolvedApiKey === apiKey) return this.resend;
    this.resend = new Resend(apiKey);
    this.resolvedApiKey = apiKey;
    return this.resend;
  }

  private getDefaultFrom(): string | null {
    return this.config.get<string>('MAIL_FROM') ?? null;
  }

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('RESEND_API_KEY') && this.getDefaultFrom(),
    );
  }

  async send(msg: MailMessage): Promise<MailSendResult> {
    const recipientLabel = formatTo(msg.to);
    const client = this.getClient();
    if (!client) {
      this.logger.warn(
        `RESEND_API_KEY no configurado. Correo "${msg.subject}" para ${recipientLabel} NO enviado.`,
      );
      return { delivered: false, provider: 'none', reason: 'NO_API_KEY' };
    }

    const from = msg.from ?? this.getDefaultFrom();
    if (!from) {
      this.logger.warn(
        `MAIL_FROM no configurado. Correo "${msg.subject}" para ${recipientLabel} NO enviado.`,
      );
      return { delivered: false, provider: 'none', reason: 'NO_FROM' };
    }

    try {
      const { data, error } = await client.emails.send({
        from,
        to: Array.isArray(msg.to) ? msg.to : [msg.to],
        subject: msg.subject,
        ...(msg.html ? { html: msg.html } : {}),
        ...(msg.text ? { text: msg.text } : {}),
        ...(msg.replyTo ? { replyTo: msg.replyTo } : {}),
        ...(msg.attachments
          ? {
              attachments: msg.attachments.map((a) => ({
                filename: a.filename,
                content: a.content,
                ...(a.contentType ? { contentType: a.contentType } : {}),
              })),
            }
          : {}),
      });

      if (error) {
        this.logger.error(
          `Resend rechazó email "${msg.subject}" → ${recipientLabel}: ${error.message}`,
        );
        return {
          delivered: false,
          provider: 'resend',
          reason: 'PROVIDER_ERROR',
          errorMessage: error.message,
        };
      }

      const messageId = data?.id;
      this.logger.log(
        `Email "${msg.subject}" enviado a ${recipientLabel} (resend:${messageId ?? 'unknown'})`,
      );
      return { delivered: true, provider: 'resend', messageId };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Falla al enviar email "${msg.subject}" a ${recipientLabel}: ${message}`,
        err instanceof Error ? err.stack : undefined,
      );
      return {
        delivered: false,
        provider: 'resend',
        reason: 'TRANSPORT_ERROR',
        errorMessage: message,
      };
    }
  }
}

function formatTo(to: string | string[]): string {
  return Array.isArray(to) ? to.join(', ') : to;
}
