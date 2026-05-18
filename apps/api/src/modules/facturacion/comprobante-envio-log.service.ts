import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { QueryComprobanteEnvioLogDto } from './dto';

@Injectable()
export class ComprobanteEnvioLogService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryComprobanteEnvioLogDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.comprobanteId) where.comprobanteId = query.comprobanteId;
    if (query.estado) where.estado = query.estado;
    if (query.tipoEvento) where.tipoEvento = query.tipoEvento;

    const [data, total] = await Promise.all([
      this.prisma.comprobanteEnvioLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          comprobante: {
            select: { id: true, numero: true, tipo: true, estado: true },
          },
        },
      }),
      this.prisma.comprobanteEnvioLog.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, timestamp: new Date().toISOString() },
    };
  }

  async findByComprobante(comprobanteId: string) {
    const exists = await this.prisma.comprobante.findUnique({
      where: { id: comprobanteId },
      select: { id: true },
    });
    if (!exists) {
      throw new NotFoundException(`Comprobante ${comprobanteId} no encontrado`);
    }

    return this.prisma.comprobanteEnvioLog.findMany({
      where: { comprobanteId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
