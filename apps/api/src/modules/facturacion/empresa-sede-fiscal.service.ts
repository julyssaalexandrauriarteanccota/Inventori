import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateEmpresaSedeFiscalDto,
  QueryEmpresaSedeFiscalDto,
  UpdateEmpresaSedeFiscalDto,
} from './dto';

@Injectable()
export class EmpresaSedeFiscalService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryEmpresaSedeFiscalDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (query.activo !== undefined) where.activo = query.activo;
    if (query.search) {
      where.OR = [
        { nombre: { contains: query.search, mode: 'insensitive' } },
        {
          codigoEstablecimientoSunat: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        { direccion: { contains: query.search, mode: 'insensitive' } },
        { ubigeo: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.empresaSedeFiscal.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { activo: 'desc' },
          { codigoEstablecimientoSunat: 'asc' },
          { nombre: 'asc' },
        ],
      }),
      this.prisma.empresaSedeFiscal.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, timestamp: new Date().toISOString() },
    };
  }

  async create(dto: CreateEmpresaSedeFiscalDto) {
    const config = await this.getConfigFiscalOrThrow();
    const data = this.normalizeDto(dto);

    const existing = await this.prisma.empresaSedeFiscal.findFirst({
      where: {
        configEmpresaFiscalId: config.id,
        codigoEstablecimientoSunat: data.codigoEstablecimientoSunat,
      },
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictException(
        `Ya existe una sede fiscal con código SUNAT ${data.codigoEstablecimientoSunat}`,
      );
    }

    if (existing?.deletedAt) {
      return this.prisma.empresaSedeFiscal.update({
        where: { id: existing.id },
        data: { ...data, deletedAt: null },
      });
    }

    return this.prisma.empresaSedeFiscal.create({
      data: { ...data, configEmpresaFiscalId: config.id },
    });
  }

  async update(id: string, dto: UpdateEmpresaSedeFiscalDto) {
    const current = await this.prisma.empresaSedeFiscal.findFirst({
      where: { id, deletedAt: null },
    });
    if (!current) {
      throw new NotFoundException(`Sede fiscal ${id} no encontrada`);
    }

    const data = this.normalizeDto(dto, current);
    const duplicate = await this.prisma.empresaSedeFiscal.findFirst({
      where: {
        configEmpresaFiscalId: current.configEmpresaFiscalId,
        codigoEstablecimientoSunat: data.codigoEstablecimientoSunat,
        deletedAt: null,
        NOT: { id },
      },
    });

    if (duplicate) {
      throw new ConflictException(
        `Ya existe una sede fiscal con código SUNAT ${data.codigoEstablecimientoSunat}`,
      );
    }

    return this.prisma.empresaSedeFiscal.update({ where: { id }, data });
  }

  async delete(id: string) {
    const current = await this.prisma.empresaSedeFiscal.findFirst({
      where: { id, deletedAt: null },
    });
    if (!current) {
      throw new NotFoundException(`Sede fiscal ${id} no encontrada`);
    }

    return this.prisma.empresaSedeFiscal.update({
      where: { id },
      data: { activo: false, deletedAt: new Date() },
    });
  }

  private async getConfigFiscalOrThrow() {
    const config = await this.prisma.configEmpresaFiscal.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (!config) {
      throw new BadRequestException(
        'Debe configurar los datos fiscales antes de crear sedes SUNAT',
      );
    }
    return config;
  }

  private normalizeDto(
    dto: CreateEmpresaSedeFiscalDto | UpdateEmpresaSedeFiscalDto,
    current?: {
      nombre: string;
      codigoEstablecimientoSunat: string;
      direccion: string;
      ubigeo: string;
      activo: boolean;
    },
  ) {
    return {
      nombre: this.required(dto.nombre ?? current?.nombre, 'nombre'),
      codigoEstablecimientoSunat: this.required(
        dto.codigoEstablecimientoSunat ?? current?.codigoEstablecimientoSunat,
        'código SUNAT de establecimiento',
      ),
      direccion: this.required(
        dto.direccion ?? current?.direccion,
        'dirección',
      ),
      ubigeo: this.required(dto.ubigeo ?? current?.ubigeo, 'ubigeo'),
      activo: dto.activo ?? current?.activo ?? true,
    };
  }

  private required(value: string | null | undefined, label: string) {
    const trimmed = value?.trim();
    if (!trimmed) {
      throw new BadRequestException(`Debe indicar ${label}`);
    }
    return trimmed;
  }
}
