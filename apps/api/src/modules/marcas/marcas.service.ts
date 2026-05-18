import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { TipoProducto } from '@erp/shared';
import { PrismaService } from '../../database/prisma.service';
import { CreateMarcaDto, UpdateMarcaDto } from './dto';

@Injectable()
export class MarcasService {
  private readonly logger = new Logger(MarcasService.name);

  constructor(private readonly prisma: PrismaService) {}

  private normalizeTipos(tipos?: TipoProducto[]) {
    const normalized = Array.from(
      new Set((tipos ?? [TipoProducto.EQUIPO]).filter(Boolean)),
    );

    return normalized.length > 0 ? normalized : [TipoProducto.EQUIPO];
  }

  async create(dto: CreateMarcaDto) {
    const nombre = dto.nombre.trim();
    const duplicateWhere = {
      nombre: { equals: nombre, mode: 'insensitive' as const },
    };

    const existing = await this.prisma.marca.findFirst({
      where: { ...duplicateWhere, deletedAt: null },
    });
    if (existing) {
      const existingTipos = existing.tipos as TipoProducto[];
      const nextTipos = this.normalizeTipos([
        ...existingTipos,
        ...this.normalizeTipos(dto.tipos),
      ]);
      const hasNewTipo = nextTipos.length !== existingTipos.length;

      if (!hasNewTipo) {
        throw new ConflictException('Ya existe una marca con este nombre');
      }

      const marca = await this.prisma.marca.update({
        where: { id: existing.id },
        data: { tipos: nextTipos },
      });
      this.logger.log(`Marca actualizada con nuevos tipos: ${marca.id}`);
      return marca;
    }

    const deleted = await this.prisma.marca.findFirst({
      where: { ...duplicateWhere, deletedAt: { not: null } },
    });

    if (deleted) {
      const marca = await this.prisma.marca.update({
        where: { id: deleted.id },
        data: {
          nombre,
          tipos: this.normalizeTipos(dto.tipos),
          deletedAt: null,
        },
      });
      this.logger.log(`Marca restaurada: ${marca.id}`);
      return marca;
    }

    const marca = await this.prisma.marca.create({
      data: {
        nombre,
        tipos: this.normalizeTipos(dto.tipos),
      },
    });
    this.logger.log(`Marca creada: ${marca.id}`);
    return marca;
  }

  async findAll(tipo?: TipoProducto) {
    return this.prisma.marca.findMany({
      where: {
        deletedAt: null,
        ...(tipo ? { tipos: { has: tipo } } : {}),
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const marca = await this.prisma.marca.findFirst({
      where: { id, deletedAt: null },
      include: {
        productos: {
          where: { deletedAt: null },
          select: { id: true, nombre: true, sku: true, tipo: true },
          take: 20,
        },
      },
    });
    if (!marca) {
      throw new NotFoundException(`Marca ${id} no encontrada`);
    }
    return marca;
  }

  async update(id: string, dto: UpdateMarcaDto) {
    await this.findOne(id);
    const nombre = dto.nombre?.trim();

    if (nombre) {
      const existing = await this.prisma.marca.findFirst({
        where: {
          nombre: { equals: nombre, mode: 'insensitive' },
          deletedAt: null,
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException('Ya existe una marca con este nombre');
      }
    }

    const marca = await this.prisma.marca.update({
      where: { id },
      data: {
        ...(nombre !== undefined ? { nombre } : {}),
        ...(dto.tipos ? { tipos: this.normalizeTipos(dto.tipos) } : {}),
      },
    });
    this.logger.log(`Marca actualizada: ${id}`);
    return marca;
  }

  async remove(id: string) {
    await this.findOne(id);

    const productosCount = await this.prisma.producto.count({
      where: { marcaId: id, deletedAt: null },
    });
    if (productosCount > 0) {
      throw new ConflictException(
        'No se puede eliminar una marca con productos asociados',
      );
    }

    await this.prisma.marca.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.logger.log(`Marca eliminada (soft delete): ${id}`);
  }
}
