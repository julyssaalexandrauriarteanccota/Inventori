/**
 * Diccionario de errores SUNAT — mapea códigos / patrones devueltos por el
 * SEE (vía Greenter sidecar) a explicaciones cortas en español y, cuando
 * aplica, una sugerencia de acción para el usuario operativo.
 *
 * Las claves de los patrones provienen de:
 *  - Catálogo SUNAT de códigos de respuesta (4xxx / 3xxx).
 *  - Mensajes XSD frecuentes detectados por Greenter al validar el XML.
 *
 * Conservar este archivo es preferible a un switch hardcodeado en la UI:
 *  - Cualquier componente puede consumirlo (detail page, lista de logs,
 *    monitor SUNAT en cola, etc.).
 *  - Centraliza el copy para que sea fácil de auditar / traducir.
 */

export interface SunatErrorExplanation {
  /** Resumen corto, listo para mostrar al usuario. */
  motivo: string;
  /** Acción sugerida (opcional). */
  accion?: string;
  /** Categoría para decidir tonalidad / icono en UI. */
  severidad?: "config" | "datos" | "tecnico";
}

interface SunatErrorRule {
  /** Regex ejecutada contra el mensaje crudo. */
  match: RegExp;
  explain: SunatErrorExplanation;
}

const SUNAT_ERROR_RULES: SunatErrorRule[] = [
  /* ---------------- 01xx Autenticación / RUC del emisor --------------- */
  {
    match: /\b0?102\b|usuario.{0,20}(clave|contrase)/i,
    explain: {
      motivo:
        "Usuario u clave SOL incorrectos. SUNAT rechazó la autenticación del emisor.",
      accion: "Verifica las credenciales en Configuración → Tributario.",
      severidad: "config",
    },
  },
  {
    match: /\b0?103\b|usuario.{0,15}(inactivo|deshabilitado)/i,
    explain: {
      motivo: "El usuario SOL configurado está inactivo o deshabilitado.",
      accion: "Reactiva el usuario en SUNAT Online o configura otro válido.",
      severidad: "config",
    },
  },
  {
    match: /\b1032\b|ruc.{0,15}(baja|dado de baja|cesado)/i,
    explain: {
      motivo: "El RUC del emisor figura como dado de baja en SUNAT.",
      accion:
        "Reactiva el RUC en SUNAT antes de continuar emitiendo comprobantes.",
      severidad: "config",
    },
  },
  {
    match: /\b1033\b|no.{0,15}autorizado.{0,15}emitir/i,
    explain: {
      motivo:
        "El RUC del emisor no está autorizado a emitir el tipo de comprobante solicitado.",
      accion:
        "Verifica el régimen tributario y la afiliación al SEE en SUNAT Online.",
      severidad: "config",
    },
  },

  /* ---------------- 2xxx Documento duplicado / numeración ------------- */
  {
    match: /\b2017\b|ya.{0,15}(existe|registrado)|duplicad/i,
    explain: {
      motivo:
        "El comprobante ya fue registrado en SUNAT (número de serie+correlativo duplicado).",
      accion:
        "No es necesario reintentar: el comprobante ya fue aceptado. Sincroniza el estado o consulta por ticket.",
      severidad: "datos",
    },
  },
  {
    match: /\b2335\b|nota de cr[eé]dito.{0,30}no.{0,10}(existe|encuentra)/i,
    explain: {
      motivo: "La nota de crédito referida no existe en SUNAT o fue dada de baja.",
      accion:
        "Verifica el documento origen en Comprobantes → Notas crédito antes de reintentar.",
      severidad: "datos",
    },
  },

  /* ---------------- 3xxx Estructura / Catálogos ----------------------- */
  {
    match: /\b3105\b|tipo.{0,15}nota.{0,15}(cr[eé]dito|d[eé]bito).{0,20}mal/i,
    explain: {
      motivo:
        "El código de motivo de la nota (catálogo SUNAT 09/10) no corresponde al tipo de documento.",
      accion:
        "Selecciona un motivo válido. Por ejemplo, motivos 01-02 solo aplican a NC sobre facturas.",
      severidad: "datos",
    },
  },
  {
    match: /\b3133\b|documento.{0,15}receptor.{0,20}(incompleto|invalido|inv[aá]lido)/i,
    explain: {
      motivo:
        "El número o tipo de documento del cliente es inválido o está incompleto.",
      accion:
        "Verifica DNI/RUC del cliente y reintenta. Para facturas se exige RUC de 11 dígitos.",
      severidad: "datos",
    },
  },
  {
    match: /\b3208\b|igv.{0,20}(mal|incorrecto|no coincide)/i,
    explain: {
      motivo: "El IGV declarado no coincide con la base imponible × tasa.",
      accion:
        "Revisa los items y la tasa aplicada. Reintentar regenera el cálculo.",
      severidad: "datos",
    },
  },
  {
    match: /unitCode.+invalid value 'UND'|invalid value 'UND'.+unitCode/i,
    explain: {
      motivo:
        "Unidad de medida SUNAT inválida. Se envió UND; para bienes usa NIU y para servicios ZZ.",
      accion: "Corrige la unidad en el producto/servicio y reintenta.",
      severidad: "datos",
    },
  },

  /* ---------------- 4xxx Plazos / Negocio ----------------------------- */
  {
    match: /\b4332\b|plazo.{0,30}nota.{0,15}cr[eé]dito.{0,15}vencido/i,
    explain: {
      motivo:
        "Se excedió el plazo permitido por SUNAT para emitir la nota de crédito.",
      accion:
        "Las anulaciones fuera de plazo deben tramitarse por canales contables (no electrónicos).",
      severidad: "datos",
    },
  },
  {
    match: /\b1101\b|factura.{0,15}(dada|esta).{0,15}baja/i,
    explain: {
      motivo: "La factura referida está dada de baja en SUNAT.",
      accion:
        "No puedes emitir notas sobre una factura anulada. Verifica el comprobante origen.",
      severidad: "datos",
    },
  },
  {
    match: /\b1085\b|tipo.{0,15}operaci[oó]n.{0,15}(inv[aá]lido|incorrecto)/i,
    explain: {
      motivo:
        "El tipo de operación enviado (catálogo SUNAT 51) no es válido para este comprobante.",
      severidad: "datos",
    },
  },

  /* ---------------- Errores técnicos / Greenter ----------------------- */
  {
    match: /undefined attribute Id/i,
    explain: {
      motivo:
        "XML firmado con atributo Id no permitido en el nodo Invoice.",
      accion: "Reintenta para regenerar el XML; el sidecar lo recompone.",
      severidad: "tecnico",
    },
  },
  {
    match: /No se puede leer \(parsear\) el archivo XML/i,
    explain: {
      motivo:
        "SUNAT no pudo leer el XML enviado (problema de formato o codificación).",
      accion:
        "Revisa los campos fiscales del comprobante (caracteres especiales, longitud) antes de reintentar.",
      severidad: "tecnico",
    },
  },
  {
    match: /timeout|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND/i,
    explain: {
      motivo: "Sin conexión con el endpoint SUNAT. El servicio no respondió a tiempo.",
      accion:
        "Reintenta en unos minutos. Si persiste, verifica el estado del servicio SUNAT.",
      severidad: "tecnico",
    },
  },
];

/**
 * Busca una explicación amigable para un mensaje crudo de SUNAT.
 * Devuelve `null` si no hay regla aplicable (la UI mostrará el mensaje
 * crudo tal cual).
 */
export function explainSunatRejectMessage(
  message?: string | null,
): SunatErrorExplanation | null {
  const text = message ?? "";
  if (!text.trim()) return null;
  for (const rule of SUNAT_ERROR_RULES) {
    if (rule.match.test(text)) return rule.explain;
  }
  return null;
}

/**
 * Compatibilidad con el helper legacy que solo retornaba string —
 * usado en lugares donde aún no se migró a la forma estructurada.
 */
export function explainSunatRejectMessageText(
  message?: string | null,
): string | null {
  const exp = explainSunatRejectMessage(message);
  if (!exp) return null;
  return exp.accion ? `${exp.motivo} ${exp.accion}` : exp.motivo;
}
