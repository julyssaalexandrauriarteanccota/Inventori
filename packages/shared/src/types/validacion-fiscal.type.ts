// Doc 10 §6/§7 — modelo público de validación fiscal pre-emisión.
// Las reglas se dividen en:
//   - obligatorias (siempre BLOQUEANTE, no editables — incumplirlas = rechazo SUNAT)
//   - configurables (la empresa elige BLOQUEANTE o ADVERTENCIA en su perfil)

export const NivelValidacion = {
  BLOQUEANTE: 'BLOQUEANTE',
  ADVERTENCIA: 'ADVERTENCIA',
} as const;
export type NivelValidacion = (typeof NivelValidacion)[keyof typeof NivelValidacion];

/**
 * Identificadores estables de las reglas configurables (Doc 10 §6 tabla 2).
 * Persisten en `ConfigEmpresaFiscal.reglasValidacion` como claves del JSON.
 */
export const ReglaConfigurableId = {
  RUC_RECEPTOR_ACTIVO_SUNAT: 'ruc_receptor_activo_sunat',
  RUC_RECEPTOR_HABIDO_SUNAT: 'ruc_receptor_habido_sunat',
  RUC_VALIDADO_RECIENTEMENTE: 'ruc_validado_recientemente',
  RAZON_SOCIAL_COINCIDE_PADRON: 'razon_social_coincide_padron',
  STOCK_DISPONIBLE_AL_EMITIR: 'stock_disponible_al_emitir',
  PRODUCTO_CON_CODIGO_SUNAT: 'producto_con_codigo_sunat',
  CLIENTE_CON_EMAIL: 'cliente_con_email',
  TOTAL_COMPROBANTE_POSITIVO: 'total_comprobante_positivo',
  MONEDA_NO_PEN_CON_TIPO_CAMBIO: 'moneda_no_pen_con_tipo_cambio',
} as const;
export type ReglaConfigurableId =
  (typeof ReglaConfigurableId)[keyof typeof ReglaConfigurableId];

/**
 * Defaults de Doc 10 §6 tabla 2. Se aplican cuando ConfigEmpresaFiscal.reglasValidacion
 * no contiene una entrada para una regla concreta.
 */
export const REGLAS_CONFIGURABLES_DEFAULTS: Record<
  ReglaConfigurableId,
  NivelValidacion
> = {
  [ReglaConfigurableId.RUC_RECEPTOR_ACTIVO_SUNAT]: NivelValidacion.BLOQUEANTE,
  [ReglaConfigurableId.RUC_RECEPTOR_HABIDO_SUNAT]: NivelValidacion.ADVERTENCIA,
  [ReglaConfigurableId.RUC_VALIDADO_RECIENTEMENTE]: NivelValidacion.ADVERTENCIA,
  [ReglaConfigurableId.RAZON_SOCIAL_COINCIDE_PADRON]: NivelValidacion.ADVERTENCIA,
  [ReglaConfigurableId.STOCK_DISPONIBLE_AL_EMITIR]: NivelValidacion.BLOQUEANTE,
  [ReglaConfigurableId.PRODUCTO_CON_CODIGO_SUNAT]: NivelValidacion.ADVERTENCIA,
  [ReglaConfigurableId.CLIENTE_CON_EMAIL]: NivelValidacion.ADVERTENCIA,
  [ReglaConfigurableId.TOTAL_COMPROBANTE_POSITIVO]: NivelValidacion.BLOQUEANTE,
  [ReglaConfigurableId.MONEDA_NO_PEN_CON_TIPO_CAMBIO]: NivelValidacion.BLOQUEANTE,
};

/** Etiquetas legibles para mostrar en la UI de configuración de reglas. */
export const REGLAS_CONFIGURABLES_LABELS: Record<ReglaConfigurableId, string> = {
  [ReglaConfigurableId.RUC_RECEPTOR_ACTIVO_SUNAT]:
    'RUC del receptor activo en SUNAT',
  [ReglaConfigurableId.RUC_RECEPTOR_HABIDO_SUNAT]:
    'RUC del receptor habido en SUNAT',
  [ReglaConfigurableId.RUC_VALIDADO_RECIENTEMENTE]:
    'RUC validado contra padrón hace menos de 30 días',
  [ReglaConfigurableId.RAZON_SOCIAL_COINCIDE_PADRON]:
    'Razón social coincide con padrón SUNAT',
  [ReglaConfigurableId.STOCK_DISPONIBLE_AL_EMITIR]: 'Stock disponible al emitir',
  [ReglaConfigurableId.PRODUCTO_CON_CODIGO_SUNAT]:
    'Producto con código SUNAT (Cat 25) asignado',
  [ReglaConfigurableId.CLIENTE_CON_EMAIL]: 'Cliente con email registrado',
  [ReglaConfigurableId.TOTAL_COMPROBANTE_POSITIVO]: 'Total del comprobante > 0',
  [ReglaConfigurableId.MONEDA_NO_PEN_CON_TIPO_CAMBIO]:
    'Si moneda ≠ PEN, tipo de cambio definido',
};

export interface EnlaceCorreccion {
  label: string;
  url: string;
}

export interface ItemValidacion {
  /** ID estable; para reglas configurables coincide con `ReglaConfigurableId`. */
  reglaId: string;
  mensaje: string;
  enlaceCorreccion?: EnlaceCorreccion;
}

export interface ResultadoValidacion {
  bloqueantes: ItemValidacion[];
  advertencias: ItemValidacion[];
}

/**
 * Estructura serializada en `ConfigEmpresaFiscal.reglasValidacion` (Json).
 * Todas las claves son opcionales: si falta una, se aplica el default.
 */
export type ReglasValidacionConfig = Partial<
  Record<ReglaConfigurableId, NivelValidacion>
>;

/**
 * Dado un override parcial del usuario, devuelve el mapa completo aplicando
 * los defaults de Doc 10 §6 tabla 2.
 */
export function resolverReglasConfigurables(
  override: ReglasValidacionConfig | null | undefined,
): Record<ReglaConfigurableId, NivelValidacion> {
  return {
    ...REGLAS_CONFIGURABLES_DEFAULTS,
    ...(override ?? {}),
  };
}
