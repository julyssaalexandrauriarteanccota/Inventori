import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

/**
 * Módulo aislado para enviar correos transaccionales.
 *
 * `EmailService` originalmente vivía dentro de `AuthModule`, pero al
 * necesitarlo también `UsuariosModule` (correo de bienvenida al activar
 * cuenta), se extrajo aquí para evitar dependencia circular:
 *   AuthModule → UsuariosModule → AuthModule.
 *
 * Cualquier módulo que necesite enviar correos debe importar `MailModule`.
 */
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class MailModule {}
