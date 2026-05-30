import { Module } from '@nestjs/common';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { MailModule } from '../auth/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [MailModule, NotificationsModule],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
