import { Injectable, Logger } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { RolUsuario, SocketEventName } from '@erp/shared';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly gateway: EventsGateway) {}

  emitToUser(userId: string, event: SocketEventName, payload: unknown) {
    this.gateway.server?.to(`user:${userId}`).emit(event, payload);
    this.logger.debug(`Emit ${event} → user:${userId}`);
  }

  emitToRole(role: RolUsuario, event: SocketEventName, payload: unknown) {
    this.gateway.server?.to(`role:${role}`).emit(event, payload);
    this.logger.debug(`Emit ${event} → role:${role}`);
  }

  emitToRoles(roles: RolUsuario[], event: SocketEventName, payload: unknown) {
    for (const role of roles) {
      this.emitToRole(role, event, payload);
    }
  }

  emitToAll(event: SocketEventName, payload: unknown) {
    this.gateway.server?.emit(event, payload);
    this.logger.debug(`Emit ${event} → all`);
  }
}
