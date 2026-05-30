import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { MailerService } from './mailer.service';

/**
 * Módulo aislado para enviar correos transaccionales.
 *
 * - `MailerService`: wrapper de bajo nivel sobre Resend SDK (cualquier módulo
 *   puede inyectarlo para enviar correos arbitrarios).
 * - `EmailService`: orquesta plantillas + branding (auth/usuarios). Internamente
 *   delega en MailerService.
 *
 * Originalmente vivía dentro de `AuthModule`, pero al necesitarlo también
 * `UsuariosModule` (correo de bienvenida al activar cuenta) se extrajo aquí
 * para evitar dependencia circular AuthModule → UsuariosModule → AuthModule.
 *
 * Cualquier módulo que necesite enviar correos debe importar `MailModule`.
 */
@Module({
  providers: [MailerService, EmailService],
  exports: [MailerService, EmailService],
})
export class MailModule {}
