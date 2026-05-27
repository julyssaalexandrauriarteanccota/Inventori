import { TipoCliente } from "../enums/tipo-cliente.enum";
import { CondicionProducto } from "../enums/condicion-producto.enum";
import { TipoProducto } from "../enums/tipo-producto.enum";
import {
  ProveedorValidacionDocumento,
  EstadoValidacionSunat,
  TipoDocumentoSunatCliente,
} from "./facturacion.type";
import { LocationPayload } from "./location.type";
import { PaginatedResponse, QueryParams } from "./pagination.type";

export interface ClienteFormPayload extends LocationPayload {
  tipo: TipoCliente;
  nombre?: string;
  apellido?: string;
  dni?: string;
  razonSocial?: string;
  ruc?: string;
  email?: string;
  telefono?: string;
  celular?: string;
  notas?: string;
  activo?: boolean;
  esGenerico?: boolean;
}

export type ConsultaDocumentoClienteTipo = "DNI" | "RUC";
export type ConsultaDocumentoClienteProveedor =
  | "SUNAT_PADRON_LOCAL"
  | "DECOLECTA"
  | "APISPERU";
export type ConsultaDocumentoSunatCode = "1" | "6";

export interface ConsultaDocumentoClientePayload {
  tipoDocumento: ConsultaDocumentoClienteTipo;
  numeroDocumento: string;
  modo?: "AUTO" | "LOCAL_ONLY" | "EXTERNAL_ONLY";
}

export interface ConsultaDocumentoClienteResult {
  tipoDocumento: ConsultaDocumentoClienteTipo;
  tipoDocumentoSunat: ConsultaDocumentoSunatCode;
  numeroDocumento: string;
  proveedor: ConsultaDocumentoClienteProveedor;
  consultadoAt: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  nombreCompleto?: string;
  codVerifica?: string;
  razonSocial?: string;
  nombreComercial?: string;
  telefonos?: string[];
  direccion?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  ubigeo?: string;
  estado?: string;
  condicionDomicilio?: string;
  capital?: string;
}

export interface ProveedorFormPayload extends LocationPayload {
  razonSocial: string;
  ruc: string;
  email?: string;
  telefono?: string;
  celular?: string;
  contactoNombre?: string;
  contactoTelefono?: string;
  notas?: string;
  activo?: boolean;
}

export interface ProductoImagenPayload {
  id?: string;
  url: string;
  nombre?: string;
  tipo?: string;
  tamano?: number;
  esPrincipal?: boolean;
  orden?: number;
}

export interface ProductoFormPayload {
  sku?: string;
  nombre: string;
  descripcion?: string;
  tipo?: TipoProducto;
  categoriaId: string;
  marcaId?: string | null;
  modeloId?: string | null;
  modeloIds?: string[];
  unidadMedidaId: string;
  modelo?: string;
  codigoBarras?: string;
  codigoQr?: string;
  condicion?: CondicionProducto;
  precioCompra: number;
  precioVenta: number;
  precioMinimo: number;
  stockMinimo?: number;
  manejaInventario?: boolean;
  tieneNumeroSerie?: boolean;
  esConsumible?: boolean;
  requiereRepuestos?: boolean;
  tiempoEstimadoMin?: number;
  mesesGarantia?: number;
  garantiaMaxCopias?: number | null;
  imagen?: string;
  imagenes?: ProductoImagenPayload[];
  atributos?: Array<{ clave: string; valor?: string }>;
  activo?: boolean;
  stockInicial?: Array<{
    almacenId: string;
    cantidad: number;
    costoUnitario?: number;
  }>;
}

export interface UnidadMedidaPayload {
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo?: boolean;
}

export interface ModeloCatalogoPayload {
  nombre: string;
  descripcion?: string;
  tipo: TipoProducto;
  marcaId?: string | null;
  activo?: boolean;
}

export interface ClienteFilters extends QueryParams {
  tipo?: TipoCliente;
  activo?: boolean;
  esGenerico?: boolean;
}

export interface ProveedorFilters extends QueryParams {
  activo?: boolean;
}

export interface ProductoFilters extends QueryParams {
  tipo?: TipoProducto;
  /** Lista de tipos a excluir (ej. para ocultar SERVICIO en /productos). */
  excluirTipos?: TipoProducto[];
  categoriaId?: string;
  marcaId?: string;
  condicion?: CondicionProducto;
  esConsumible?: boolean;
  tieneNumeroSerie?: boolean;
  activo?: boolean;
  /** Cuando es true, solo retorna productos con stock > 0 (los SERVICIO siempre se incluyen). */
  conStock?: boolean;
}

export interface ClienteValidacionDocumentoItem {
  id: string;
  tipoDocumentoSunat: TipoDocumentoSunatCliente;
  numeroDocumento: string;
  proveedor?: ProveedorValidacionDocumento | null;
  nombreNormalizado?: string | null;
  direccionFiscal?: string | null;
  ubigeo?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  distrito?: string | null;
  estado: EstadoValidacionSunat;
  condicionDomicilio: string | null;
  ultimaValidacionAt: string | null;
}

