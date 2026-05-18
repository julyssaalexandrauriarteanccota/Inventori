import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as snmp from 'net-snmp';

/**
 * OIDs estándar Printer-MIB / Host Resources MIB.
 * No todos los equipos exponen todos los OIDs; los que fallen quedan en undefined.
 */
const OIDS = {
  // Sistema
  sysDescr: '1.3.6.1.2.1.1.1.0',
  // Páginas totales (Printer-MIB - prtMarkerLifeCount)
  paginasTotales: '1.3.6.1.2.1.43.10.2.1.4.1.1',
  // Toner negro (Printer-MIB - prtMarkerSuppliesLevel.1.1)
  tonerKLevel: '1.3.6.1.2.1.43.11.1.1.9.1.1',
  tonerKMax: '1.3.6.1.2.1.43.11.1.1.8.1.1',
  tonerCLevel: '1.3.6.1.2.1.43.11.1.1.9.1.2',
  tonerCMax: '1.3.6.1.2.1.43.11.1.1.8.1.2',
  tonerMLevel: '1.3.6.1.2.1.43.11.1.1.9.1.3',
  tonerMMax: '1.3.6.1.2.1.43.11.1.1.8.1.3',
  tonerYLevel: '1.3.6.1.2.1.43.11.1.1.9.1.4',
  tonerYMax: '1.3.6.1.2.1.43.11.1.1.8.1.4',
  // Errores
  printerStatus: '1.3.6.1.2.1.25.3.5.1.1.1',
  detectedErrorState: '1.3.6.1.2.1.25.3.5.1.2.1',
};

export interface SnmpReading {
  paginasTotales?: number;
  nivelTonerNegro?: number;
  nivelTonerCian?: number;
  nivelTonerMagenta?: number;
  nivelTonerAmarillo?: number;
  estadoFusor?: string;
  erroresActivos: string[];
  rawData: Record<string, unknown>;
}

@Injectable()
export class SnmpService {
  private readonly logger = new Logger(SnmpService.name);

  async fetchReading(
    ipAddress: string,
    community: string,
    port: number,
  ): Promise<SnmpReading> {
    if (!ipAddress) {
      throw new BadRequestException('El equipo no tiene IP configurada');
    }

    const session = snmp.createSession(ipAddress, community || 'public', {
      port: port || 161,
      timeout: 4000,
      retries: 1,
      version: snmp.Version2c,
    });

    const oids = Object.values(OIDS);

    return new Promise<SnmpReading>((resolve, reject) => {
      session.get(oids, (error: Error | null, varbinds: unknown[]) => {
        try {
          if (error) {
            session.close();
            this.logger.warn(
              `SNMP get falló para ${ipAddress}: ${error.message}`,
            );
            return reject(
              new BadRequestException(
                `No se pudo conectar por SNMP a ${ipAddress}: ${error.message}`,
              ),
            );
          }

          const result: Record<string, unknown> = {};
          const keys = Object.keys(OIDS);
          (
            varbinds as Array<{ oid: string; type: number; value: unknown }>
          ).forEach((vb, i) => {
            if (snmp.isVarbindError(vb)) {
              result[keys[i]] = null;
            } else {
              const v = vb.value;
              if (v instanceof Buffer) {
                result[keys[i]] = v.toString('utf8');
              } else if (typeof v === 'bigint') {
                result[keys[i]] = Number(v);
              } else {
                result[keys[i]] = v;
              }
            }
          });

          const toPercent = (
            level: unknown,
            max: unknown,
          ): number | undefined => {
            const lvl = typeof level === 'number' ? level : Number(level);
            const mx = typeof max === 'number' ? max : Number(max);
            if (!Number.isFinite(lvl) || !Number.isFinite(mx) || mx <= 0) {
              return undefined;
            }
            if (lvl < 0) return undefined;
            return Math.max(0, Math.min(100, Math.round((lvl / mx) * 100)));
          };

          const erroresActivos: string[] = [];
          const errorState = result.detectedErrorState;
          if (
            errorState &&
            typeof errorState === 'string' &&
            errorState.length > 0
          ) {
            erroresActivos.push(errorState);
          }

          const reading: SnmpReading = {
            paginasTotales:
              typeof result.paginasTotales === 'number'
                ? result.paginasTotales
                : undefined,
            nivelTonerNegro: toPercent(result.tonerKLevel, result.tonerKMax),
            nivelTonerCian: toPercent(result.tonerCLevel, result.tonerCMax),
            nivelTonerMagenta: toPercent(result.tonerMLevel, result.tonerMMax),
            nivelTonerAmarillo: toPercent(result.tonerYLevel, result.tonerYMax),
            estadoFusor:
              typeof result.printerStatus === 'string'
                ? result.printerStatus
                : undefined,
            erroresActivos,
            rawData: result,
          };

          session.close();
          resolve(reading);
        } catch (e) {
          session.close();
          reject(e);
        }
      });
    });
  }
}
