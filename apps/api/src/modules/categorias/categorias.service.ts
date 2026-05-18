import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TipoProducto } from '@erp/shared';
import { PrismaService } from '../../database/prisma.service';
import { CreateCategoriaDto, UpdateCategoriaDto } from './dto';

@Injectable()
export class CategoriasService {
  private readonly logger = new Logger(CategoriasService.name);

  constructor(private readonly prisma: PrismaService) {}

  private getCategoriaTipo(
    dto: { tipo?: TipoProducto },
    padre?: { tipo: string } | null,
  ) {
    return (dto.tipo ?? padre?.tipo ?? TipoProducto.REPUESTO) as TipoProducto;
  }

  async create(dto: CreateCategoriaDto) {
    const nombre = dto.nombre.trim();
    let padre: { id: string; tipo: string } | null = null;
    if (dto.padreId) {
      padre = await this.prisma.categoria.findFirst({
        where: { id: dto.padreId, deletedAt: null },
        select: { id: true, tipo: true },
      });
      if (!padre) {
        throw new NotFoundException(
          `Categoría padre ${dto.padreId} no encontrada`,
        );
      }
    }

    const tipo = this.getCategoriaTipo(dto, padre);
    if (padre && (padre.tipo as TipoProducto) !== tipo) {
      throw new BadRequestException(
        'Una subcategoría debe tener el mismo tipo que su categoría padre',
      );
    }

    const duplicateWhere = {
      nombre: { equals: nombre, mode: 'insensitive' as const },
      tipo,
      padreId: dto.padreId ?? null,
    };

    const existing = await this.prisma.categoria.findFirst({
      where: {
        ...duplicateWhere,
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException(
        'Ya existe una categoría con este nombre para este tipo',
      );
    }

    const deleted = await this.prisma.categoria.findFirst({
      where: {
        ...duplicateWhere,
        deletedAt: { not: null },
      },
    });

    if (deleted) {
      const categoria = await this.prisma.categoria.update({
        where: { id: deleted.id },
        data: {
          nombre,
          descripcion: dto.descripcion?.trim() || null,
          tipo,
          padreId: dto.padreId ?? null,
          deletedAt: null,
        },
      });
      this.logger.log(`Categoría restaurada: ${categoria.id}`);
      return categoria;
    }

    const categoria = await this.prisma.categoria.create({
      data: {
        ...dto,
        nombre,
        descripcion: dto.descripcion?.trim() || undefined,
        tipo,
      },
    });
    this.logger.log(`Categoría creada: ${categoria.id}`);
    return categoria;
  }

  async findAll(tipo?: TipoProducto) {
    return this.prisma.categoria.findMany({
      where: { padreId: null, deletedAt: null, ...(tipo ? { tipo } : {}) },
      include: {
        hijos: {
          where: { deletedAt: null, ...(tipo ? { tipo } : {}) },
          include: {
            hijos: {
              where: { deletedAt: null, ...(tipo ? { tipo } : {}) },
            },
          },
          orderBy: { nombre: 'asc' },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: string) {
    const categoria = await this.prisma.categoria.findFirst({
      where: { id, deletedAt: null },
      include: {
        hijos: {
          where: { deletedAt: null },
        },
        padre: true,
        productos: {
          where: { deletedAt: null },
          select: { id: true, nombre: true, sku: true },
          take: 20,
        },
      },
    });
    if (!categoria) {
      throw new NotFoundException(`Categoría ${id} no encontrada`);
    }
    return categoria;
  }

  async update(id: string, dto: UpdateCategoriaDto) {
    const current = await this.findOne(id);

    if (dto.tipo && dto.tipo !== (current.tipo as TipoProducto)) {
      if (current.hijos.length > 0) {
        throw new BadRequestException(
          'No se puede cambiar el tipo de una categoría con subcategorías',
        );
      }

      if (current.productos.length > 0) {
        throw new BadRequestException(
          'No se puede cambiar el tipo de una categoría con productos asociados',
        );
      }

      if (current.padreId) {
        const padreActual = await this.prisma.categoria.findFirst({
          where: { id: current.padreId, deletedAt: null },
          select: { tipo: true },
        });

        if (padreActual && (padreActual.tipo as TipoProducto) !== dto.tipo) {
          throw new BadRequestException(
            'Una subcategoría debe tener el mismo tipo que su categoría padre',
          );
        }
      }
    }

    if (dto.nombre) {
      const existing = await this.prisma.categoria.findFirst({
        where: {
          nombre: { equals: dto.nombre.trim(), mode: 'insensitive' },
          tipo: dto.tipo ?? current.tipo,
          padreId:
            dto.padreId === undefined ? (current.padreId ?? null) : dto.padreId,
          deletedAt: null,
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException(
          'Ya existe una categoría con este nombre para este tipo',
        );
      }
    }

    if (dto.padreId) {
      if (dto.padreId === id) {
        throw new BadRequestException(
          'Una categoría no puede ser su propio padre',
        );
      }
      const padre = await this.prisma.categoria.findFirst({
        where: { id: dto.padreId, deletedAt: null },
        select: { id: true, tipo: true },
      });
      if (!padre) {
        throw new NotFoundException(
          `Categoría padre ${dto.padreId} no encontrada`,
        );
      }
      if (dto.tipo && (padre.tipo as TipoProducto) !== dto.tipo) {
        throw new BadRequestException(
          'Una subcategoría debe tener el mismo tipo que su categoría padre',
        );
      }
    }

    const categoria = await this.prisma.categoria.update({
      where: { id },
      data: dto,
    });
    this.logger.log(`Categoría actualizada: ${id}`);
    return categoria;
  }

  async remove(id: string) {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id },
      include: {
        hijos: {
          where: { deletedAt: null },
        },
      },
    });

    if (!categoria) {
      throw new NotFoundException(`Categoría ${id} no encontrada`);
    }

    // Idempotent delete: if already soft-deleted, don't fail the request.
    if (categoria.deletedAt) {
      this.logger.warn(`Categoría ya estaba eliminada: ${id}`);
      return;
    }

    if (categoria.hijos && categoria.hijos.length > 0) {
      throw new BadRequestException(
        'No se puede eliminar una categoría con subcategorías',
      );
    }

    await this.prisma.categoria.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.logger.log(`Categoría eliminada (soft delete): ${id}`);
  }
}
