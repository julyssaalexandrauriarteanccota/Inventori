import { BadRequestException, Injectable } from '@nestjs/common';
import { AmbienteSunat, TipoDocumento } from '@erp/shared';
import { Prisma } from '../../../generated/prisma/client';

export type FacturacionTx = Prisma.TransactionClient;

interface LegacySeriesConfig {
  id: string;
  serieFactura: string;
  serieBoleta: string;
  serieNotaCredito: string;
  serieNotaDebito: string;
  correlativoFactura: number;
  correlativoBoleta: number;
  correlativoNotaCredito: number;
  correlativoNotaDebito: number;
}

interface LegacySeriesFields {
  serieField: keyof Pick<
    LegacySeriesConfig,
    'serieFactura' | 'serieBoleta' | 'serieNotaCredito' | 'serieNotaDebito'
  >;
  correlativoField: keyof Pick<
    LegacySeriesConfig,
    | 'correlativoFactura'
    | 'correlativoBoleta'
    | 'correlativoNotaCredito'
    | 'correlativoNotaDebito'
  >;
}

export interface NextSerieDocumentoResult {
  serie: string;
  correlativo: number;
  numero: string;
  source: 'serie-documento' | 'config-empresa-legacy';
}

export type SerieDocumentoPrefix = 'F' | 'B';

@Injectable()
export class SerieDocumentoService {
  /**
   * Toma el próximo correlativo de la serie aplicable al `tipo`/`ambiente`.
   *
   * Doc 06 §11 — concurrencia: usa `SELECT ... FOR UPDATE` dentro de la
   * transacción para evitar que dos requests concurrentes tomen el mismo
   * correlativo. Sin lock pesimista, dos `findFirst` paralelos verían el
   * mismo `correlativoActual` y emitirían comprobantes con número repetido,
   * lo cual es irrecuperable ante SUNAT.
   */
  async next(
    tx: FacturacionTx,
    tipo: TipoDocumento,
    legacyConfig?: LegacySeriesConfig,
    ambiente?: AmbienteSunat,
    serieDocumentoId?: string,
    seriePrefix?: SerieDocumentoPrefix,
  ): Promise<NextSerieDocumentoResult> {
    interface LockedRow {
      id: string;
      serie: string;
      correlativoActual: number;
    }

    const lockedRows = serieDocumentoId
      ? await tx.$queryRaw<LockedRow[]>`
          SELECT id, serie, "correlativoActual"
          FROM series_documento
          WHERE id = ${serieDocumentoId}
            AND tipo = ${tipo}::"TipoDocumento"
            AND activo = true
            AND "deletedAt" IS NULL
            ${ambiente ? Prisma.sql`AND ambiente = ${ambiente}::"AmbienteSunat"` : Prisma.empty}
            ${seriePrefix ? Prisma.sql`AND serie LIKE ${`${seriePrefix}%`}` : Prisma.empty}
          LIMIT 1
          FOR UPDATE
        `
      : ambiente
        ? await tx.$queryRaw<LockedRow[]>`
          SELECT id, serie, "correlativoActual"
          FROM series_documento
          WHERE tipo = ${tipo}::"TipoDocumento"
            AND activo = true
            AND "deletedAt" IS NULL
            AND ambiente = ${ambiente}::"AmbienteSunat"
            ${seriePrefix ? Prisma.sql`AND serie LIKE ${`${seriePrefix}%`}` : Prisma.empty}
          ORDER BY "codigoEstablecimiento" ASC, serie ASC
          LIMIT 1
          FOR UPDATE
        `
        : await tx.$queryRaw<LockedRow[]>`
          SELECT id, serie, "correlativoActual"
          FROM series_documento
          WHERE tipo = ${tipo}::"TipoDocumento"
            AND activo = true
            AND "deletedAt" IS NULL
            ${seriePrefix ? Prisma.sql`AND serie LIKE ${`${seriePrefix}%`}` : Prisma.empty}
          ORDER BY "codigoEstablecimiento" ASC, serie ASC
          LIMIT 1
          FOR UPDATE
        `;

    const locked = lockedRows[0];
    if (locked) {
      const correlativo = locked.correlativoActual + 1;
      await tx.serieDocumento.update({
        where: { id: locked.id },
        data: { correlativoActual: correlativo },
      });

      return {
        serie: locked.serie,
        correlativo,
        numero: this.buildNumero(locked.serie, correlativo),
        source: 'serie-documento',
      };
    }

    if (serieDocumentoId) {
      throw new BadRequestException(
        'La serie seleccionada no está activa o no corresponde al tipo/ambiente',
      );
    }

    return this.nextFromLegacyConfig(tx, tipo, legacyConfig, seriePrefix);
  }

