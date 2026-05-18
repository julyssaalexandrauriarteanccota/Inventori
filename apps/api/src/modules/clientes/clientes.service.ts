import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TipoCliente } from '@erp/shared';
import {
  CreateClienteDto,
  UpdateClienteDto,
  QueryClienteDto,
  CreateContactoClienteDto,
} from './dto';

const GENERIC_CLIENT_DNI = '00000000';
const GENERIC_CLIENT_NAME = 'Público en General';

@Injectable()
export class ClientesService {
  private readonly logger = new Logger(ClientesService.name);

  constructor(private readonly prisma: PrismaService) {}

  private normalizeOptionalText(value?: string | null) {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private hasText(value?: string | null) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private normalizeClientePayload<
    T extends {
      nombre?: string | null;
      apellido?: string | null;
      dni?: string | null;
      razonSocial?: string | null;
      ruc?: string | null;
      email?: string | null;
      telefono?: string | null;
      celular?: string | null;
      direccion?: string | null;
      distrito?: string | null;
      provincia?: string | null;
      departamento?: string | null;
      referencia?: string | null;
      notas?: string | null;
      latitud?: number | null;
      longitud?: number | null;
    },
  >(dto: T) {
    const hasLatitud = dto.latitud !== undefined;
    const hasLongitud = dto.longitud !== undefined;

    if (hasLatitud !== hasLongitud) {
      throw new BadRequestException('Latitud y longitud deben enviarse juntas');
    }

    const latitud =
      dto.latitud === undefined ? undefined : (dto.latitud ?? null);
    const longitud =
      dto.longitud === undefined ? undefined : (dto.longitud ?? null);

    if ((latitud === null) !== (longitud === null)) {
      throw new BadRequestException('Latitud y longitud deben enviarse juntas');
    }

    return {
      ...dto,
      nombre: this.normalizeOptionalText(dto.nombre),
      apellido: this.normalizeOptionalText(dto.apellido),
      dni: this.normalizeOptionalText(dto.dni),
      razonSocial: this.normalizeOptionalText(dto.razonSocial),
      ruc: this.normalizeOptionalText(dto.ruc),
      email: this.normalizeOptionalText(dto.email),
      telefono: this.normalizeOptionalText(dto.telefono),
      celular: this.normalizeOptionalText(dto.celular),
      direccion: this.normalizeOptionalText(dto.direccion),
      distrito: this.normalizeOptionalText(dto.distrito),
      provincia: this.normalizeOptionalText(dto.provincia),
      departamento: this.normalizeOptionalText(dto.departamento),
      referencia: this.normalizeOptionalText(dto.referencia),
      notas: this.normalizeOptionalText(dto.notas),
      latitud,
      longitud,
    };
  }

  private isGenericCliente(input: {
    esGenerico?: boolean | null;
    dni?: string | null;
  }) {
    return input.esGenerico === true || input.dni === GENERIC_CLIENT_DNI;
  }

  private async upsertGenericCliente() {
    const existing = await this.prisma.cliente.findFirst({
      where: {
        OR: [{ esGenerico: true }, { dni: GENERIC_CLIENT_DNI }],
      },
    });

    const data = {
      tipo: TipoCliente.NATURAL,
      nombre: GENERIC_CLIENT_NAME,
      apellido: null,
      dni: GENERIC_CLIENT_DNI,
      razonSocial: null,
      ruc: null,
      email: null,
      telefono: null,
      celular: null,
      direccion: null,
      distrito: null,
      provincia: null,
      departamento: null,
      referencia: null,
      latitud: null,
      longitud: null,
      notas:
        'Cliente genérico del sistema para ventas/boletas sin identificación.',
      esGenerico: true,
      activo: true,
      deletedAt: null,
    };

    if (existing) {
      return this.prisma.cliente.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.prisma.cliente.create({ data });
  }

  private validateClienteData(input: {
    tipo: string;
    nombre?: string | null;
    apellido?: string | null;
    dni?: string | null;
    razonSocial?: string | null;
    ruc?: string | null;
  }) {
    if (input.tipo === 'NATURAL') {
      if (
        !this.hasText(input.nombre) ||
        !this.hasText(input.apellido) ||
        !this.hasText(input.dni)
      ) {
        throw new BadRequestException(
          'Cliente NATURAL requiere nombre, apellido y DNI',
        );
      }

      if (!/^\d{8}$/.test(input.dni!)) {
        throw new BadRequestException(
          'DNI debe tener exactamente 8 dígitos numéricos',
        );
      }
    }

    if (input.tipo === 'EMPRESA') {
      if (!this.hasText(input.razonSocial) || !this.hasText(input.ruc)) {
        throw new BadRequestException(
          'Cliente EMPRESA requiere razón social y RUC',
        );
      }

      if (!/^(10|20)\d{9}$/.test(input.ruc!)) {
        throw new BadRequestException(
          'RUC debe empezar con 10 o 20 y tener 11 dígitos',
        );
      }
    }
  }

  async create(dto: CreateClienteDto) {
    const normalizedDto = this.normalizeClientePayload(dto);

    if (normalizedDto.esGenerico) {
      const cliente = await this.upsertGenericCliente();
      this.logger.log(`Cliente genérico del sistema asegurado: ${cliente.id}`);
      return cliente;
    }

    if (normalizedDto.dni === GENERIC_CLIENT_DNI) {
      throw new BadRequestException(
        'El DNI 00000000 está reservado para el cliente genérico del sistema',
      );
    }

    this.validateClienteData(normalizedDto);

    // Validar DNI único si viene
    if (normalizedDto.dni) {
      const existingDni = await this.prisma.cliente.findFirst({
        where: { dni: normalizedDto.dni, deletedAt: null },
      });
      if (existingDni) {
        throw new ConflictException('Ya existe un cliente con este DNI');
      }
    }

    // Validar RUC único si viene
    if (normalizedDto.ruc) {
      const existingRuc = await this.prisma.cliente.findFirst({
        where: { ruc: normalizedDto.ruc, deletedAt: null },
      });
      if (existingRuc) {
        throw new ConflictException('Ya existe un cliente con este RUC');
      }
    }

    // Validar que RUC empiece con 10 o 20
    if (normalizedDto.ruc && !/^(10|20)\d{9}$/.test(normalizedDto.ruc)) {
      throw new BadRequestException(
        'RUC debe empezar con 10 o 20 y tener 11 dígitos',
      );
    }

    // Validar que DNI solo tenga dígitos
    if (normalizedDto.dni && !/^\d{8}$/.test(normalizedDto.dni)) {
      throw new BadRequestException(
        'DNI debe tener exactamente 8 dígitos numéricos',
      );
    }

    const cliente = await this.prisma.cliente.create({ data: normalizedDto });

    this.logger.log(`Cliente creado: ${cliente.id}`);
    return cliente;
  }

  async findAll(query: QueryClienteDto) {
    const { page = 1, limit = 20, search, tipo, activo, esGenerico } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };

    if (tipo) {
      where.tipo = tipo;
    }

    if (activo !== undefined) {
      where.activo = activo;
    }

    if (esGenerico !== undefined) {
      where.esGenerico = esGenerico;
    }

    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { apellido: { contains: search, mode: 'insensitive' } },
        { razonSocial: { contains: search, mode: 'insensitive' } },
        { dni: { contains: search, mode: 'insensitive' } },
        { ruc: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { direccion: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [clientes, total] = await Promise.all([
      this.prisma.cliente.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          validacionesSunat: {
            orderBy: [{ ultimaValidacionAt: 'desc' }, { updatedAt: 'desc' }],
            take: 1,
            select: {
              id: true,
              tipoDocumentoSunat: true,
              numeroDocumento: true,
              estado: true,
              condicionDomicilio: true,
              ultimaValidacionAt: true,
            },
          },
        },
      }),
      this.prisma.cliente.count({ where }),
    ]);

    return {
      data: clientes,
      meta: { total, page, limit, timestamp: new Date().toISOString() },
    };
  }

