import { z } from "zod";

import { AmbienteSunat } from "../enums/ambiente-sunat.enum";
import { EstadoComprobante } from "../enums/estado-comprobante.enum";
import { TipoAfectacionIgv } from "../enums/tipo-afectacion-igv.enum";
import { TipoDocumento } from "../enums/documento-tipo.enum";
import { MOTIVOS_NC_TODOS } from "../enums/motivos-nc.enum";
import { MOTIVOS_ND_TODOS } from "../enums/motivos-nd.enum";
import { ModalidadEnvioBoletas } from "../enums/modalidad-envio-boletas.enum";
import { TipoFiscalProducto } from "../enums/tipo-fiscal-producto.enum";
import { apiMetaSchema } from "./auth.schema";

const paginatedMetaSchema = apiMetaSchema.extend({
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
});

const nonEmptyTextSchema = z.string().trim().min(1);
const optionalTextSchema = nonEmptyTextSchema.optional();
const nonNegativeMoneySchema = z.number().min(0);
const positiveQuantitySchema = z.number().positive();
const clienteDocumentoSunatCodes = ["6", "1", "0"] as const;
const proveedorValidacionDocumentoCodes = [
  "SUNAT_PADRON_LOCAL",
  "DECOLECTA",
  "APISPERU",
  "MANUAL",
] as const;

function isValidClienteDocumentoSunat(
  tipo: (typeof clienteDocumentoSunatCodes)[number],
  numeroDocumento: string,
) {
  if (tipo === "6") return /^(10|20)\d{9}$/.test(numeroDocumento);
  if (tipo === "1")
    return /^\d{8}$/.test(numeroDocumento) && numeroDocumento !== "00000000";
  return numeroDocumento === "00000000";
}

export const configEmpresaFiscalSchema = z.object({
  ruc: z.string().regex(/^\d{11}$/, "El RUC fiscal debe tener 11 dígitos"),
  razonSocial: nonEmptyTextSchema,
  nombreComercial: optionalTextSchema,
  direccionFiscal: nonEmptyTextSchema,
  ubigeoFiscal: z
    .string()
    .regex(/^\d{6}$/, "El ubigeo fiscal debe tener 6 dígitos")
    .optional(),
  codigoEstablecimiento: z
    .string()
    .regex(/^\d{4}$/, "El código de establecimiento debe tener 4 dígitos")
    .optional(),
  correoSee: z.string().email().optional(),
  regimenTributario: optionalTextSchema,
  formatoImpresionDefault: z.enum(["A4", "TICKET", "AMBOS"]).optional(),
  ambienteDefault: z.nativeEnum(AmbienteSunat).optional(),
  modalidadEnvioBoletas: z.nativeEnum(ModalidadEnvioBoletas).optional(),
  pieImpresion: optionalTextSchema,
});

export const empresaSedeFiscalSchema = z.object({
  id: z.string().uuid().optional(),
  configEmpresaFiscalId: z.string().uuid().optional(),
  nombre: nonEmptyTextSchema,
  codigoEstablecimientoSunat: z
    .string()
    .regex(
      /^\d{4}$/,
      "El código de establecimiento SUNAT debe tener 4 dígitos",
    ),
  direccion: nonEmptyTextSchema,
  ubigeo: z.string().regex(/^\d{6}$/, "El ubigeo debe tener 6 dígitos"),
  activo: z.boolean().optional(),
});

export const serieDocumentoSchema = z.object({
  id: z.string().uuid().optional(),
  configEmpresaFiscalId: z.string().uuid().optional(),
  sedeFiscalId: z.string().uuid().optional(),
  tipo: z.nativeEnum(TipoDocumento),
  serie: z
    .string()
    .regex(/^[A-Z0-9]{4}$/, "La serie debe tener 4 caracteres alfanuméricos"),
  correlativoActual: z.number().int().min(0),
  codigoEstablecimiento: z
    .string()
    .regex(/^\d{4}$/, "El código de establecimiento debe tener 4 dígitos")
    .default("0000"),
  ambiente: z.nativeEnum(AmbienteSunat).optional(),
  descripcion: optionalTextSchema,
  activo: z.boolean().optional(),
});

