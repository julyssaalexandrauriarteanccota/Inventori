import { z } from "zod";

import { CondicionProducto } from "../enums/condicion-producto.enum";
import {
  isSunatUnidadMedidaCode,
  sunatUnidadMedidaHelpText,
} from "../constants/sunat-unidades-medida";
import { TipoCliente } from "../enums/tipo-cliente.enum";
import { TipoProducto } from "../enums/tipo-producto.enum";
import { apiMetaSchema } from "./auth.schema";
import { locationPayloadSchema } from "./location.schema";

const REQUIRED_TEXT = {
  nombre: "El nombre es obligatorio",
  apellido: "El apellido es obligatorio",
  razonSocial: "La razon social es obligatoria",
  sku: "El SKU es obligatorio",
} as const;

function requiredTextField(message: string) {
  return z.string().trim().min(1, message);
}

function optionalEmailField() {
  return z
    .string()
    .optional()
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed && trimmed.length > 0 ? trimmed : undefined;
    })
    .pipe(z.string().email("Ingresa un correo valido").optional());
}

function nonNegativeNumberField(label: string) {
  return z
    .number({
      invalid_type_error: `Ingresa un ${label.toLowerCase()} valido`,
    })
    .min(0, `El ${label.toLowerCase()} no puede ser negativo`);
}

export const clienteFiltersSchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  tipo: z.nativeEnum(TipoCliente).optional(),
  activo: z.boolean().optional(),
  esGenerico: z.boolean().optional(),
});

export const proveedorFiltersSchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).optional(),
  search: z.string().trim().min(1).optional(),
});

export const productoFiltersSchema = z.object({
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  tipo: z.nativeEnum(TipoProducto).optional(),
  excluirTipos: z.array(z.nativeEnum(TipoProducto)).optional(),
  categoriaId: z.string().uuid().optional(),
  marcaId: z.string().uuid().optional(),
  condicion: z.nativeEnum(CondicionProducto).optional(),
  esConsumible: z.boolean().optional(),
  tieneNumeroSerie: z.boolean().optional(),
  activo: z.boolean().optional(),
  conStock: z.boolean().optional(),
});

export const clienteFormSchema = z.discriminatedUnion("tipo", [
  z
    .object({
      tipo: z.literal(TipoCliente.NATURAL),
      nombre: requiredTextField(REQUIRED_TEXT.nombre),
      apellido: requiredTextField(REQUIRED_TEXT.apellido),
      dni: z
        .string()
        .regex(/^\d{8}$/, "El DNI debe tener 8 digitos")
        .refine(
          (value) => value !== "00000000",
          "El DNI 00000000 esta reservado para Publico en General",
        ),
      razonSocial: z.string().optional(),
      ruc: z.string().optional(),
      email: optionalEmailField(),
      telefono: z.string().optional(),
      celular: z.string().optional(),
      notas: z.string().optional(),
      activo: z.boolean().optional(),
    })
    .merge(locationPayloadSchema),
  z
    .object({
      tipo: z.literal(TipoCliente.EMPRESA),
      razonSocial: requiredTextField(REQUIRED_TEXT.razonSocial),
      ruc: z
        .string()
        .regex(
          /^(10|20)\d{9}$/,
          "El RUC debe tener 11 digitos y comenzar con 10 o 20",
        ),
      nombre: z.string().optional(),
      apellido: z.string().optional(),
      dni: z.string().optional(),
      email: optionalEmailField(),
      telefono: z.string().optional(),
      celular: z.string().optional(),
      notas: z.string().optional(),
      activo: z.boolean().optional(),
    })
    .merge(locationPayloadSchema),
]);

export const proveedorFormSchema = z.object({
  razonSocial: requiredTextField(REQUIRED_TEXT.razonSocial),
  ruc: z
    .string()
    .regex(
      /^(10|20)\d{9}$/,
      "El RUC debe tener 11 digitos y comenzar con 10 o 20",
    ),
  email: optionalEmailField(),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  contactoNombre: z.string().optional(),
  contactoTelefono: z.string().optional(),
  notas: z.string().optional(),
  activo: z.boolean().optional(),
});

export const productoImagenInputSchema = z.object({
  id: z.string().uuid().optional(),
  url: requiredTextField("La URL de imagen es obligatoria"),
  nombre: z.string().optional(),
  tipo: z.string().optional(),
  tamano: z.number().int().min(0).optional(),
  esPrincipal: z.boolean().optional(),
  orden: z.number().int().min(0).optional(),
});

