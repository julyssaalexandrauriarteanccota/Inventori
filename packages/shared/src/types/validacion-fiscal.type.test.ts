import { describe, it, expect } from 'vitest';
import {
  NivelValidacion,
  ReglaConfigurableId,
  REGLAS_CONFIGURABLES_DEFAULTS,
  resolverReglasConfigurables,
} from './validacion-fiscal.type';

describe('validacion-fiscal — Doc 10 §6/§7', () => {
  it('todos los IDs configurables tienen default y label', () => {
    const ids = Object.values(ReglaConfigurableId);
    for (const id of ids) {
      expect(REGLAS_CONFIGURABLES_DEFAULTS[id]).toBeDefined();
    }
  });

  it('defaults de tabla 2 (Doc 10 §6) coinciden con la spec', () => {
    expect(
      REGLAS_CONFIGURABLES_DEFAULTS[ReglaConfigurableId.RUC_RECEPTOR_ACTIVO_SUNAT],
    ).toBe(NivelValidacion.BLOQUEANTE);
    expect(
      REGLAS_CONFIGURABLES_DEFAULTS[ReglaConfigurableId.RUC_RECEPTOR_HABIDO_SUNAT],
    ).toBe(NivelValidacion.ADVERTENCIA);
    expect(
      REGLAS_CONFIGURABLES_DEFAULTS[ReglaConfigurableId.STOCK_DISPONIBLE_AL_EMITIR],
    ).toBe(NivelValidacion.BLOQUEANTE);
    expect(
      REGLAS_CONFIGURABLES_DEFAULTS[ReglaConfigurableId.CLIENTE_CON_EMAIL],
    ).toBe(NivelValidacion.ADVERTENCIA);
  });

  it('resolverReglasConfigurables aplica overrides sobre defaults', () => {
    const r = resolverReglasConfigurables({
      [ReglaConfigurableId.CLIENTE_CON_EMAIL]: NivelValidacion.BLOQUEANTE,
    });
    expect(r[ReglaConfigurableId.CLIENTE_CON_EMAIL]).toBe(
      NivelValidacion.BLOQUEANTE,
    );
    // Las otras quedan en su default
    expect(r[ReglaConfigurableId.RUC_RECEPTOR_ACTIVO_SUNAT]).toBe(
      NivelValidacion.BLOQUEANTE,
    );
  });

  it('resolverReglasConfigurables admite null/undefined sin perder defaults', () => {
    const sinOverride = resolverReglasConfigurables(null);
    expect(sinOverride).toEqual(REGLAS_CONFIGURABLES_DEFAULTS);
    const sinArg = resolverReglasConfigurables(undefined);
    expect(sinArg).toEqual(REGLAS_CONFIGURABLES_DEFAULTS);
  });
});
