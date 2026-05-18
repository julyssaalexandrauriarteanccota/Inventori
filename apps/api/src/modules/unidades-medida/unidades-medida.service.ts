import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateUnidadMedidaDto, UpdateUnidadMedidaDto } from './dto';

@Injectable()
export class UnidadesMedidaService {
  private readonly logger = new Logger(UnidadesMedidaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUnidadMedidaDto) {
    await this.ensureUnique(dto.codigo, dto.nombre);

    const unidad = await this.prisma.unidadMedida.create({
      data: {
        codigo: dto.codigo,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        activo: dto.activo ?? true,
      },
    });

    this.logger.log(`Unidad de medida creada: ${unidad.id}`);
    return unidad;
  }

  async findAll() {
    return this.prisma.unidadMedida.findMany({
      where: { deletedAt: null },
      orderBy: [{ codigo: 'asc' }, { nombre: 'asc' }],
    });
  }

  async findOne(id: string) {
    const unidad = await this.prisma.unidadMedida.findFirst({
      where: { id, deletedAt: null },
      include: {
        productos: {
          where: { deletedAt: null },
          select: { id: true, nombre: true, sku: true },
          take: 20,
        },
      },
    });

    if (!unidad) {
      throw new NotFoundException(`Unidad de medida ${id} no encontrada`);
    }

    return unidad;
  }

  async update(id: string, dto: UpdateUnidadMedidaDto) {
    const current = await this.findOne(id);

    await this.ensureUnique(
      dto.codigo ?? current.codigo,
      dto.nombre ?? current.nombre,
      id,
    );

    const unidad = await this.prisma.unidadMedida.update({
      where: { id },
      data: {
        codigo: dto.codigo,
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        activo: dto.activo,
      },
    });

    this.logger.log(`Unidad de medida actualizada: ${id}`);
    return unidad;
  }

  async remove(id: string) {
    await this.findOne(id);

    const productosCount = await this.prisma.producto.count({
      where: { unidadMedidaId: id, deletedAt: null },
    });

    if (productosCount > 0) {
      throw new ConflictException(
        'No se puede eliminar una unidad de medida con productos asociados',
      );
    }

    await this.prisma.unidadMedida.update({
      where: { id },
      data: { deletedAt: new Date(), activo: false },
    });

    this.logger.log(`Unidad de medida eliminada (soft delete): ${id}`);
  }

  private async ensureUnique(
    codigo: string,
    nombre: string,
    excludeId?: string,
  ) {
    const existing = await this.prisma.unidadMedida.findFirst({
      where: {
        deletedAt: null,
        id: excludeId ? { not: excludeId } : undefined,
        OR: [
          { codigo: { equals: codigo, mode: 'insensitive' } },
          { nombre: { equals: nombre, mode: 'insensitive' } },
        ],
      },
    });

    if (!existing) {
      return;
    }

    if (existing.codigo.toLowerCase() === codigo.toLowerCase()) {
      throw new ConflictException(
        'Ya existe una unidad de medida con este código',
      );
    }

    throw new ConflictException(
      'Ya existe una unidad de medida con este nombre',
    );
  }
}