export interface ClienteListItem {
  id: string;
  tipo: TipoCliente;
  nombre: string | null;
  apellido: string | null;
  dni: string | null;
  razonSocial: string | null;
  ruc: string | null;
  email: string | null;
  telefono: string | null;
  celular: string | null;
  direccion: string | null;
  distrito: string | null;
  provincia: string | null;
  departamento: string | null;
  referencia: string | null;
  notas: string | null;
  latitud: number | null;
  longitud: number | null;
  esGenerico?: boolean;
  validacionesSunat?: ClienteValidacionDocumentoItem[];
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProveedorListItem {
  id: string;
  razonSocial: string;
  ruc: string;
  email: string | null;
  telefono: string | null;
  celular: string | null;
  direccion: string | null;
  distrito: string | null;
  provincia: string | null;
  departamento: string | null;
  referencia: string | null;
  latitud: number | null;
  longitud: number | null;
  contactoNombre: string | null;
  contactoTelefono: string | null;
  notas: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductoListItem {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  tipo: TipoProducto;
  modeloId: string | null;
  modeloIds?: string[];
  modelo: string | null;
  codigoBarras: string | null;
  codigoQr: string | null;
  condicion: CondicionProducto | null;
  unidadMedida: {
    id: string;
    codigo: string;
    nombre: string;
  };
  precioCompra: number;
  precioVenta: number;
  precioMinimo: number;
  stockMinimo: number;
  stockActual: number;
  manejaInventario: boolean;
  tieneNumeroSerie: boolean;
  esConsumible: boolean;
  requiereRepuestos: boolean;
  tiempoEstimadoMin: number | null;
  mesesGarantia: number;
  garantiaMaxCopias: number | null;
  imagen: string | null;
  imagenes?: ProductoImagenListItem[];
  atributos?: Record<string, string> | null;
  activo: boolean;
  categoria: {
    id: string;
    nombre: string;
    tipo: TipoProducto;
    padreId?: string | null;
    padre?: { id: string; nombre: string } | null;
  };
  marca: {
    id: string;
    nombre: string;
  } | null;
  modeloCatalogo: {
    id: string;
    nombre: string;
    tipo: TipoProducto;
    marca: {
      id: string;
      nombre: string;
    } | null;
  } | null;
  modelosCompatibles?: {
    modeloCatalogo: {
      id: string;
      nombre: string;
      tipo: TipoProducto;
      marca: {
        id: string;
        nombre: string;
      } | null;
    };
  }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductoDetailItem extends ProductoListItem {
  createdAt: string;
  updatedAt: string;
}

export interface ProductoImagenListItem {
  id: string;
  url: string;
  nombre: string | null;
  tipo: string | null;
  tamano: number | null;
  esPrincipal: boolean;
  orden: number;
}

export interface CategoriaListItem {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: TipoProducto;
  padreId: string | null;
  hijos?: CategoriaListItem[];
}

export interface UnidadMedidaListItem {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface ModeloCatalogoListItem {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: TipoProducto;
  activo: boolean;
  marca: {
    id: string;
    nombre: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export type ClientesPaginatedResponse = PaginatedResponse<ClienteListItem>;
export type ProveedoresPaginatedResponse = PaginatedResponse<ProveedorListItem>;
export type ProductosPaginatedResponse = PaginatedResponse<ProductoListItem>;

// ── Tipos públicos (sin auth) ──

export interface CatalogoProducto {
  id: string;
  sku: string;
  nombre: string;
  descripcion: string | null;
  tipo: TipoProducto;
  modelo: string | null;
  precioVenta: number;
  imagen: string | null;
  imagenes?: ProductoImagenListItem[];
  tieneNumeroSerie: boolean;
  esConsumible: boolean;
  categoria: { id: string; nombre: string; tipo: TipoProducto };
  marca: { id: string; nombre: string } | null;
}

export interface CatalogoProductoDetalle extends CatalogoProducto {
  unidadMedida: {
    id: string;
    codigo: string;
    nombre: string;
  } | null;
  compatibilidadesComoModelo: {
    repuesto: { id: string; nombre: string; sku: string };
  }[];
  compatibilidadesComoRepuesto: {
    modelo: { id: string; nombre: string; sku: string; modelo: string | null };
  }[];
}

export type CatalogoPaginatedResponse = PaginatedResponse<CatalogoProducto>;

export interface EmpresaPublica {
  razonSocial: string | null;
  ruc: string | null;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  logo: string | null;
  nombreComercial: string | null;
  slogan: string | null;
  descripcionCorta: string | null;
  descripcionSeo: string | null;
  rubro: string | null;
  website: string | null;
  telefonoVentas: string | null;
  telefonoSoporte: string | null;
  whatsapp: string | null;
  emailVentas: string | null;
  emailSoporte: string | null;
  logoDark: string | null;
  favicon: string | null;
  colorPrimario: string | null;
  colorSecundario: string | null;
  heroTitulo: string | null;
  heroSubtitulo: string | null;
  catalogoDescripcion: string | null;
  contactoDescripcion: string | null;
  garantiaDescripcion: string | null;
  ticketDescripcion: string | null;
  pwaDescripcion: string | null;
}
