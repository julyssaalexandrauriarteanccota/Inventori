/**
 * Doc 06 §3 — clasificación de errores del envío SUNAT.
 *
 *  - RECUPERABLE  → BullMQ reintenta automáticamente.
 *  - NO_RECUPERABLE → marcar REQUIERE_REVISION; un reintento volverá a fallar.
 *  - FUNCIONAL    → SUNAT respondió con CDR de rechazo (código != 0); el
 *                   facturador decide si corregir y reemitir.
 *
 * Se usa en el processor para decidir entre `throw` (BullMQ reintenta) vs.
 * marcar el comprobante como `REQUIERE_REVISION` directamente.
 */
export type SunatErrorClass = 'RECUPERABLE' | 'NO_RECUPERABLE' | 'FUNCIONAL';

export interface ClassifiedError {
  clase: SunatErrorClass;
  razon: string;
}

const NO_RECUPERABLE_MARKERS = [
  'No existe certificado digital activo',
  'Credenciales SUNAT no configuradas',
  'FISCAL_MASTER_KEY_BASE64 no está configurado',
  'Certificado expirado',
  'Servicios SUNAT directo no inyectados',
  'XML inválido',
  'XSD validation',
  'cliente con RUC inválido',
  'Configuración de empresa no encontrada',
];

const RECUPERABLE_MARKERS = [
  'SUNAT_TIMEOUT',
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'fetch failed',
  'socket hang up',
  'network',
  'servicio no disponible',
];

/**
 * Clasifica un Error capturado durante el envío SUNAT.
 *
 * Convención:
 *  - error.code === 'SUNAT_TIMEOUT'  → RECUPERABLE
 *  - error.message contiene marcador no recuperable → NO_RECUPERABLE
 *  - HTTP 5xx (cuando se propague como Error) → RECUPERABLE
 *  - Default → RECUPERABLE (preferimos reintentar antes que bloquear).
 */
export function classifySunatError(error: unknown): ClassifiedError {
  const message = (error as Error)?.message ?? String(error);
  const code = (error as Error & { code?: string })?.code ?? '';

  for (const marker of NO_RECUPERABLE_MARKERS) {
    if (message.includes(marker)) {
      return { clase: 'NO_RECUPERABLE', razon: marker };
    }
  }

  for (const marker of RECUPERABLE_MARKERS) {
    if (message.includes(marker) || code === marker) {
      return { clase: 'RECUPERABLE', razon: marker };
    }
  }

  return { clase: 'RECUPERABLE', razon: 'unknown_error_assume_recoverable' };
}

/**
 * Clasifica el resultado de un CDR de SUNAT (cuando hubo respuesta exitosa).
 * Códigos:
 *   - '0'                       → ACEPTADO
 *   - '0' + observaciones (4xxx) → ACEPTADO_CON_OBSERVACIONES
 *   - 'CDR_PARSE_ERROR'         → RECUPERABLE (lanzar para reintentar)
 *   - resto                     → FUNCIONAL (RECHAZADO)
 */
export function classifyCdrResult(codigoRespuesta: string): SunatErrorClass {
  if (codigoRespuesta === '0') return 'FUNCIONAL';
  if (codigoRespuesta === 'CDR_PARSE_ERROR') return 'RECUPERABLE';
  return 'FUNCIONAL';
}