export const stockInicialItemSchema = z.object({
  almacenId: z.string().uuid("Selecciona un almacén válido"),
  cantidad: z
    .number({ invalid_type_error: "Ingresa una cantidad válida" })
    .int("La cantidad debe ser entera")
    .min(1, "La cantidad debe ser mayor a 0"),
  costoUnitario: z
    .number({ invalid_type_error: "Ingresa un costo válido" })
    .min(0, "El costo no puede ser negativo")
    .optional(),
});

export type StockInicialItemInput = z.infer<typeof stockInicialItemSchema>;

export const productoFormSchema = z
  .object({
    sku: z.string().trim().optional(),
    nombre: requiredTextField(REQUIRED_TEXT.nombre),
    descripcion: z.string().optional(),
    tipo: z.nativeEnum(TipoProducto).default(TipoProducto.REPUESTO),
    categoriaId: z.string().uuid("Selecciona una categoria valida"),
    marcaId: z.string().uuid().nullable().optional(),
    modeloId: z.string().uuid().nullable().optional(),
    unidadMedidaId: z.string().uuid("Selecciona una unidad de medida valida"),
    modelo: z.string().optional(),
    codigoBarras: z.string().optional(),
    codigoQr: z.string().optional(),
    condicion: z.nativeEnum(CondicionProducto).optional(),
    precioCompra: nonNegativeNumberField("precio de compra"),
    precioVenta: nonNegativeNumberField("precio de venta"),
    precioMinimo: nonNegativeNumberField("precio minimo"),
    stockMinimo: z
      .number({
        invalid_type_error: "Ingresa un stock minimo valido",
      })
      .int("El stock minimo debe ser un numero entero")
      .min(0, "El stock minimo no puede ser negativo")
      .optional(),
    manejaInventario: z.boolean().optional(),
    tieneNumeroSerie: z.boolean().optional(),
    esConsumible: z.boolean().optional(),
    requiereRepuestos: z.boolean().optional(),
    tiempoEstimadoMin: z
      .number({
        invalid_type_error: "Ingresa un tiempo estimado valido",
      })
      .int("El tiempo estimado debe ser un numero entero")
      .min(0, "El tiempo estimado no puede ser negativo")
      .optional(),
    mesesGarantia: z
      .number({ invalid_type_error: "Ingresa los meses de garantía" })
      .int("Los meses de garantía deben ser un número entero")
      .min(0, "Los meses de garantía no pueden ser negativos")
      .max(120, "Los meses de garantía no pueden exceder 120")
      .optional(),
    garantiaMaxCopias: z
      .number({ invalid_type_error: "Ingresa el límite de copias" })
      .int("El límite de copias debe ser entero")
      .min(0, "El límite de copias no puede ser negativo")
      .nullable()
      .optional(),
    imagen: z.string().optional(),
    imagenes: z
      .array(productoImagenInputSchema)
      .max(12, "Puedes registrar hasta 12 imagenes")
      .optional(),
    atributos: z
      .preprocess(
        (raw) => {
          if (!Array.isArray(raw)) return raw;
          return raw.filter((item) => {
            if (!item || typeof item !== "object") return false;
            const clave =
              typeof (item as { clave?: unknown }).clave === "string"
                ? ((item as { clave: string }).clave).trim()
                : "";
            const valor =
              typeof (item as { valor?: unknown }).valor === "string"
                ? ((item as { valor: string }).valor).trim()
                : "";
            return clave.length > 0 || valor.length > 0;
          });
        },
        z
          .array(
            z.object({
              clave: z
                .string()
                .trim()
                .min(1, "La clave del atributo es requerida")
                .max(40, "La clave no puede exceder 40 caracteres"),
              valor: z
                .string()
                .trim()
                .max(200, "El valor no puede exceder 200 caracteres")
                .optional()
                .default(""),
            }),
          )
          .max(30, "Puedes registrar hasta 30 atributos")
          .optional(),
      )
      .optional(),
    stockInicial: z
      .array(stockInicialItemSchema)
      .max(20, "Puedes registrar stock inicial en hasta 20 almacenes")
      .optional(),
    activo: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.precioMinimo > value.precioVenta) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["precioMinimo"],
        message: "El precio minimo no puede ser mayor al precio de venta",
      });
    }

    if (value.tipo === TipoProducto.SERVICIO) {
      if (value.manejaInventario) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["manejaInventario"],
          message: "Los servicios no deben manejar inventario",
        });
      }

      if (value.tieneNumeroSerie) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["tieneNumeroSerie"],
          message: "Los servicios no tienen numero de serie",
        });
      }

      if (value.esConsumible) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["esConsumible"],
          message: "Los servicios no son consumibles",
        });
      }

      if ((value.stockMinimo ?? 0) > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stockMinimo"],
          message: "Los servicios no tienen stock mínimo",
        });
      }
    }

    if (
      value.tipo !== TipoProducto.SERVICIO &&
      value.manejaInventario === false
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["manejaInventario"],
        message: "Solo los servicios pueden quedar fuera de inventario",
      });
    }

    if (value.stockInicial && value.stockInicial.length > 0) {
      if (value.tipo === TipoProducto.SERVICIO) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stockInicial"],
          message: "Los servicios no pueden tener stock inicial",
        });
      }
      if (value.tipo === TipoProducto.EQUIPO || value.tieneNumeroSerie) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stockInicial"],
          message:
            "Los equipos no tienen stock inicial en Productos; registra las unidades físicas desde Equipos",
        });
      }
      if (value.manejaInventario === false) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["stockInicial"],
          message:
            "El producto debe manejar inventario para registrar stock inicial",
        });
      }
      const ids = new Set<string>();
      value.stockInicial.forEach((item, index) => {
        if (ids.has(item.almacenId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["stockInicial", index, "almacenId"],
            message: "El almacén está repetido",
          });
        }
        ids.add(item.almacenId);
      });
    }

    if (value.tipo !== TipoProducto.EQUIPO && value.tieneNumeroSerie) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tieneNumeroSerie"],
        message: "Solo los equipos pueden tener número de serie",
      });
    }

    if (
      value.tipo === TipoProducto.EQUIPO &&
      value.tieneNumeroSerie === false
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tieneNumeroSerie"],
        message: "Los equipos deben tener número de serie",
      });
    }

    if (value.tipo === TipoProducto.INSUMO && value.esConsumible === false) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["esConsumible"],
        message: "Los insumos deben marcarse como consumibles",
      });
    }

    if (
      [
        TipoProducto.REPUESTO,
        TipoProducto.ACCESORIO,
        TipoProducto.EQUIPO,
      ].includes(value.tipo) &&
      value.esConsumible
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["esConsumible"],
        message: "Solo los insumos pueden marcarse como consumibles",
      });
    }
  });