export const certificadoDigitalSchema = z.object({
  id: z.string().uuid().optional(),
  configEmpresaFiscalId: z.string().uuid().optional(),
  nombre: nonEmptyTextSchema,
  storageProvider: z.enum(["LOCAL_PRIVATE", "MINIO_PRIVATE", "SECRET_MANAGER"]),
  storageKey: nonEmptyTextSchema,
  fingerprintSha256: optionalTextSchema,
  serialNumber: optionalTextSchema,
  subject: optionalTextSchema,
  issuer: optionalTextSchema,
  validoDesde: z.string().datetime().nullable().optional(),
  validoHasta: z.string().datetime().nullable().optional(),
  activo: z.boolean().optional(),
  revokedAt: z.string().datetime().nullable().optional(),
});

export const sunatDirectConfigStatusSchema = z.object({
  ambienteDefault: z.nativeEnum(AmbienteSunat),
  tieneCertificadoActivo: z.boolean(),
  certificadoActivo: certificadoDigitalSchema
    .pick({
      id: true,
      nombre: true,
      fingerprintSha256: true,
      validoDesde: true,
      validoHasta: true,
      activo: true,
    })
    .nullable()
    .optional(),
  sedesActivas: z.number().int().min(0),
  seriesActivas: z.number().int().min(0),
});

export const comprobanteDetalleSchema = z.object({
  id: z.string().uuid().optional(),
  comprobanteId: z.string().uuid().optional(),
  item: z.number().int().min(1),
  productoId: z.string().uuid().nullable().optional(),
  codigoInterno: optionalTextSchema,
  descripcion: nonEmptyTextSchema,
  unidadSunat: nonEmptyTextSchema,
  tipoFiscalProducto: z.nativeEnum(TipoFiscalProducto),
  tipoAfectacionIgv: z.nativeEnum(TipoAfectacionIgv),
  cantidad: positiveQuantitySchema,
  valorUnitario: nonNegativeMoneySchema,
  precioUnitario: nonNegativeMoneySchema,
  descuento: nonNegativeMoneySchema.optional(),
  baseImponible: nonNegativeMoneySchema,
  igv: nonNegativeMoneySchema,
  total: nonNegativeMoneySchema,
  metadataFiscal: z.unknown().optional(),
});

export const productoFiscalConfigSchema = z.object({
  productoId: z.string().uuid(),
  tipoFiscalProducto: z.nativeEnum(TipoFiscalProducto),
  unidadSunat: nonEmptyTextSchema,
  tipoAfectacionIgv: z.nativeEnum(TipoAfectacionIgv),
  descripcionFiscal: optionalTextSchema,
  codigoProductoSunat: optionalTextSchema,
  codigoGs1: optionalTextSchema,
  aplicaIcbper: z.boolean().optional(),
  activo: z.boolean().optional(),
});

export const clienteValidacionSunatSchema = z
  .object({
    clienteId: z.string().uuid().optional(),
    tipoDocumentoSunat: z.enum(clienteDocumentoSunatCodes),
    numeroDocumento: nonEmptyTextSchema,
    proveedor: z.enum(proveedorValidacionDocumentoCodes).optional(),
    nombreNormalizado: optionalTextSchema,
    direccionFiscal: optionalTextSchema,
    ubigeo: z
      .string()
      .regex(/^\d{6}$/, "El ubigeo debe tener 6 dígitos")
      .optional(),
    departamento: optionalTextSchema,
    provincia: optionalTextSchema,
    distrito: optionalTextSchema,
    estado: z.enum(["PENDIENTE", "VALIDO", "ACTIVO", "INVALIDO", "ERROR"]),
    condicionDomicilio: optionalTextSchema,
    ultimaValidacionAt: z.string().datetime().nullable().optional(),
  })
  .superRefine((values, ctx) => {
    if (
      !isValidClienteDocumentoSunat(
        values.tipoDocumentoSunat,
        values.numeroDocumento,
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["numeroDocumento"],
        message:
          values.tipoDocumentoSunat === "6"
            ? "El RUC debe tener 11 dígitos y empezar con 10 o 20"
            : values.tipoDocumentoSunat === "1"
              ? "El DNI debe tener exactamente 8 dígitos y no puede ser 00000000"
              : "Para sin documento se usa 00000000",
      });
    }
  });

