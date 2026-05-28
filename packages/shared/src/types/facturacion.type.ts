import { AmbienteSunat } from "../enums/ambiente-sunat.enum";
import { EstadoComprobante } from "../enums/estado-comprobante.enum";
import { EstadoFacturacionVenta } from "../enums/estado-facturacion-venta.enum";
import { EstadoVenta } from "../enums/estado-venta.enum";
import { ModalidadEnvioBoletas } from "../enums/modalidad-envio-boletas.enum";
import { TipoAfectacionIgv } from "../enums/tipo-afectacion-igv.enum";
import { TipoDocumento } from "../enums/documento-tipo.enum";
import { TipoFiscalProducto } from "../enums/tipo-fiscal-producto.enum";
import { PaginatedResponse, QueryParams } from "./pagination.type";

export interface EmitirComprobantePayload {
  ventaId: string;
  tipo: TipoDocumento;
  serieDocumentoId?: string;
  observaciones?: string;
  // Doc 10 §7/§8 — true = emitir aceptando las advertencias previamente mostradas.
  confirmarAdvertencias?: boolean;
}

export interface NotaAjusteLineaPayload {
  item: number;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
}

export interface CrearNotaCreditoPayload {
  comprobanteOrigenId: string;
  motivoCodigo: string;
  motivoDescripcion: string;
  monto: number;
  esExcepcional?: boolean;
  anulaTotalmente?: boolean;
  lineas?: NotaAjusteLineaPayload[];
}

export interface CrearNotaDebitoPayload {
  comprobanteOrigenId: string;
  motivoCodigo: string;
  motivoDescripcion: string;
  monto: number;
  lineas?: NotaAjusteLineaPayload[];
}

export interface QueryComprobanteFilters extends QueryParams {
  tipo?: TipoDocumento;
  /** Lista CSV (`FACTURA,BOLETA`) — OR de tipos. Ignorado si `tipo` está. */
  tipos?: string;
  estado?: EstadoComprobante;
  /** Lista CSV — OR de estados. Ignorado si `estado` está. */
  estados?: string;
}

export interface FacturacionConfigPayload {
  razonSocial?: string;
  ruc?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  serieFactura?: string;
  serieBoleta?: string;
  serieNotaCredito?: string;
  serieNotaDebito?: string;
  porcentajeIGV?: number;
}

export type FormatoImpresionDocumento = "A4" | "TICKET" | "AMBOS";
export type EstadoValidacionSunat =
  | "PENDIENTE"
  | "VALIDO"
  | "ACTIVO"
  | "INVALIDO"
  | "ERROR";
export type TipoDocumentoSunatCliente = "6" | "1" | "0";
export type ProveedorValidacionDocumento =
  | "SUNAT_PADRON_LOCAL"
  | "DECOLECTA"
  | "APISPERU"
  | "MANUAL";

export interface ConfigEmpresaFiscalPayload {
  ruc: string;
  razonSocial: string;
  nombreComercial?: string;
  direccionFiscal: string;
  ubigeoFiscal?: string;
  departamentoFiscal?: string;
  provinciaFiscal?: string;
  distritoFiscal?: string;
  codigoEstablecimiento?: string;
  correoSee?: string;
  regimenTributario?: string;
  formatoImpresionDefault?: FormatoImpresionDocumento;
  pieImpresion?: string;
  ambienteDefault?: AmbienteSunat;
  modalidadEnvioBoletas?: ModalidadEnvioBoletas;
  // Doc 10 §6 — overrides parciales de reglas configurables.
  // Estructura: Partial<Record<ReglaConfigurableId, NivelValidacion>>.
  reglasValidacion?: Record<string, "BLOQUEANTE" | "ADVERTENCIA"> | null;
}

export interface EmpresaSedeFiscalPayload {
  id?: string;
  configEmpresaFiscalId?: string;
  nombre: string;
  codigoEstablecimientoSunat: string;
  direccion: string;
  ubigeo: string;
  activo?: boolean;
}

export interface SerieDocumentoPayload {
  id?: string;
  configEmpresaFiscalId?: string;
  sedeFiscalId?: string;
  tipo: TipoDocumento;
  serie: string;
  correlativoActual: number;
  codigoEstablecimiento: string;
  ambiente?: AmbienteSunat;
  descripcion?: string;
  activo?: boolean;
}

export interface CertificadoDigitalPayload {
  id?: string;
  configEmpresaFiscalId?: string;
  nombre: string;
  storageProvider: "LOCAL_PRIVATE" | "MINIO_PRIVATE" | "SECRET_MANAGER";
  storageKey: string;
  fingerprintSha256?: string;
  serialNumber?: string;
  subject?: string;
  issuer?: string;
  validoDesde?: string | null;
  validoHasta?: string | null;
  activo?: boolean;
  revokedAt?: string | null;
}

export interface SunatDirectConfigStatusPayload {
  ambienteDefault: AmbienteSunat;
  tieneCertificadoActivo: boolean;
  certificadoActivo?: Pick<
    CertificadoDigitalPayload,
    | "id"
    | "nombre"
    | "fingerprintSha256"
    | "validoDesde"
    | "validoHasta"
    | "activo"
  > | null;
  sedesActivas: number;
  seriesActivas: number;
}

