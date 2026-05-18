import { TipoDocumento } from '../enums/documento-tipo.enum';

/**
 * Doc 03 §2.7 — Helpers de plazos legales SUNAT.
 *
 * Plazos máximos para enviar el ejemplar a SUNAT:
 * - Factura / Nota vinculada a factura: el mismo día calendario de emisión.
 * - Boleta individual: 5 días calendario.
 * - Comunicación de baja (RA): 7 días desde la CDR del comprobante origen.
 * - Nota de crédito excepcional (motivos 01/02): 10 días hábiles.
 *
 * El worker SUNAT (doc 06) consume `calcularDeadlineEnvio()` para priorizar /
 * alertar / marcar `FALLIDO_PLAZO` cuando se excede.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Zona horaria fiscal de SUNAT (Lima, Perú). UTC-5 fijo todo el año (no DST).
 * Doc 06 §5 — los plazos legales se calculan al cierre del día en Lima,
 * no en la zona horaria del servidor.
 */
const LIMA_UTC_OFFSET_MINUTES = -300;

/**
 * Construye un Date que representa el fin del día (23:59:59.999) en Lima
 * para la fecha calendario de `fecha` interpretada también en Lima.
 *
 * Implementación sin date-fns-tz: Lima no observa DST, por lo que basta con
 * desplazar la fecha al "calendario Lima" sumando el offset, tomar año/mes/día
 * y reconstruir el instante UTC equivalente.
 */
function endOfDayLima(fecha: Date): Date {
  const offsetMs = LIMA_UTC_OFFSET_MINUTES * 60 * 1000;
  const limaCalendar = new Date(fecha.getTime() + offsetMs);
  const year = limaCalendar.getUTCFullYear();
  const month = limaCalendar.getUTCMonth();
  const day = limaCalendar.getUTCDate();
  // 23:59:59.999 en Lima ≡ 04:59:59.999 UTC del día siguiente.
  return new Date(Date.UTC(year, month, day, 23, 59, 59, 999) - offsetMs);
}

export interface DeadlineEnvio {
  deadline: Date;
  /** Margen en milisegundos desde "ahora" hasta el deadline (negativo si vencido). */
  remainingMs: number;
  /** True si quedan menos de 6h para el deadline (Doc 03 §2.7 → prioridad alta + alerta). */
  isProximoVencimiento: boolean;
  /** True si el deadline ya pasó (Doc 03 §2.7 → no reintentar, alerta crítica). */
  isVencido: boolean;
}

/**
 * Calcula el deadline de envío a SUNAT para un comprobante.
 *
 * - FACTURA, NOTA_CREDITO y NOTA_DEBITO: deadline = fin del día de emisión (23:59:59 local).
 * - BOLETA: deadline = fin del 5to día calendario tras emisión.
 *
 * Para `comunicación de baja` y `NC excepcional` usar los helpers dedicados.
 */
export function calcularDeadlineEnvio(
  tipo: TipoDocumento,
  fechaEmision: Date,
  ahora: Date = new Date(),
): DeadlineEnvio {
  let diasMargen: number;

  switch (tipo) {
    case TipoDocumento.FACTURA:
    case TipoDocumento.NOTA_CREDITO:
    case TipoDocumento.NOTA_DEBITO:
      diasMargen = 0;
      break;
    case TipoDocumento.BOLETA:
      diasMargen = 5;
      break;
    default:
      diasMargen = 0;
  }

  // Tolerar `Date | string` para no romper callers que pasan ISO strings.
  const emisionDate = fechaEmision instanceof Date ? fechaEmision : new Date(fechaEmision);
  const base = new Date(emisionDate.getTime() + diasMargen * MS_PER_DAY);
  const deadline = endOfDayLima(base);

  const remainingMs = deadline.getTime() - ahora.getTime();
  return {
    deadline,
    remainingMs,
    isProximoVencimiento: remainingMs > 0 && remainingMs < 6 * 60 * 60 * 1000,
    isVencido: remainingMs <= 0,
  };
}

/**
 * Doc 03 §2.4 — Comunicación de baja: 7 días calendario desde la CDR del
 * comprobante origen.
 */
export function calcularDeadlineComunicacionBaja(
  cdrFecha: Date,
  ahora: Date = new Date(),
): DeadlineEnvio {
  const deadline = endOfDayLima(new Date(cdrFecha.getTime() + 7 * MS_PER_DAY));
  const remainingMs = deadline.getTime() - ahora.getTime();
  return {
    deadline,
    remainingMs,
    isProximoVencimiento: remainingMs > 0 && remainingMs < 6 * 60 * 60 * 1000,
    isVencido: remainingMs <= 0,
  };
}

/**
 * Doc 03 §2.5 — NC excepcional motivos 01/02: 10 días hábiles desde la
 * emisión del comprobante origen. Cuenta lun-vie (no fines de semana, sin
 * feriados — el módulo de notas crédito puede afinar con feriados nacionales).
 */
export function calcularDeadlineNCExcepcional(
  fechaEmisionOrigen: Date,
  ahora: Date = new Date(),
): DeadlineEnvio {
  const cursor = new Date(fechaEmisionOrigen);
  let diasHabiles = 0;
  while (diasHabiles < 10) {
    cursor.setDate(cursor.getDate() + 1);
    const dia = cursor.getDay();
    if (dia !== 0 && dia !== 6) {
      diasHabiles += 1;
    }
  }
  const deadline = endOfDayLima(cursor);
  const remainingMs = deadline.getTime() - ahora.getTime();
  return {
    deadline,
    remainingMs,
    isProximoVencimiento: remainingMs > 0 && remainingMs < 6 * 60 * 60 * 1000,
    isVencido: remainingMs <= 0,
  };
}
