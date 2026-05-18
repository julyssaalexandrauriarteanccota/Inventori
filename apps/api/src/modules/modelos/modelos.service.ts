import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { TipoProducto } from '@erp/shared';
import { PrismaService } from '../../database/prisma.service';
import { CreateModeloDto, QueryModeloDto, UpdateModeloDto } from './dto';

@Injectable()
export class ModelosService {
  private readonly logger = new Logger(ModelosService.name);

  constructor(private readonly prisma: PrismaService) {}

  private normalizeNombre(nombre: string) {
    return nombre.trim();
  }

  private normalizeDescripcion(descripcion?: string) {
    const normalized = descripcion?.trim();
    return normalized ? normalized : null;
  }

  private async validateMarca(marcaId: string, tipo: TipoProducto) {
    const marca = await this.prisma.marca.findFirst({
      where: {
        id: marcaId,
        deletedAt: null,
        tipos: { has: tipo },
      },
      select: { id: true, nombre: true },
    });

    if (!marca) {
      throw new BadRequestException(
        'La marca seleccionada no existe o no pertenece al tipo del modelo',
      );
    }

    return marca;
  }

  private async ensureUniqueNombre(
    nombre: string,
    tipo: TipoProducto,
    marcaId?: string | null,
    excludeId?: string,
  ) {
    const existing = await this.prisma.modeloCatalogo.findFirst({
      where: {
        deletedAt: null,
        tipo,
        ...(excludeId ? { id: { not: excludeId } } : {}),
        ...(marcaId ? { marcaId } : { marcaId: null }),
        nombre: {
          equals: nombre,
          mode: 'insensitive',
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'Ya existe un modelo con ese nombre para el tipo y marca seleccionados',
      );
    }
  }

  async create(dto: CreateModeloDto) {
    const nombre = this.normalizeNombre(dto.nombre);
    const marcaId = dto.marcaId ?? null;

    if (marcaId) {
      await this.validateMarca(marcaId, dto.tipo);
    }

    await this.ensureUniqueNombre(nombre, dto.tipo, marcaId);

    const deleted = await this.prisma.modeloCatalogo.findFirst({
      where: {
        deletedAt: { not: null },
        tipo: dto.tipo,
        ...(marcaId ? { marcaId } : { marcaId: null }),
        nombre: {
          equals: nombre,
          mode: 'insensitive',
        },
      },
    });

    if (deleted) {
      const modelo = await this.prisma.modeloCatalogo.update({
        where: { id: deleted.id },
        data: {
          nombre,
          descripcion: this.normalizeDescripcion(dto.descripcion),
          tipo: dto.tipo,
          marcaId,
          activo: dto.activo ?? true,
          deletedAt: null,
        },
        include: {
          marca: { select: { id: true, nombre: true } },
        },
      });

      this.logger.log(`Modelo restaurado: ${modelo.id}`);
      return modelo;
    }

    const modelo = await this.prisma.modeloCatalogo.create({
      data: {
        nombre,
        descripcion: this.normalizeDescripcion(dto.descripcion),
        tipo: dto.tipo,
        marcaId,
        activo: dto.activo ?? true,
      },
      include: {
        marca: { select: { id: true, nombre: true } },
      },
    });

    this.logger.log(`Modelo creado: ${modelo.id}`);
    return modelo;
  }

  async findAll(query: QueryModeloDto = {}) {
    const { tipo, marcaId, search, activo } = query;

    return this.prisma.modeloCatalogo.findMany({
      where: {
        deletedAt: null,
        ...(tipo ? { tipo } : {}),
        ...(marcaId ? { marcaId } : {}),
        ...(activo !== undefined ? { activo } : {}),
        ...(search
          ? {
              OR: [
                { nombre: { contains: search, mode: 'insensitive' } },
                { descripcion: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        marca: { select: { id: true, nombre: true } },
      },
      orderBy: [{ nombre: 'asc' }],
    });
  }

  async findOne(id: string) {
    const modelo = await this.prisma.modeloCatalogo.findFirst({
      where: { id, deletedAt: null },
      include: {
        marca: { select: { id: true, nombre: true } },
        productos: {
          where: { deletedAt: null },
          select: { id: true, nombre: true, sku: true, tipo: true },
          take: 20,
        },
      },
    });

    if (!modelo) {
      throw new NotFoundException(`Modelo ${id} no encontrado`);
    }

    return modelo;
  }

  async update(id: string, dto: UpdateModeloDto) {
    const current = await this.findOne(id);
    const nextTipo = (dto.tipo ?? current.tipo) as TipoProducto;
    const marcaId =
      dto.marcaId === undefined
        ? (current.marca?.id ?? null)
        : (dto.marcaId ?? null);
    const nombre = dto.nombre
      ? this.normalizeNombre(dto.nombre)
      : current.nombre;

    if (marcaId) {
      await this.validateMarca(marcaId, nextTipo);
    }

    await this.ensureUniqueNombre(nombre, nextTipo, marcaId, id);

    const modelo = await this.prisma.modeloCatalogo.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined ? { nombre } : {}),
        ...(dto.descripcion !== undefined
          ? { descripcion: this.normalizeDescripcion(dto.descripcion) }
          : {}),
        ...(dto.tipo !== undefined ? { tipo: nextTipo } : {}),
        ...(dto.marcaId !== undefined ? { marcaId } : {}),
        ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
      },
      include: {
        marca: { select: { id: true, nombre: true } },
      },
    });

    this.logger.log(`Modelo actualizado: ${id}`);
    return modelo;
  }

  async remove(id: string) {
    await this.findOne(id);

    const productosCount = await this.prisma.producto.count({
      where: {
        modeloCatalogoId: id,
        deletedAt: null,
      },
    });

    if (productosCount > 0) {
      throw new ConflictException(
        'No se puede eliminar un modelo que ya está siendo usado por productos',
      );
    }

    await this.prisma.modeloCatalogo.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        activo: false,
      },
    });

    this.logger.log(`Modelo eliminado (soft delete): ${id}`);
  }
}
