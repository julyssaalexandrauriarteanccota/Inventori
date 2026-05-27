import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { TipoProducto } from '@erp/shared';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateClienteEquipoDto,
  QueryClienteEquipoDto,
  UpdateClienteEquipoDto,
} from './dto';

const CLIENTE_EQUIPO_INCLUDE = {
  cliente: {
    select: {
      id: true,
      nombre: true,
      apellido: true,
      razonSocial: true,
    },
  },
  producto: {
    select: {
      id: true,
      sku: true,
      nombre: true,
      modelo: true,
      marca: { select: { nombre: true } },
    },
  },
} as const;

@Injectable()
export class ClienteEquiposService {
  constructor(private readonly prisma: PrismaService) {}

  private buildInternalSerie() {
    return `EXT-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  private async validateCliente(clienteId: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id: clienteId, deletedAt: null },
      select: { id: true },
    });
    if (!cliente) {
      throw new NotFoundException(`Cliente ${clienteId} no encontrado`);
    }
  }

  private async validateProducto(productoId?: string | null) {
    if (!productoId) return;

    const producto = await this.prisma.producto.findFirst({
      where: { id: productoId, deletedAt: null },
      select: { id: true, tipo: true, tieneNumeroSerie: true },
    });
    if (!producto) {
      throw new NotFoundException(`Producto ${productoId} no encontrado`);
    }
    if (
      !producto.tieneNumeroSerie &&
      (producto.tipo as TipoProducto) !== TipoProducto.EQUIPO
    ) {
      throw new BadRequestException(
        'Solo productos tipo equipo o con número de serie pueden asociarse a equipos de cliente',
      );
    }
  }

  async create(dto: CreateClienteEquipoDto) {
    await this.validateCliente(dto.clienteId);
    await this.validateProducto(dto.productoId);

    const numeroSerie = dto.numeroSerie?.trim() || this.buildInternalSerie();
    const nombre = dto.nombre.trim();
    const existing = await this.prisma.equipoClienteActivo.findFirst({
      where: {
        clienteId: dto.clienteId,
        numeroSerie,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        `Este cliente ya tiene un equipo con serie ${numeroSerie}`,
      );
    }

    return this.prisma.equipoClienteActivo.create({
      data: {
        ...dto,
        numeroSerie,
        nombre,
        marca: dto.marca?.trim() || null,
        modelo: dto.modelo?.trim() || null,
        codigoQr: dto.codigoQr?.trim() || null,
      },
      include: CLIENTE_EQUIPO_INCLUDE,
    });
  }

  async findAll(query: QueryClienteEquipoDto) {
    const {
      page = 1,
      limit = 20,
      search,
      clienteId,
      productoId,
      estado,
    } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (clienteId) where.clienteId = clienteId;
    if (productoId) where.productoId = productoId;
    if (estado) where.estado = estado;
    if (search) {
      where.OR = [
        { numeroSerie: { contains: search, mode: 'insensitive' } },
        { nombre: { contains: search, mode: 'insensitive' } },
        { marca: { contains: search, mode: 'insensitive' } },
        { modelo: { contains: search, mode: 'insensitive' } },
        { cliente: { nombre: { contains: search, mode: 'insensitive' } } },
        { cliente: { razonSocial: { contains: search, mode: 'insensitive' } } },
        { producto: { nombre: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.equipoClienteActivo.findMany({
        where,
        skip,
        take: limit,
        include: CLIENTE_EQUIPO_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.equipoClienteActivo.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, timestamp: new Date().toISOString() },
    };
  }

  async findOne(id: string) {
    const equipo = await this.prisma.equipoClienteActivo.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...CLIENTE_EQUIPO_INCLUDE,
        tickets: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            codigo: true,
            titulo: true,
            estado: true,
            tipoServicio: true,
            createdAt: true,
          },
        },
      },
    });
    if (!equipo) {
      throw new NotFoundException(`Equipo de cliente ${id} no encontrado`);
    }
    return equipo;
  }

  async update(id: string, dto: UpdateClienteEquipoDto) {
    const current = await this.prisma.equipoClienteActivo.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, clienteId: true },
    });
    if (!current) {
      throw new NotFoundException(`Equipo de cliente ${id} no encontrado`);
    }

    const clienteId = dto.clienteId ?? current.clienteId;
    if (dto.clienteId) await this.validateCliente(dto.clienteId);
    await this.validateProducto(dto.productoId);

    if (dto.numeroSerie?.trim()) {
      const numeroSerie = dto.numeroSerie.trim();
      const existing = await this.prisma.equipoClienteActivo.findFirst({
        where: {
          clienteId,
          numeroSerie,
          deletedAt: null,
          NOT: { id },
        },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException(
          `Este cliente ya tiene un equipo con serie ${numeroSerie}`,
        );
      }
    }

    return this.prisma.equipoClienteActivo.update({
      where: { id },
      data: {
        ...dto,
        numeroSerie: dto.numeroSerie?.trim() || undefined,
        nombre: dto.nombre?.trim(),
        marca: dto.marca !== undefined ? dto.marca?.trim() || null : undefined,
        modelo:
          dto.modelo !== undefined ? dto.modelo?.trim() || null : undefined,
        codigoQr:
          dto.codigoQr !== undefined ? dto.codigoQr?.trim() || null : undefined,
      },
      include: CLIENTE_EQUIPO_INCLUDE,
    });
  }

  async remove(id: string) {
    const equipo = await this.prisma.equipoClienteActivo.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!equipo) {
      throw new NotFoundException(`Equipo de cliente ${id} no encontrado`);
    }

    return this.prisma.equipoClienteActivo.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
