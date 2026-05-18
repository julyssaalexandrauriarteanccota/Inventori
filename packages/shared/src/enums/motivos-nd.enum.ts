/**
 * Doc 08 §6 + Anexo Cat 10 SUNAT — Catálogo de motivos de Nota de Débito.
 *
 * A diferencia de NC, ND no anula nada, sólo agrega cargos. Sin tope respecto
 * al origen. Plazo de envío = mismo del comprobante origen.
 */

export const MotivoND = {
  INTERESES_MORA: '01',
  AUMENTO_VALOR: '02',
  PENALIDADES: '03',
  AJUSTES_EXPORTACION: '10',
  AJUSTES_IVAP: '11',
} as const

export type MotivoNDCodigo = (typeof MotivoND)[keyof typeof MotivoND]

export interface MotivoNDDescriptor {
  codigo: MotivoNDCodigo
  label: string
  descripcionLarga: string
}

export const MOTIVOS_ND: MotivoNDDescriptor[] = [
  {
    codigo: MotivoND.INTERESES_MORA,
    label: 'Intereses por mora',
    descripcionLarga: 'El cliente pagó tarde y se cobra interés.',
  },
  {
    codigo: MotivoND.AUMENTO_VALOR,
    label: 'Aumento en el valor',
    descripcionLarga: 'Se acordó posteriormente subir el precio.',
  },
  {
    codigo: MotivoND.PENALIDADES,
    label: 'Penalidades / otros conceptos',
    descripcionLarga: 'Multas contractuales, recargos, otros cargos.',
  },
  {
    codigo: MotivoND.AJUSTES_EXPORTACION,
    label: 'Ajustes de operaciones de exportación',
    descripcionLarga: 'Caso especial — operaciones de exportación.',
  },
  {
    codigo: MotivoND.AJUSTES_IVAP,
    label: 'Ajustes afectos al IVAP',
    descripcionLarga: 'Caso especial — IVAP.',
  },
]

export const MOTIVOS_ND_TODOS: MotivoNDCodigo[] = Object.values(MotivoND)
