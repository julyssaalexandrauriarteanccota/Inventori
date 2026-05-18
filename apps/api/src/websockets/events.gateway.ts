import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../common/types';

type AuthenticatedSocketData = {
  userId?: string;
  email?: string;
  rol?: JwtPayload['rol'];
};

const firstString = (
  value: string | string[] | undefined,
): string | undefined => (Array.isArray(value) ? value[0] : value);

const readBearerToken = (client: Socket): string | undefined => {
  const authToken = firstString(
    client.handshake.auth?.token as string | string[] | undefined,
  );
  if (authToken) {
    return authToken;
  }

  return firstString(client.handshake.headers?.authorization)?.replace(
    'Bearer ',
    '',
  );
};

@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = readBearerToken(client);

      if (!token) {
        this.logger.warn(`Client ${client.id} rejected: no token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });

      const data = client.data as AuthenticatedSocketData;
      data.userId = payload.sub;
      data.email = payload.email;
      data.rol = payload.rol;

      await client.join(`user:${payload.sub}`);
      await client.join(`role:${payload.rol}`);

      this.logger.log(
        `Client connected: ${client.id} (user: ${payload.email}, role: ${payload.rol})`,
      );
    } catch {
      this.logger.warn(`Client ${client.id} rejected: invalid token`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }
}
