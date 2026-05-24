export const SUNAT_UNIDAD_MEDIDA_CODES = [
  'NIU',
  'ZZ',
  'KGM',
  'GRM',
  'TNE',
  'LTR',
  'MLT',
  'MTR',
  'CMT',
  'MMT',
  'MTK',
  'MTQ',
  'HUR',
  'DAY',
  'MON',
  'ANN',
  'KWH',
  'BX',
  'BG',
  'PK',
  'SET',
  'DZN',
] as const;

export type SunatUnidadMedidaCode =
  (typeof SUNAT_UNIDAD_MEDIDA_CODES)[number];

export const SUNAT_UNIDAD_MEDIDA_LABELS: Record<
  SunatUnidadMedidaCode,
  string
> = {
  NIU: 'Unidad física',
  ZZ: 'Unidad de servicio',
  KGM: 'Kilogramo',
  GRM: 'Gramo',
  TNE: 'Tonelada',
  LTR: 'Litro',
  MLT: 'Mililitro',
  MTR: 'Metro',
  CMT: 'Centímetro',
  MMT: 'Milímetro',
  MTK: 'Metro cuadrado',
  MTQ: 'Metro cúbico',
  HUR: 'Hora',
  DAY: 'Día',
  MON: 'Mes',
  ANN: 'Año',
  KWH: 'Kilowatt hora',
  BX: 'Caja',
  BG: 'Bolsa',
  PK: 'Paquete',
  SET: 'Juego / kit',
  DZN: 'Docena',
};

const SUNAT_UNIDAD_MEDIDA_SET = new Set<string>(SUNAT_UNIDAD_MEDIDA_CODES);

const SUNAT_UNIDAD_MEDIDA_ALIASES: Record<string, SunatUnidadMedidaCode> = {
  UND: 'NIU',
  UNIDAD: 'NIU',
  UNIDADES: 'NIU',
  UNI: 'NIU',
  UNIT: 'NIU',
  SERV: 'ZZ',
  SERVICIO: 'ZZ',
  HORA: 'HUR',
  HORAS: 'HUR',
  DIA: 'DAY',
  DIAS: 'DAY',
  CAJ: 'BX',
  CAJA: 'BX',
  BOL: 'BG',
  BOLSA: 'BG',
  PQT: 'PK',
  PAQ: 'PK',
  PAQUETE: 'PK',
  KIT: 'SET',
  LT: 'LTR',
  LTS: 'LTR',
  KG: 'KGM',
  G: 'GRM',
};

export function isSunatUnidadMedidaCode(
  value: string | null | undefined,
): value is SunatUnidadMedidaCode {
  return SUNAT_UNIDAD_MEDIDA_SET.has(String(value ?? '').trim().toUpperCase());
}

export function isSunatUnidadMedidaAlias(
  value: string | null | undefined,
): boolean {
  return String(value ?? '').trim().toUpperCase() in SUNAT_UNIDAD_MEDIDA_ALIASES;
}

export function normalizeSunatUnidadMedidaCode(
  value: string | null | undefined,
  fallback: SunatUnidadMedidaCode = 'NIU',
): SunatUnidadMedidaCode {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (isSunatUnidadMedidaCode(normalized)) return normalized;
  return SUNAT_UNIDAD_MEDIDA_ALIASES[normalized] ?? fallback;
}

export function sunatUnidadMedidaHelpText() {
  return 'Usa códigos SUNAT/UBL. Ejemplos: NIU para bienes, ZZ para servicios, KGM para kg, LTR para litros, HUR para horas.';
}
