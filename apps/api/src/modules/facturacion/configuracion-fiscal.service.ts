import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AmbienteSunat,
  NivelValidacion,
  ReglaConfigurableId,
  type ReglasValidacionConfig,
} from '@erp/shared';
import type { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UpdateConfigEmpresaFiscalDto } from './dto';

const REGLAS_CONFIGURABLES_VALIDAS: Set<string> = new Set(
  Object.values(ReglaConfigurableId),
);
const NIVELES_VALIDOS: Set<string> = new Set(Object.values(NivelValidacion));

@Injectable()
export class ConfiguracionFiscalService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfigFiscal() {
    return this.prisma.configEmpresaFiscal.findFirst({
      orderBy: { createdAt: 'asc' },
    });
  }

  async upsertConfigFiscal(dto: UpdateConfigEmpresaFiscalDto) {
    const current = await this.prisma.configEmpresaFiscal.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (current) {
      const data = this.cleanDto(dto);
      const rucChanged = !!data.ruc && data.ruc !== current.ruc;

      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.configEmpresaFiscal.update({
          where: { id: current.id },
          data,
        });

        if (rucChanged) {
          await tx.serieDocumento.updateMany({
            where: { deletedAt: null },
            data: {
              activo: false,
              deletedAt: new Date(),
              descripcion:
                'Invalidada automáticamente por cambio de RUC fiscal',
            },
          });
        }

        return updated;
      });
    }

    const legacyConfig = await this.prisma.configEmpresa.findFirst();
    const data = {
      ruc: this.required(dto.ruc ?? legacyConfig?.ruc, 'RUC fiscal'),
      razonSocial: this.required(
        dto.razonSocial ?? legacyConfig?.razonSocial,
        'razón social fiscal',
      ),
      nombreComercial: this.optional(
        dto.nombreComercial ?? legacyConfig?.nombreComercial,
      ),
      direccionFiscal: this.required(
        dto.direccionFiscal ?? legacyConfig?.direccion,
        'dirección fiscal',
      ),
      ubigeoFiscal: this.optional(dto.ubigeoFiscal),
      codigoEstablecimiento: this.optional(dto.codigoEstablecimiento),
      correoSee: this.optional(dto.correoSee),
      regimenTributario: this.optional(dto.regimenTributario),
      formatoImpresionDefault: this.optional(dto.formatoImpresionDefault),
      pieImpresion: this.optional(dto.pieImpresion),
      ambienteDefault: dto.ambienteDefault ?? AmbienteSunat.BETA,
      modalidadEnvioBoletas: dto.modalidadEnvioBoletas,
    };

    return this.prisma.configEmpresaFiscal.create({ data });
  }

  private cleanDto(dto: UpdateConfigEmpresaFiscalDto) {
    return {
      ruc: this.optional(dto.ruc),
      razonSocial: this.optional(dto.razonSocial),
      nombreComercial: this.optional(dto.nombreComercial),
      direccionFiscal: this.optional(dto.direccionFiscal),
      ubigeoFiscal: this.optional(dto.ubigeoFiscal),
      codigoEstablecimiento: this.optional(dto.codigoEstablecimiento),
      correoSee: this.optional(dto.correoSee),
      regimenTributario: this.optional(dto.regimenTributario),
      formatoImpresionDefault: this.optional(dto.formatoImpresionDefault),
      pieImpresion: this.optional(dto.pieImpresion),
      ambienteDefault: dto.ambienteDefault,
      modalidadEnvioBoletas: dto.modalidadEnvioBoletas,
      reglasValidacion: this.cleanReglasValidacion(dto.reglasValidacion),
    };
  }

  /**
   * Doc 10 §6 — sanea overrides de reglas configurables. Descarta claves
   * desconocidas y valores fuera de NivelValidacion. Si después del filtro
   * el objeto queda vacío, devuelve `null` para limpiar la columna.
   */
  private cleanReglasValidacion(
    raw: ReglasValidacionConfig | null | undefined,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
    if (raw === undefined) return undefined; // no tocar la columna
    if (raw === null) return null as unknown as typeof Prisma.JsonNull;

    const out: ReglasValidacionConfig = {};
    for (const [key, value] of Object.entries(raw)) {
      if (
        REGLAS_CONFIGURABLES_VALIDAS.has(key) &&
        typeof value === 'string' &&
        NIVELES_VALIDOS.has(value)
      ) {
        out[key as ReglaConfigurableId] = value;
      }
    }
    if (Object.keys(out).length === 0) {
      return null as unknown as typeof Prisma.JsonNull;
    }
    return out as Prisma.InputJsonValue;
  }

  private required(value: string | null | undefined, label: string) {
    const cleaned = this.optional(value);
    if (!cleaned) {
      throw new BadRequestException(`Debe configurar ${label}`);
    }
    return cleaned;
  }

  private optional(value: string | null | undefined) {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
}
