import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { MailerService } from './mailer.service';
import type { EmailBrand, EmailTemplate } from './email-templates';

/**
 * Servicio centralizado de envío de correos transaccionales del módulo auth.
 *
 * - Resuelve el branding desde `ConfigEmpresa` (logo, razonSocial, colorPrimario)
 *   con cache en memoria para evitar pegarle a BD en cada correo.
 * - Delega el envío a `MailerService` (Resend SDK). Si Resend no está
 *   configurado, devuelve `false` sin romper el flujo de auth.
 * - Las plantillas viven en `email-templates.ts`; este servicio solo orquesta.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private brandCache: EmailBrand | null = null;
  private brandCacheAt = 0;
  private readonly brandCacheTtlMs = 5 * 60 * 1000; // 5 min

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  async getBrand(): Promise<EmailBrand> {
    if (
      this.brandCache &&
      Date.now() - this.brandCacheAt < this.brandCacheTtlMs
    ) {
      return this.brandCache;
    }

    const config = await this.prisma.configEmpresa.findFirst({
      select: {
        razonSocial: true,
        nombreComercial: true,
        slogan: true,
        logo: true,
        colorPrimario: true,
      },
    });

    this.brandCache = {
      nombre: config?.nombreComercial || config?.razonSocial || 'Inventori ERP',
      slogan: config?.slogan ?? null,
      colorPrimario: config?.colorPrimario ?? null,
      logoUrl: this.resolveLogoUrl(config?.logo),
    };
    this.brandCacheAt = Date.now();
    return this.brandCache;
  }

  invalidateBrandCache() {
    this.brandCache = null;
    this.brandCacheAt = 0;
  }

  private resolveLogoUrl(logo?: string | null): string | null {
    if (!logo) return null;
    if (logo.startsWith('http://') || logo.startsWith('https://')) return logo;
    // Logo guardado como path relativo (MinIO/local) — resolver vs FRONTEND_URL
    const frontend =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    return `${frontend.replace(/\/$/, '')}/${logo.replace(/^\//, '')}`;
  }

  async send(to: string, template: EmailTemplate): Promise<boolean> {
    const result = await this.mailer.send({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
    return result.delivered;
  }
}
