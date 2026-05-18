import { describe, expect, it } from 'vitest';
import { TipoDocumento } from '../enums/documento-tipo.enum';
import {
  calcularDeadlineEnvio,
  calcularDeadlineComunicacionBaja,
  calcularDeadlineNCExcepcional,
} from './sunat-deadline.type';

// Lima es UTC-5 fijo (sin DST). 23:59:59.999 Lima ≡ 04:59:59.999 UTC del día siguiente.
function endOfDayLimaUtc(year: number, month1to12: number, day: number): Date {
  return new Date(Date.UTC(year, month1to12 - 1, day + 1, 4, 59, 59, 999));
}

describe('calcularDeadlineEnvio (Doc 03 §2.7) — Lima TZ', () => {
  it('FACTURA: deadline = fin del día de emisión en Lima', () => {
    // Emisión: 2026-05-06 10:00 Lima (= 15:00 UTC)
    const emision = new Date('2026-05-06T15:00:00Z');
    const r = calcularDeadlineEnvio(
      TipoDocumento.FACTURA,
      emision,
      new Date('2026-05-06T16:00:00Z'),
    );
    expect(r.deadline.toISOString()).toBe(
      endOfDayLimaUtc(2026, 5, 6).toISOString(),
    );
    expect(r.isVencido).toBe(false);
  });

  it('FACTURA: vencido si "ahora" pasó la medianoche Lima', () => {
    const emision = new Date('2026-05-06T15:00:00Z'); // 10:00 Lima
    const r = calcularDeadlineEnvio(
      TipoDocumento.FACTURA,
      emision,
      new Date('2026-05-07T05:30:00Z'), // 00:30 Lima del 7
    );
    expect(r.isVencido).toBe(true);
  });

  it('BOLETA: deadline = fin del 5° día calendario en Lima', () => {
    const emision = new Date('2026-05-06T15:00:00Z'); // 10:00 Lima del 6
    const r = calcularDeadlineEnvio(
      TipoDocumento.BOLETA,
      emision,
      new Date('2026-05-06T16:00:00Z'),
    );
    expect(r.deadline.toISOString()).toBe(
      endOfDayLimaUtc(2026, 5, 11).toISOString(),
    );
  });

  it('FACTURA: marca isProximoVencimiento si quedan <6h', () => {
    const emision = new Date('2026-05-06T15:00:00Z'); // 10:00 Lima
    const r = calcularDeadlineEnvio(
      TipoDocumento.FACTURA,
      emision,
      new Date('2026-05-07T01:00:00Z'), // 20:00 Lima del 6
    );
    expect(r.isProximoVencimiento).toBe(true);
  });
});

describe('calcularDeadlineComunicacionBaja (Doc 03 §2.4)', () => {
  it('7 días calendario desde la CDR (Lima)', () => {
    const cdr = new Date('2026-05-06T20:00:00Z'); // 15:00 Lima
    const r = calcularDeadlineComunicacionBaja(
      cdr,
      new Date('2026-05-06T21:00:00Z'),
    );
    expect(r.deadline.toISOString()).toBe(
      endOfDayLimaUtc(2026, 5, 13).toISOString(),
    );
    expect(r.isVencido).toBe(false);
  });
});

describe('calcularDeadlineNCExcepcional (Doc 03 §2.5)', () => {
  it('cuenta solo días hábiles (lun-vie)', () => {
    // Miércoles 6 mayo 2026 + 10 días hábiles = miércoles 20 mayo
    const origen = new Date('2026-05-06T15:00:00Z');
    const r = calcularDeadlineNCExcepcional(
      origen,
      new Date('2026-05-06T16:00:00Z'),
    );
    expect(r.deadline.toISOString()).toBe(
      endOfDayLimaUtc(2026, 5, 20).toISOString(),
    );
  });
});
