import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateClienteValidacionSunatDto,
  QueryClienteValidacionSunatDto,
  UpdateClienteValidacionSunatDto,
} from './dto';

const CLIENTE_DOCUMENTO_SUNAT_CODES = ['6', '1', '0'] as const;

@Injectable()
export class ClienteValidacionSunatService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryClienteValidacionSunatDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.clienteId) where.clienteId = query.clienteId;
    if (query.estado) where.estado = query.estado;
    if (query.search) {
      where.OR = [
        { numeroDocumento: { contains: query.search, mode: 'insensitive' } },
        { nombreNormalizado: { contains: query.search, mode: 'insensitive' } },
        { direccionFiscal: { contains: query.search, mode: 'insensitive' } },
        { ubigeo: { contains: query.search, mode: 'insensitive' } },
        { departamento: { contains: query.search, mode: 'insensitive' } },
        { provincia: { contains: query.search, mode: 'insensitive' } },
        { distrito: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.clienteValidacionSunat.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          cliente: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              razonSocial: true,
              dni: true,
              ruc: true,
            },
          },
        },
      }),
      this.prisma.clienteValidacionSunat.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, timestamp: new Date().toISOString() },
    };
  }

  async findOne(id: string) {
    const validation = await this.prisma.clienteValidacionSunat.findUnique({
      where: { id },
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            razonSocial: true,
            dni: true,
            ruc: true,
          },
        },
      },
    });

    if (!validation) {
      throw new NotFoundException(`Validación SUNAT ${id} no encontrada`);
    }

    return validation;
  }

  async upsert(dto: CreateClienteValidacionSunatDto) {
    const data = this.normalizeDto(dto);
    const cliente = await this.ensureCliente(data.clienteId);
    this.validateDocumentoSunat(data.tipoDocumentoSunat, data.numeroDocumento);
    this.applyDocumentoRules(data);
    this.validateDocumentoMatchesCliente(data, cliente);
    const current = await this.prisma.clienteValidacionSunat.findFirst({
      where: {
        tipoDocumentoSunat: data.tipoDocumentoSunat,
        numeroDocumento: data.numeroDocumento,
      },
    });

    if (current) {
      return this.prisma.clienteValidacionSunat.update({
        where: { id: current.id },
        data: {
          ...data,
          ultimaValidacionAt: new Date(),
        },
      });
    }

    return this.prisma.clienteValidacionSunat.create({
      data: {
        ...data,
        ultimaValidacionAt: new Date(),
      },
    });
  }

  async update(id: string, dto: UpdateClienteValidacionSunatDto) {
    const current = await this.prisma.clienteValidacionSunat.findUnique({
      where: { id },
    });
    if (!current) {
      throw new NotFoundException(`Validación SUNAT ${id} no encontrada`);
    }

    const data = this.normalizeDto(dto, current);
    const cliente = await this.ensureCliente(data.clienteId);
    this.validateDocumentoSunat(data.tipoDocumentoSunat, data.numeroDocumento);
    this.applyDocumentoRules(data);
    this.validateDocumentoMatchesCliente(data, cliente);
    const duplicate = await this.prisma.clienteValidacionSunat.findFirst({
      where: {
        tipoDocumentoSunat: data.tipoDocumentoSunat,
        numeroDocumento: data.numeroDocumento,
        NOT: { id },
      },
    });

    if (duplicate) {
      throw new BadRequestException(
        'Ya existe una validación para ese tipo y número de documento',
      );
    }

    return this.prisma.clienteValidacionSunat.update({
      where: { id },
      data: {
        ...data,
        ultimaValidacionAt: new Date(),
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.clienteValidacionSunat.delete({ where: { id } });
  }

  private async ensureCliente(clienteId?: string | null) {
    if (!clienteId) return null;
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
      select: {
        id: true,
        tipo: true,
        dni: true,
        ruc: true,
        esGenerico: true,
      },
    });
    if (!cliente) {
      throw new NotFoundException(`Cliente ${clienteId} no encontrado`);
    }

    return cliente;
  }

  private normalizeDto(
    dto: CreateClienteValidacionSunatDto | UpdateClienteValidacionSunatDto,
    current?: {
      clienteId: string | null;
      tipoDocumentoSunat: string;
      numeroDocumento: string;
      nombreNormalizado: string | null;
      direccionFiscal: string | null;
      proveedor: string | null;
      ubigeo: string | null;
      departamento: string | null;
      provincia: string | null;
      distrito: string | null;
      estado: string;
      condicionDomicilio: string | null;
    },
  ) {
    return {
      clienteId: dto.clienteId ?? current?.clienteId ?? null,
      tipoDocumentoSunat: this.required(
        dto.tipoDocumentoSunat ?? current?.tipoDocumentoSunat,
        'tipo de documento SUNAT',
      ),
      numeroDocumento: this.required(
        dto.numeroDocumento ?? current?.numeroDocumento,
        'número de documento',
      ),
      nombreNormalizado:
        dto.nombreNormalizado !== undefined
          ? this.optional(dto.nombreNormalizado)
          : current?.nombreNormalizado,
      proveedor:
        dto.proveedor !== undefined
          ? this.optional(dto.proveedor)
          : (current?.proveedor ?? 'MANUAL'),
      direccionFiscal:
        dto.direccionFiscal !== undefined
          ? this.optional(dto.direccionFiscal)
          : current?.direccionFiscal,
      ubigeo:
        dto.ubigeo !== undefined ? this.optional(dto.ubigeo) : current?.ubigeo,
      departamento:
        dto.departamento !== undefined
          ? this.optional(dto.departamento)
          : current?.departamento,
      provincia:
        dto.provincia !== undefined
          ? this.optional(dto.provincia)
          : current?.provincia,
      distrito:
        dto.distrito !== undefined
          ? this.optional(dto.distrito)
          : current?.distrito,
      estado: this.required(dto.estado ?? current?.estado, 'estado'),
      condicionDomicilio:
        dto.condicionDomicilio !== undefined
          ? this.optional(dto.condicionDomicilio)
          : current?.condicionDomicilio,
    };
  }

  private applyDocumentoRules(data: {
    tipoDocumentoSunat: string;
    condicionDomicilio?: string | null;
  }) {
    if (data.tipoDocumentoSunat !== '6') {
      data.condicionDomicilio = null;
    }
  }

  private validateDocumentoSunat(tipo: string, numeroDocumento: string) {
    if (!CLIENTE_DOCUMENTO_SUNAT_CODES.includes(tipo as '6' | '1' | '0')) {
      throw new BadRequestException(
        'Solo se soporta RUC (6), DNI (1) o sin documento (0) para validación de clientes',
      );
    }

    if (tipo === '6' && !/^(10|20)\d{9}$/.test(numeroDocumento)) {
      throw new BadRequestException(
        'RUC debe empezar con 10 o 20 y tener 11 dígitos',
      );
    }

    if (
      tipo === '1' &&
      (!/^\d{8}$/.test(numeroDocumento) || numeroDocumento === '00000000')
    ) {
      throw new BadRequestException(
        'DNI debe tener exactamente 8 dígitos y no puede ser 00000000',
      );
    }

    if (tipo === '0' && numeroDocumento !== '00000000') {
      throw new BadRequestException(
        'Para sin documento se debe usar el número 00000000',
      );
    }
  }

  private validateDocumentoMatchesCliente(
    data: {
      tipoDocumentoSunat: string;
      numeroDocumento: string;
    },
    cliente: {
      tipo: string;
      dni: string | null;
      ruc: string | null;
      esGenerico: boolean;
    } | null,
  ) {
    if (!cliente) return;

    if (cliente.esGenerico || cliente.dni === '00000000') {
      if (
        data.tipoDocumentoSunat !== '0' ||
        data.numeroDocumento !== '00000000'
      ) {
        throw new BadRequestException(
          'El cliente Público en General solo puede validarse como sin documento',
        );
      }
      return;
    }

    if (cliente.ruc) {
      if (
        data.tipoDocumentoSunat !== '6' ||
        data.numeroDocumento !== cliente.ruc
      ) {
        throw new BadRequestException(
          'La validación vinculada debe usar el RUC real del cliente seleccionado',
        );
      }
      return;
    }

    if (cliente.dni) {
      if (
        data.tipoDocumentoSunat !== '1' ||
        data.numeroDocumento !== cliente.dni
      ) {
        throw new BadRequestException(
          'La validación vinculada debe usar el DNI real del cliente seleccionado',
        );
      }
      return;
    }

    throw new BadRequestException(
      'El cliente seleccionado no tiene documento soportado para validación',
    );
  }

  private required(value: string | null | undefined, label: string) {
    const cleaned = this.optional(value);
    if (!cleaned) {
      throw new BadRequestException(`Debe indicar ${label}`);
    }
    return cleaned;
  }

  private optional(value?: string | null) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