export const clienteValidacionDocumentoSchema = z.object({
  id: z.string().uuid(),
  tipoDocumentoSunat: z.enum(["6", "1", "0"]),
  numeroDocumento: z.string(),
  proveedor: z
    .enum(["SUNAT_PADRON_LOCAL", "DECOLECTA", "APISPERU", "MANUAL"])
    .nullable()
    .optional(),
  nombreNormalizado: z.string().nullable().optional(),
  direccionFiscal: z.string().nullable().optional(),
  ubigeo: z.string().nullable().optional(),
  departamento: z.string().nullable().optional(),
  provincia: z.string().nullable().optional(),
  distrito: z.string().nullable().optional(),
  estado: z.enum(["PENDIENTE", "VALIDO", "ACTIVO", "INVALIDO", "ERROR"]),
  condicionDomicilio: z.string().nullable(),
  ultimaValidacionAt: z.string().nullable(),
});

export const clienteListItemSchema = z.object({
  id: z.string().uuid(),
  tipo: z.nativeEnum(TipoCliente),
  nombre: z.string().nullable(),
  apellido: z.string().nullable(),
  dni: z.string().nullable(),
  razonSocial: z.string().nullable(),
  ruc: z.string().nullable(),
  email: z.string().nullable(),
  telefono: z.string().nullable(),
  celular: z.string().nullable(),
  direccion: z.string().nullable(),
  distrito: z.string().nullable(),
  provincia: z.string().nullable(),
  departamento: z.string().nullable(),
  referencia: z.string().nullable(),
  notas: z.string().nullable(),
  latitud: z.number().nullable(),
  longitud: z.number().nullable(),
  esGenerico: z.boolean().optional(),
  validacionesSunat: z.array(clienteValidacionDocumentoSchema).optional(),
  activo: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const proveedorListItemSchema = z.object({
  id: z.string().uuid(),
  razonSocial: z.string(),
  ruc: z.string(),
  email: z.string().nullable(),
  telefono: z.string().nullable(),
  direccion: z.string().nullable(),
  contactoNombre: z.string().nullable(),
  contactoTelefono: z.string().nullable(),
  notas: z.string().nullable(),
  activo: z.boolean(),
});

export const productoListItemSchema = z.object({
  id: z.string().uuid(),
  sku: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  tipo: z.nativeEnum(TipoProducto),
  modeloId: z.string().uuid().nullable(),
  modelo: z.string().nullable(),
  codigoBarras: z.string().nullable(),
  codigoQr: z.string().nullable(),
  condicion: z.nativeEnum(CondicionProducto).nullable(),
  unidadMedida: z.object({
    id: z.string().uuid(),
    codigo: z.string(),
    nombre: z.string(),
  }),
  precioCompra: z.number(),
  precioVenta: z.number(),
  precioMinimo: z.number(),
  stockMinimo: z.number().int(),
  stockActual: z.number().int(),
  manejaInventario: z.boolean(),
  tieneNumeroSerie: z.boolean(),
  esConsumible: z.boolean(),
  requiereRepuestos: z.boolean(),
  tiempoEstimadoMin: z.number().int().nullable(),
  mesesGarantia: z.number().int().min(0),
  garantiaMaxCopias: z.number().int().min(0).nullable(),
  imagen: z.string().nullable(),
  imagenes: z
    .array(
      z.object({
        id: z.string().uuid(),
        url: z.string(),
        nombre: z.string().nullable(),
        tipo: z.string().nullable(),
        tamano: z.number().int().nullable(),
        esPrincipal: z.boolean(),
        orden: z.number().int(),
      }),
    )
    .optional(),
  activo: z.boolean(),
  categoria: z.object({
    id: z.string().uuid(),
    nombre: z.string(),
    tipo: z.nativeEnum(TipoProducto),
    padreId: z.string().uuid().nullable().optional(),
  }),
  marca: z
    .object({
      id: z.string().uuid(),
      nombre: z.string(),
    })
    .nullable(),
  modeloCatalogo: z
    .object({
      id: z.string().uuid(),
      nombre: z.string(),
      tipo: z.nativeEnum(TipoProducto),
      marca: z
        .object({
          id: z.string().uuid(),
          nombre: z.string(),
        })
        .nullable(),
    })
    .nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const unidadMedidaFormSchema = z.object({
  codigo: requiredTextField("El código es obligatorio").max(
    16,
    "El código es demasiado largo",
  ).transform((value) => value.toUpperCase()).refine(isSunatUnidadMedidaCode, {
    message: `Código de unidad no válido para SUNAT/UBL. ${sunatUnidadMedidaHelpText()}`,
  }),
  nombre: requiredTextField("El nombre es obligatorio").max(
    80,
    "El nombre es demasiado largo",
  ),
  descripcion: z
    .string()
    .max(160, "La descripción es demasiado larga")
    .optional(),
  activo: z.boolean().optional(),
});

export const modeloCatalogoFormSchema = z.object({
  nombre: requiredTextField("El nombre es obligatorio").max(
    120,
    "El nombre es demasiado largo",
  ),
  descripcion: z
    .string()
    .max(240, "La descripción es demasiado larga")
    .optional(),
  tipo: z.nativeEnum(TipoProducto),
  marcaId: z.string().uuid().nullable().optional(),
  activo: z.boolean().optional(),
});

export const unidadMedidaListItemSchema = z.object({
  id: z.string().uuid(),
  codigo: z.string(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  activo: z.boolean(),
});

export const modeloCatalogoListItemSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string(),
  descripcion: z.string().nullable(),
  tipo: z.nativeEnum(TipoProducto),
  activo: z.boolean(),
  marca: z
    .object({
      id: z.string().uuid(),
      nombre: z.string(),
    })
    .nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const paginatedMetaSchema = apiMetaSchema.extend({
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
});

export const clientesPaginatedResponseSchema = z.object({
  data: z.array(clienteListItemSchema),
  meta: paginatedMetaSchema,
});

export const proveedoresPaginatedResponseSchema = z.object({
  data: z.array(proveedorListItemSchema),
  meta: paginatedMetaSchema,
});

export const productosPaginatedResponseSchema = z.object({
  data: z.array(productoListItemSchema),
  meta: paginatedMetaSchema,
});
