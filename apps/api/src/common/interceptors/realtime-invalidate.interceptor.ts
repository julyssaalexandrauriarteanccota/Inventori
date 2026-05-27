import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { SocketEvents } from '@erp/shared';
import { EventsService } from '../../websockets/events.service';

const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

const SEGMENT_TO_SCOPE: Record<string, string> = {
  // Core ERP
  auditoria: 'auditoria',
  alquileres: 'alquileres',
  caja: 'ventas',
  clientes: 'clientes',
  compras: 'compras',
  equipos: 'equipos',
  garantias: 'garantias',
  inventario: 'inventario',
  proveedores: 'proveedores',
  reportes: 'reportes',
  soporte: 'soporte',
  ventas: 'ventas',

  // Catálogo (una sola “bolsa” para invalidar selects + listados)
  categorias: 'productos',
  marcas: 'productos',
  modelos: 'productos',
  'unidades-medida': 'productos',
  productos: 'productos',

  // Config / administración
  config: 'configuracion',
  usuarios: 'usuarios',
  ubicaciones: 'ubicaciones',

  // SUNAT / facturación
  facturacion: 'facturacion',
};

function parseBaseSegment(url: string) {
  const cleaned = url.split('?')[0] ?? '';

  return cleaned
    .replace(/^\/api\/v1\//, '')
    .split('/')
    .filter(Boolean)[0];
}

@Injectable()
export class RealtimeInvalidateInterceptor implements NestInterceptor {
  constructor(private readonly events: EventsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method?.toUpperCase();

    if (!method || !MUTATION_METHODS.has(method)) {
      return next.handle();
    }

    const url = request.originalUrl ?? request.url ?? '';
    const segment = parseBaseSegment(url);
    if (!segment) {
      return next.handle();
    }

    const scope = SEGMENT_TO_SCOPE[segment];
    if (!scope) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        this.events.emitToAll(SocketEvents.ERP_INVALIDATE, { scope });
      }),
    );
  }
}
