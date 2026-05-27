import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateProveedorDto,
  UpdateProveedorDto,
  QueryProveedorDto,
} from './dto';

@Injectable()
export class ProveedoresService {
  private readonly logger = new Logger(ProveedoresService.name);

  constructor(private readonly prisma: PrismaService) {}

  private validateCoordinates(dto: { latitud?: number; longitud?: number }) {
    const hasLatitud = dto.latitud !== undefined;
    const hasLongitud = dto.longitud !== undefined;

    if (hasLatitud !== hasLongitud) {
      throw new BadRequestException('Latitud y longitud deben enviarse juntas');
    }
  }

  async create(dto: CreateProveedorDto) {
    this.validateCoordinates(dto);

    const existing = await this.prisma.proveedor.findFirst({
      where: { ruc: dto.ruc, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException('Ya existe un proveedor con este RUC');
    }

    const proveedor = await this.prisma.proveedor.create({ data: dto });
    this.logger.log(`Proveedor creado: ${proveedor.id}`);
    return proveedor;
  }

  async findAll(query: QueryProveedorDto) {
    const { page = 1, limit = 20, search, activo } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };

    if (activo !== undefined) where.activo = activo;

    if (search) {
      where.OR = [
        { razonSocial: { contains: search, mode: 'insensitive' } },
        { ruc: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { contactoNombre: { contains: search, mode: 'insensitive' } },
        { direccion: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [proveedores, total] = await Promise.all([
      this.prisma.proveedor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.proveedor.count({ where }),
    ]);

    return {
      data: proveedores,
      meta: { total, page, limit, timestamp: new Date().toISOString() },
    };
  }

  async findOne(id: string) {
    const proveedor = await this.prisma.proveedor.findFirst({
      where: { id, deletedAt: null },
    });
    if (!proveedor) {
      throw new NotFoundException(`Proveedor ${id} no encontrado`);
    }
    return proveedor;
  }

  async update(id: string, dto: UpdateProveedorDto) {
    this.validateCoordinates(dto);
    await this.findOne(id);

    if (dto.ruc) {
      const existing = await this.prisma.proveedor.findFirst({
        where: { ruc: dto.ruc, deletedAt: null, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('Ya existe un proveedor con este RUC');
      }
    }

    const proveedor = await this.prisma.proveedor.update({
      where: { id },
      data: dto,
    });
    this.logger.log(`Proveedor actualizado: ${id}`);
    return proveedor;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.proveedor.update({
      where: { id },
      data: { deletedAt: new Date(), activo: false },
    });
    this.logger.log(`Proveedor eliminado (soft delete): ${id}`);
  }

  async findProductos(proveedorId: string) {
    await this.findOne(proveedorId);
    return this.prisma.productoProveedor.findMany({
      where: { proveedorId },
      include: {
        producto: {
          select: {
            id: true,
            sku: true,
            nombre: true,
            precioCompra: true,
            precioVenta: true,
          },
        },
      },
    });
  }
}
