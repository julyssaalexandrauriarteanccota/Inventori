import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

/**
 * Módulo aislado para notificaciones por canales no-email (WhatsApp por ahora,
 * potencialmente Telegram/SMS/Push en el futuro). Para correo seguir usando
 * `MailModule` / `MailerService`.
 *
 * Cualquier módulo que necesite enviar WhatsApp debe importar este módulo.
 */
@Module({
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class NotificationsModule {}
