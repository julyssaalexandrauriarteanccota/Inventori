import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditoriaService } from '../../modules/auditoria/auditoria.service';

const METHOD_ACTION_MAP: Record<string, string> = {
  POST: 'CREAR',
  PATCH: 'ACTUALIZAR',
  PUT: 'ACTUALIZAR',
  DELETE: 'ELIMINAR',
};

@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = request;
    const userAgent = request.headers['user-agent'] ?? undefined;

    const accion = METHOD_ACTION_MAP[method];
    if (!accion) {
      return next.handle();
    }

    // Extraer modelo y modeloId de la URL: /api/v1/usuarios/uuid → modelo=usuarios, modeloId=uuid
    const segments = url
      .replace(/^\/api\/v1\//, '')
      .split('/')
      .filter(Boolean);
    const modelo = segments[0] ?? 'unknown';
    const modeloId = segments[1] ?? undefined;

    const userId = request.user?.sub ?? undefined;

    return next.handle().pipe(
      tap((responseData: unknown) => {
        void this.auditoriaService.registrar({
          usuarioId: userId,
          accion,
          modelo,
          modeloId,
          datosDespues:
            responseData && typeof responseData === 'object'
              ? (responseData as Record<string, unknown>)
              : undefined,
          ip: ip ?? undefined,
          userAgent,
        });
      }),
    );
  }
}
