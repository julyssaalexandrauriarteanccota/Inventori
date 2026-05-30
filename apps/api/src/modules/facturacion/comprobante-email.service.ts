import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { EstadoComprobante } from '@erp/shared';
import { PrismaService } from '../../database/prisma.service';
import { FiscalStorageService } from './fiscal-storage.service';
import { MailerService } from '../auth/mailer.service';

interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

@Injectable()
export class ComprobanteEmailService {
  private readonly logger = new Logger(ComprobanteEmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly storage: FiscalStorageService,
    private readonly mailer: MailerService,
  ) {}

  async enviarComprobanteAceptado(comprobanteId: string) {
    const comprobante = await this.prisma.comprobante.findUnique({
      where: { id: comprobanteId },
      include: {
        venta: { include: { cliente: true } },
        comprobanteOrigen: {
          include: { venta: { include: { cliente: true } } },
        },
      },
    });

    if (!comprobante) {
      this.logger.warn(
        `No se envía email: comprobante ${comprobanteId} no encontrado`,
      );
      return { estado: 'OMITIDO_NO_ENCONTRADO' };
    }

    if (
      comprobante.estado !== EstadoComprobante.ACEPTADO &&
      comprobante.estado !== EstadoComprobante.ACEPTADO_CON_OBSERVACIONES
    ) {
      return { estado: 'OMITIDO_ESTADO' };
    }

    const destinatario =
      comprobante.venta?.cliente?.email ??
      comprobante.comprobanteOrigen?.venta?.cliente?.email ??
      null;
    const asunto = `Comprobante electrónico ${comprobante.tipo} ${comprobante.numero} de ${comprobante.emisorRazonSocial ?? comprobante.emisorRuc ?? 'ERP'}`;

    if (!destinatario) {
      await this.log(comprobante.id, 'sin-email', asunto, 'OMITIDO_SIN_EMAIL');
      return { estado: 'OMITIDO_SIN_EMAIL' };
    }

    if (!this.mailer.isConfigured()) {
      await this.log(
        comprobante.id,
        destinatario,
        asunto,
        'OMITIDO_CONFIG_MAIL',
        'Configura RESEND_API_KEY y MAIL_FROM para enviar comprobantes al receptor.',
      );
      return { estado: 'OMITIDO_CONFIG_MAIL' };
    }

    try {
      const tokenConsulta = await this.ensureTokenConsulta(
        comprobante.id,
        comprobante.tokenConsulta,
      );
      const attachments = await this.buildAttachments(comprobante);
      const result = await this.mailer.send({
        to: destinatario,
        subject: asunto,
        html: this.renderHtml(comprobante, tokenConsulta),
        attachments,
      });

      if (!result.delivered) {
        const message =
          result.errorMessage ?? `Falló envío (${result.reason ?? 'unknown'})`;
        await this.log(comprobante.id, destinatario, asunto, 'ERROR', message);
        return { estado: 'ERROR' };
      }

      await this.log(
        comprobante.id,
        destinatario,
        asunto,
        'ENVIADO',
        undefined,
        result.messageId,
      );
      return { estado: 'ENVIADO', messageId: result.messageId };
    } catch (error) {
      await this.log(
        comprobante.id,
        destinatario,
        asunto,
        'ERROR',
        (error as Error).message,
      );
      this.logger.error(
        `No se pudo enviar email de ${comprobante.numero} a ${destinatario}: ${(error as Error).message}`,
      );
      return { estado: 'ERROR' };
    }
  }

  private async ensureTokenConsulta(id: string, token?: string | null) {
    if (token) return token;

    const tokenConsulta = randomUUID();
    await this.prisma.comprobante.update({
      where: { id },
      data: { tokenConsulta, tokenConsultaCreatedAt: new Date() },
    });
    return tokenConsulta;
  }

  private async buildAttachments(comprobante: {
    numero: string;
    xmlStorageKey?: string | null;
    cdrStorageKey?: string | null;
    pdfStorageKey?: string | null;
  }): Promise<EmailAttachment[]> {
    return [
      await this.readAttachment(
        comprobante.xmlStorageKey,
        `${comprobante.numero}.xml`,
        'application/xml',
      ),
      await this.readAttachment(
        comprobante.cdrStorageKey,
        `${comprobante.numero}.cdr.zip`,
        'application/zip',
      ),
      await this.readAttachment(
        comprobante.pdfStorageKey,
        `${comprobante.numero}.pdf`,
        'application/pdf',
      ),
    ];
  }

  private async readAttachment(
    storageKey: string | null | undefined,
    filename: string,
    contentType: string,
  ): Promise<EmailAttachment> {
    if (!storageKey) {
      throw new Error(`No existe storageKey para adjunto ${filename}`);
    }
    const content = await this.storage.readObjectBuffer(storageKey);
    if (!content) {
      throw new Error(`No se encontró en storage el adjunto ${filename}`);
    }
    return { filename, content, contentType };
  }

  private renderHtml(
    comprobante: {
      numero: string;
      tipo: string;
      emisorRazonSocial?: string | null;
      total: unknown;
    },
    tokenConsulta: string,
  ) {
    const baseUrl = this.config.get<string>(
      'PORTAL_CLIENTE_BASE_URL',
      this.config.get<string>('PUBLIC_WEB_URL', 'http://localhost:3000'),
    );
    const url = `${baseUrl.replace(/\/$/, '')}/portal-cliente/c/${tokenConsulta}`;
    return `
      <p>Se emitió el comprobante electrónico <strong>${comprobante.tipo} ${comprobante.numero}</strong>.</p>
      <p>Emisor: ${comprobante.emisorRazonSocial ?? 'ERP'}</p>
      <p>Total: S/ ${Number(comprobante.total ?? 0).toFixed(2)}</p>
      <p><a href="${url}">Ver comprobante en el portal cliente</a></p>
    `;
  }

  private async log(
    comprobanteId: string,
    destinatario: string,
    asunto: string,
    estado: string,
    errorMessage?: string,
    messageId?: string,
  ) {
    await this.prisma.comprobanteEmailLog.create({
      data: {
        comprobanteId,
        destinatario,
        asunto,
        estado,
        errorMessage,
        messageId,
        sentAt: estado === 'ENVIADO' ? new Date() : undefined,
      },
    });
  }
}