  private async nextFromLegacyConfig(
    tx: FacturacionTx,
    tipo: TipoDocumento,
    legacyConfig?: LegacySeriesConfig,
    seriePrefix?: SerieDocumentoPrefix,
  ): Promise<NextSerieDocumentoResult> {
    // Lock pesimista también sobre la fila legacy de configEmpresa.
    interface LockedConfig {
      id: string;
      serieFactura: string;
      serieBoleta: string;
      serieNotaCredito: string;
      serieNotaDebito: string;
      correlativoFactura: number;
      correlativoBoleta: number;
      correlativoNotaCredito: number;
      correlativoNotaDebito: number;
    }

    const targetId = legacyConfig?.id ?? null;
    const locked = targetId
      ? await tx.$queryRaw<LockedConfig[]>`
          SELECT id,
                 "serieFactura", "serieBoleta", "serieNotaCredito", "serieNotaDebito",
                 "correlativoFactura", "correlativoBoleta",
                 "correlativoNotaCredito", "correlativoNotaDebito"
          FROM config_empresa
          WHERE id = ${targetId}
          FOR UPDATE
        `
      : await tx.$queryRaw<LockedConfig[]>`
          SELECT id,
                 "serieFactura", "serieBoleta", "serieNotaCredito", "serieNotaDebito",
                 "correlativoFactura", "correlativoBoleta",
                 "correlativoNotaCredito", "correlativoNotaDebito"
          FROM config_empresa
          ORDER BY id
          LIMIT 1
          FOR UPDATE
        `;
    const config = locked[0];
    if (!config) {
      throw new BadRequestException(
        'Configuración de empresa no encontrada. Configure la empresa primero.',
      );
    }

    const fields = this.getLegacyFields(tipo);
    const serie = this.normalizeSeriePrefix(
      tipo,
      config[fields.serieField],
      seriePrefix,
    );
    const correlativo = config[fields.correlativoField] + 1;

    await tx.configEmpresa.update({
      where: { id: config.id },
      data: { [fields.correlativoField]: correlativo },
    });

    return {
      serie,
      correlativo,
      numero: this.buildNumero(serie, correlativo),
      source: 'config-empresa-legacy',
    };
  }

  private getLegacyFields(tipo: TipoDocumento): LegacySeriesFields {
    switch (tipo) {
      case TipoDocumento.FACTURA:
        return {
          serieField: 'serieFactura',
          correlativoField: 'correlativoFactura',
        };
      case TipoDocumento.BOLETA:
        return {
          serieField: 'serieBoleta',
          correlativoField: 'correlativoBoleta',
        };
      case TipoDocumento.NOTA_CREDITO:
        return {
          serieField: 'serieNotaCredito',
          correlativoField: 'correlativoNotaCredito',
        };
      case TipoDocumento.NOTA_DEBITO:
        return {
          serieField: 'serieNotaDebito',
          correlativoField: 'correlativoNotaDebito',
        };
      default:
        throw new BadRequestException('Tipo de documento no soportado');
    }
  }

  private buildNumero(serie: string, correlativo: number) {
    return `${serie}-${String(correlativo).padStart(8, '0')}`;
  }

  private normalizeSeriePrefix(
    tipo: TipoDocumento,
    serie: string,
    prefix?: SerieDocumentoPrefix,
  ) {
    if (
      !prefix ||
      (tipo !== TipoDocumento.NOTA_CREDITO &&
        tipo !== TipoDocumento.NOTA_DEBITO) ||
      !/^[FB][A-Z]\d{2}$/.test(serie)
    ) {
      return serie;
    }

    return `${prefix}${serie.slice(1)}`;
  }
}