  async findOne(id: string) {
    const cliente = await this.prisma.cliente.findFirst({
      where: { id, deletedAt: null },
      include: {
        contactos: { orderBy: { fecha: 'desc' }, take: 10 },
        validacionesSunat: {
          orderBy: [{ ultimaValidacionAt: 'desc' }, { updatedAt: 'desc' }],
          take: 1,
          select: {
            id: true,
            tipoDocumentoSunat: true,
            numeroDocumento: true,
            estado: true,
            condicionDomicilio: true,
            ultimaValidacionAt: true,
          },
        },
      },
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente ${id} no encontrado`);
    }

    return cliente;
  }

  async update(id: string, dto: UpdateClienteDto) {
    const currentCliente = await this.findOne(id);
    if (this.isGenericCliente(currentCliente)) {
      throw new BadRequestException(
        'El cliente genérico del sistema no se puede editar',
      );
    }

    const normalizedDto = this.normalizeClientePayload(dto);
    if (normalizedDto.esGenerico || normalizedDto.dni === GENERIC_CLIENT_DNI) {
      throw new BadRequestException(
        'El cliente genérico del sistema no se puede asignar manualmente',
      );
    }

    const effectiveCliente = {
      tipo: normalizedDto.tipo ?? currentCliente.tipo,
      nombre: normalizedDto.nombre ?? currentCliente.nombre,
      apellido: normalizedDto.apellido ?? currentCliente.apellido,
      dni: normalizedDto.dni ?? currentCliente.dni,
      razonSocial: normalizedDto.razonSocial ?? currentCliente.razonSocial,
      ruc: normalizedDto.ruc ?? currentCliente.ruc,
    };

    this.validateClienteData(effectiveCliente);

    if (effectiveCliente.dni) {
      const existing = await this.prisma.cliente.findFirst({
        where: { dni: effectiveCliente.dni, deletedAt: null, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('Ya existe un cliente con este DNI');
      }
    }

    if (effectiveCliente.ruc) {
      const existing = await this.prisma.cliente.findFirst({
        where: { ruc: effectiveCliente.ruc, deletedAt: null, id: { not: id } },
      });
      if (existing) {
        throw new ConflictException('Ya existe un cliente con este RUC');
      }
    }

    const cliente = await this.prisma.cliente.update({
      where: { id },
      data: normalizedDto,
    });

    this.logger.log(`Cliente actualizado: ${id}`);
    return cliente;
  }

  async remove(id: string) {
    const cliente = await this.findOne(id);
    if (this.isGenericCliente(cliente)) {
      throw new BadRequestException(
        'El cliente genérico del sistema no se puede eliminar porque se usa en POS, boletas y ventas sin identificación',
      );
    }

    await this.prisma.cliente.update({
      where: { id },
      data: { deletedAt: new Date(), activo: false },
    });

    this.logger.log(`Cliente eliminado (soft delete): ${id}`);
  }

  // Sub-recursos
  async findEquipos(clienteId: string) {
    await this.findOne(clienteId);

    return this.prisma.equipoCliente.findMany({
      where: { clienteId },
      include: { equipo: true },
      orderBy: { fechaInicio: 'desc' },
    });
  }

  async findTickets(clienteId: string) {
    await this.findOne(clienteId);

    return this.prisma.ticket.findMany({
      where: { clienteId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Interacciones CRM
  async createContacto(
    clienteId: string,
    dto: CreateContactoClienteDto,
    userId?: string,
  ) {
    await this.findOne(clienteId);

    return this.prisma.contactoCliente.create({
      data: {
        clienteId,
        tipo: dto.tipo,
        descripcion: dto.descripcion,
        usuarioId: userId ?? dto.usuarioId ?? null,
      },
    });
  }

  async findContactos(clienteId: string) {
    await this.findOne(clienteId);

    return this.prisma.contactoCliente.findMany({
      where: { clienteId },
      include: {
        usuario: { select: { id: true, nombre: true, apellido: true } },
      },
      orderBy: { fecha: 'desc' },
    });
  }
}