export const emitirComprobanteSchema = z.object({
  ventaId: z.string().uuid(),
  tipo: z.nativeEnum(TipoDocumento),
});

export const notaAjusteLineaSchema = z.object({
  item: z.number().int().min(1),
  descripcion: nonEmptyTextSchema,
  cantidad: z.number().positive(),
  precioUnitario: nonNegativeMoneySchema,
  total: z.number().positive(),
});

export const crearNotaCreditoSchema = z
  .object({
    comprobanteOrigenId: z.string().uuid(),
    motivoCodigo: z.enum(MOTIVOS_NC_TODOS as [string, ...string[]]),
    motivoDescripcion: z.string().trim().min(10),
    monto: z.number().positive(),
    esExcepcional: z.boolean().optional(),
    anulaTotalmente: z.boolean().optional(),
    lineas: z.array(notaAjusteLineaSchema).optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.anulaTotalmente && (!values.lineas || values.lineas.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lineas"],
        message: "Las notas de crédito parciales requieren líneas.",
      });
    }
    if (values.lineas?.length) {
      const total = values.lineas.reduce((sum, linea) => sum + linea.total, 0);
      if (Math.abs(total - values.monto) > 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["monto"],
          message: "El monto debe coincidir con la suma de líneas.",
        });
      }
    }
  });

export const crearNotaDebitoSchema = z
  .object({
    comprobanteOrigenId: z.string().uuid(),
    motivoCodigo: z.enum(MOTIVOS_ND_TODOS as [string, ...string[]]),
    motivoDescripcion: z.string().trim().min(10),
    monto: z.number().positive(),
    lineas: z.array(notaAjusteLineaSchema).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.lineas?.length) {
      const total = values.lineas.reduce((sum, linea) => sum + linea.total, 0);
      if (Math.abs(total - values.monto) > 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["monto"],
          message: "El monto debe coincidir con la suma de líneas.",
        });
      }
    }
  });

export const queryComprobanteFiltersSchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).optional(),
  tipo: z.nativeEnum(TipoDocumento).optional(),
  estado: z.nativeEnum(EstadoComprobante).optional(),
  search: z.string().trim().min(1).optional(),
});

export const comprobanteListItemSchema = z.object({
  id: z.string().uuid(),
  numero: z.string(),
  tipo: z.nativeEnum(TipoDocumento),
  estado: z.nativeEnum(EstadoComprobante),
  fechaEmision: z.string(),
  clienteNombre: z.string(),
  clienteDocNum: z.string(),
  subtotal: z.number(),
  igv: z.number(),
  total: z.number(),
});

export const comprobantesPaginatedResponseSchema = z.object({
  data: z.array(comprobanteListItemSchema),
  meta: paginatedMetaSchema,
});

export const comprobanteDocumentoResponseSchema = z.object({
  data: z.object({
    id: z.string().uuid(),
    numero: z.string(),
    estado: z.nativeEnum(EstadoComprobante),
    hashSunat: z.string().nullable(),
    xmlUrl: z.string().nullable(),
    cdrUrl: z.string().nullable(),
    pdfUrl: z.string().nullable(),
  }),
  meta: apiMetaSchema,
});