export interface ComprobanteDetalle {
  id?: string;
  comprobanteId?: string;
  item: number;
  productoId?: string | null;
  codigoInterno?: string;
  descripcion: string;
  unidadSunat: string;
  tipoFiscalProducto: TipoFiscalProducto;
  tipoAfectacionIgv: TipoAfectacionIgv;
  cantidad: number;
  valorUnitario: number;
  precioUnitario: number;
  descuento?: number;
  baseImponible: number;
  igv: number;
  total: number;
  metadataFiscal?: unknown;
}

export interface ProductoFiscalConfigPayload {
  productoId: string;
  tipoFiscalProducto: TipoFiscalProducto;
  unidadSunat: string;
  tipoAfectacionIgv: TipoAfectacionIgv;
  descripcionFiscal?: string;
  codigoProductoSunat?: string;
  codigoGs1?: string;
  aplicaIcbper?: boolean;
  activo?: boolean;
}

export interface ClienteValidacionSunatPayload {
  clienteId?: string;
  tipoDocumentoSunat: TipoDocumentoSunatCliente;
  numeroDocumento: string;
  proveedor?: ProveedorValidacionDocumento;
  nombreNormalizado?: string;
  direccionFiscal?: string;
  ubigeo?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  estado: EstadoValidacionSunat;
  condicionDomicilio?: string;
  ultimaValidacionAt?: string | null;
}

export interface ComprobanteListItem {
  id: string;
  numero: string;
  tipo: TipoDocumento;
  estado: EstadoComprobante;
  fechaEmision: string;
  clienteNombre: string;
  clienteDocNum: string;
  subtotal: number;
  igv: number;
  total: number;
}

export interface VentaPendienteFacturacionItem {
  id: string;
  numero: string;
  createdAt?: string;
  estado: EstadoVenta;
  estadoFacturacion: EstadoFacturacionVenta;
  subtotal: number;
  igv: number;
  total: number;
  cliente: {
    id: string;
    nombre?: string | null;
    apellido?: string | null;
    razonSocial?: string | null;
    ruc?: string | null;
    dni?: string | null;
  };
  usuario?: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
  };
}

export interface ComprobanteDocumentoResponse {
  id: string;
  numero: string;
  estado: EstadoComprobante;
  hashSunat: string | null;
  xmlUrl: string | null;
  cdrUrl: string | null;
  pdfUrl: string | null;
}

export type ComprobantesPaginatedResponse =
  PaginatedResponse<ComprobanteListItem>;

export type VentasPendientesFacturacionPaginatedResponse =
  PaginatedResponse<VentaPendienteFacturacionItem>;

/**
 * Doc 04 / Doc 07 / Doc 08 — Propósitos para los que se consulta elegibilidad
 * de un comprobante origen: NC (nota de crédito), ND (nota de débito) o BAJA
 * (comunicación de baja / RA).
 */
export type PropositoElegibilidadComprobante = "nc" | "nd" | "baja";

/**
 * Doc 08 §3 — Códigos de razón de bloqueo expuestos por el endpoint de
 * elegibilidad. La UI los mapea a iconos / acciones sugeridas y los muestra
 * en el modal `Buscar comprobante origen`.
 */
export type RazonBloqueoElegibilidad =
  | "ESTADO_INVALIDO"
  | "TIPO_NO_PERMITIDO"
  | "SALDO_AGOTADO"
  | "NC_EN_PROCESO"
  | "BAJA_EN_PROCESO"
  | "BAJA_NO_APLICA_BOLETA"
  | "PLAZO_BAJA_VENCIDO"
  | "PLAZO_NC_REGULAR_VENCIDO"
  | "MOTIVO_NO_APLICA";

export interface BloqueoElegibilidad {
  codigo: RazonBloqueoElegibilidad;
  mensaje: string;
}

export interface MotivoAplicable {
  codigo: string;
  label: string;
  esExcepcional?: boolean;
  soloFactura?: boolean;
}

export interface OperacionEnProcesoElegibilidad {
  id: string;
  numero: string;
  estado: string;
  tipo: "NOTA_CREDITO" | "COMUNICACION_BAJA";
}

/**
 * Respuesta de `GET /facturacion/comprobantes/:id/elegibilidad?proposito=...`.
 * Centraliza saldo, plazo, bloqueos y motivos aplicables en una sola llamada
 * para que la UI no recalcule lógica fiscal en distintos lugares.
 */
export interface ElegibilidadComprobante {
  comprobanteId: string;
  proposito: PropositoElegibilidadComprobante;

  puede: boolean;
  bloqueos: BloqueoElegibilidad[];

  numero: string;
  tipoOrigen: string;
  estadoOrigen: string;
  fechaEmision: string;
  cdrRecibidaAt: string | null;
  totalOrigen: number;
  moneda: string;

  /** Solo cuando proposito=nc. */
  saldoNoAcreditado?: number;
  /** Solo cuando proposito=nc. */
  acreditado?: number;

  /** Cuando proposito=baja: 7 días calendario desde la CDR. */
  plazoVenceAt?: string | null;
  /** Cuando proposito=baja: ms restantes hasta plazoVenceAt (negativo si vencido). */
  remainingMs?: number | null;

  /** Cuando proposito=nc: plazo de la NC excepcional (10 días hábiles). */
  plazoNcExcepcionalVenceAt?: string | null;
  plazoNcExcepcionalVencido?: boolean;

  /** NC u operación en proceso que bloquea esta operación. */
  bloqueoPorOperacionEnProceso: OperacionEnProcesoElegibilidad | null;

  /** Motivos válidos para la operación según tipo origen / plazo / saldo. */
  motivosAplicables: MotivoAplicable[];
}
