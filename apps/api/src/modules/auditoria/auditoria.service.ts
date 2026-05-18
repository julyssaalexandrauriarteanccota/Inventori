import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

interface AuditoriaInput {
  usuarioId?: string;
  accion: string;
  modelo: string;
  modeloId?: string;
  datosAntes?: unknown;
  datosDespues?: unknown;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registrar(input: AuditoriaInput) {
    try {
      await this.prisma.auditoria.create({
        data: {
          usuarioId: input.usuarioId ?? null,
          accion: input.accion,
          modelo: input.modelo,
          modeloId: input.modeloId ?? null,
          datosAntes: input.datosAntes ?? undefined,
          datosDespues: input.datosDespues ?? undefined,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error registrando auditoría: ${input.accion} ${input.modelo}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
