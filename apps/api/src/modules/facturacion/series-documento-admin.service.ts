import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AmbienteSunat, TipoDocumento } from '@erp/shared';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateSerieDocumentoDto,
  QuerySerieDocumentoDto,
  UpdateSerieDocumentoDto,
} from './dto';

const DEFAULT_CODIGO_ESTABLECIMIENTO = '0000';

@Injectable()
export class SeriesDocumentoAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QuerySerieDocumentoDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (query.tipo) where.tipo = query.tipo;
    if (query.activo !== undefined) where.activo = query.activo;
    if (query.ambiente) where.ambiente = query.ambiente;
    if (query.sedeFiscalId) where.sedeFiscalId = query.sedeFiscalId;
    if (query.search) {
      where.OR = [
        { serie: { contains: query.search, mode: 'insensitive' } },
        {
          codigoEstablecimiento: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        { descripcion: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.serieDocumento.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { ambiente: 'asc' },
          { tipo: 'asc' },
          { codigoEstablecimiento: 'asc' },
          { serie: 'asc' },
        ],
      }),
      this.prisma.serieDocumento.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, timestamp: new Date().toISOString() },
    };
  }

  async create(dto: CreateSerieDocumentoDto) {
    const data = this.normalizeDto(dto);
    const existing = await this.findByUniqueParts(
      data.tipo,
      data.serie,
      data.codigoEstablecimiento,
      data.ambiente,
    );

    if (existing && !existing.deletedAt) {
      throw new ConflictException(
        `Ya existe la serie ${data.serie} para ${data.tipo} en el establecimiento ${data.codigoEstablecimiento} y ambiente ${data.ambiente}`,
      );
    }

    if (existing?.deletedAt) {
      return this.prisma.serieDocumento.update({
        where: { id: existing.id },
        data: { ...data, deletedAt: null },
      });
    }

    return this.prisma.serieDocumento.create({ data });
  }

  async update(id: string, dto: UpdateSerieDocumentoDto) {
    const current = await this.prisma.serieDocumento.findFirst({
      where: { id, deletedAt: null },
    });
    if (!current) {
      throw new NotFoundException(`Serie de documento ${id} no encontrada`);
    }

    const data = this.normalizeDto(dto, current);
    const duplicate = await this.prisma.serieDocumento.findFirst({
      where: {
        tipo: data.tipo,
        serie: data.serie,
        codigoEstablecimiento: data.codigoEstablecimiento,
        ambiente: data.ambiente,
        deletedAt: null,
        NOT: { id },
      },
    });

    if (duplicate) {
      throw new ConflictException(
        `Ya existe la serie ${data.serie} para ${data.tipo} en el establecimiento ${data.codigoEstablecimiento} y ambiente ${data.ambiente}`,
      );
    }

    return this.prisma.serieDocumento.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    const current = await this.prisma.serieDocumento.findFirst({
      where: { id, deletedAt: null },
    });
    if (!current) {
      throw new NotFoundException(`Serie de documento ${id} no encontrada`);
    }

    return this.prisma.serieDocumento.update({
      where: { id },
      data: { activo: false, deletedAt: new Date() },
    });
  }

  async syncFromLegacyConfig() {
    const config = await this.prisma.configEmpresa.findFirst();
    if (!config) {
      throw new BadRequestException('Configuración de empresa no encontrada');
    }

    const legacySeries = [
      {
        tipo: TipoDocumento.FACTURA,
        serie: config.serieFactura,
        correlativoActual: config.correlativoFactura,
      },
      {
        tipo: TipoDocumento.BOLETA,
        serie: config.serieBoleta,
        correlativoActual: config.correlativoBoleta,
      },
      {
        tipo: TipoDocumento.NOTA_CREDITO,
        serie: config.serieNotaCredito,
        correlativoActual: config.correlativoNotaCredito,
      },
      {
        tipo: TipoDocumento.NOTA_DEBITO,
        serie: config.serieNotaDebito,
        correlativoActual: config.correlativoNotaDebito,
      },
    ];

    const result = { created: 0, restored: 0, skipped: 0 };

    for (const item of legacySeries) {
      const serie = this.normalizeSerie(item.serie);
      const existing = await this.findByUniqueParts(
        item.tipo,
        serie,
        DEFAULT_CODIGO_ESTABLECIMIENTO,
        AmbienteSunat.BETA,
      );

      if (!existing) {
        await this.prisma.serieDocumento.create({
          data: {
            tipo: item.tipo,
            serie,
            correlativoActual: item.correlativoActual,
            codigoEstablecimiento: DEFAULT_CODIGO_ESTABLECIMIENTO,
            ambiente: AmbienteSunat.BETA,
            activo: true,
            descripcion: 'Migrada desde ConfigEmpresa',
          },
        });
        result.created += 1;
        continue;
      }

      if (existing.deletedAt) {
        await this.prisma.serieDocumento.update({
          where: { id: existing.id },
          data: {
            correlativoActual: item.correlativoActual,
            activo: true,
            deletedAt: null,
          },
        });
        result.restored += 1;
        continue;
      }

      result.skipped += 1;
    }

    return result;
  }

  private async findByUniqueParts(
    tipo: TipoDocumento,
    serie: string,
    codigoEstablecimiento: string,
    ambiente: AmbienteSunat,
  ) {
    return this.prisma.serieDocumento.findFirst({
      where: { tipo, serie, codigoEstablecimiento, ambiente },
    });
  }

  private normalizeDto(
    dto: CreateSerieDocumentoDto | UpdateSerieDocumentoDto,
    current?: {
      tipo: string;
      serie: string;
      correlativoActual: number;
      configEmpresaFiscalId: string | null;
      sedeFiscalId: string | null;
      codigoEstablecimiento: string;
      ambiente: string;
      descripcion: string | null;
      activo: boolean;
    },
  ) {
    const tipo = this.requiredTipo(dto.tipo ?? current?.tipo);
    const serie = this.normalizeSerie(dto.serie ?? current?.serie);
    this.assertSerieMatchesTipo(tipo, serie);

    return {
      tipo,
      serie,
      correlativoActual:
        dto.correlativoActual ?? current?.correlativoActual ?? 0,
      configEmpresaFiscalId:
        dto.configEmpresaFiscalId !== undefined
          ? this.optional(dto.configEmpresaFiscalId)
          : current?.configEmpresaFiscalId,
      sedeFiscalId:
        dto.sedeFiscalId !== undefined
          ? this.optional(dto.sedeFiscalId)
          : current?.sedeFiscalId,
      codigoEstablecimiento:
        this.normalizeCodigoEstablecimiento(dto.codigoEstablecimiento) ??
        current?.codigoEstablecimiento ??
        DEFAULT_CODIGO_ESTABLECIMIENTO,
      ambiente: this.requiredAmbiente(dto.ambiente ?? current?.ambiente),
      descripcion:
        dto.descripcion !== undefined
          ? this.optional(dto.descripcion)
          : current?.descripcion,
      activo: dto.activo ?? current?.activo ?? true,
    };
  }

  private requiredTipo(value?: TipoDocumento | string) {
    if (!value) {
      throw new BadRequestException('Debe indicar el tipo de documento');
    }
    if (!Object.values(TipoDocumento).includes(value as TipoDocumento)) {
      throw new BadRequestException(`Tipo de documento no soportado: ${value}`);
    }
    return value as TipoDocumento;
  }

  private normalizeSerie(value?: string) {
    const serie = value?.trim().toUpperCase();
    if (!serie) {
      throw new BadRequestException('Debe indicar la serie');
    }
    if (!/^[A-Z0-9]{4}$/.test(serie)) {
      throw new BadRequestException(
        'La serie debe tener 4 caracteres alfanuméricos',
      );
    }
    return serie;
  }

  private assertSerieMatchesTipo(tipo: TipoDocumento, serie: string) {
    const valid =
      (tipo === TipoDocumento.FACTURA && /^F\d{3}$/.test(serie)) ||
      (tipo === TipoDocumento.BOLETA && /^B\d{3}$/.test(serie)) ||
      (tipo === TipoDocumento.NOTA_CREDITO && /^(FC|BC)\d{2}$/.test(serie)) ||
      (tipo === TipoDocumento.NOTA_DEBITO && /^(FD|BD)\d{2}$/.test(serie));

    if (!valid) {
      throw new BadRequestException(
        `La serie ${serie} no corresponde al tipo ${tipo}. ${this.getSerieHelp(tipo)}`,
      );
    }
  }

  private getSerieHelp(tipo: TipoDocumento) {
    switch (tipo) {
      case TipoDocumento.FACTURA:
        return 'Facturas usan F + 3 dígitos, por ejemplo F001.';
      case TipoDocumento.BOLETA:
        return 'Boletas usan B + 3 dígitos, por ejemplo B001.';
      case TipoDocumento.NOTA_CREDITO:
        return 'Notas de crédito usan FC/BC + 2 dígitos, por ejemplo FC01 o BC01.';
      case TipoDocumento.NOTA_DEBITO:
        return 'Notas de débito usan FD/BD + 2 dígitos, por ejemplo FD01 o BD01.';
      default:
        return 'Revise el prefijo SUNAT del tipo documental.';
    }
  }

  private requiredAmbiente(value?: AmbienteSunat | string) {
    if (!value) return AmbienteSunat.BETA;
    if (!Object.values(AmbienteSunat).includes(value as AmbienteSunat)) {
      throw new BadRequestException(`Ambiente SUNAT no soportado: ${value}`);
    }
    return value as AmbienteSunat;
  }

  private normalizeCodigoEstablecimiento(value?: string) {
    const cleaned = value?.trim();
    return cleaned && cleaned.length > 0 ? cleaned : undefined;
  }

  private optional(value?: string | null) {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
