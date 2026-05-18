"use client";

import { type CSSProperties, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  AlertTriangle,
  CalendarDays,
  FileText,
  KeyRound,
  Landmark,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  ScrollText,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  AmbienteSunat,
  EstadoComprobante,
  NivelValidacion,
  REGLAS_CONFIGURABLES_DEFAULTS,
  REGLAS_CONFIGURABLES_LABELS,
  ReglaConfigurableId,
  RolUsuario,
  TipoCliente,
  TipoDocumento,
  type ClienteListItem,
  type EstadoValidacionSunat,
  type FormatoImpresionDocumento,
  type NivelValidacion as NivelValidacionValue,
} from "@erp/shared";

import { useAuth } from "@/hooks/use-auth";
import { useClientes } from "@/hooks/use-clientes";
import { useConfigEmpresa } from "@/hooks/use-configuracion";
import {
  useActivateCertificadoDigital,
  useCertificadosDigitales,
  useClienteValidacionesSunat,
  useComprobanteEnvioLogs,
  useComprobanteEnvios,
  useComprobantes,
  useConfigFiscal,
  useCreateClienteValidacionSunat,
  useCreateFeriadoNacional,
  useCreateSerieDocumento,
  useDeleteCertificadoDigital,
  useDeleteFeriadoNacional,
  useDeleteClienteValidacionSunat,
  useDeleteSerieDocumento,
  useFeriadosNacionales,
  useRevokeCertificadoDigital,
  useSeriesDocumento,
  useSunatCredentialsStatus,
  useSunatDirectStatus,
  useSyncLegacySeriesDocumento,
  useUpdateClienteValidacionSunat,
  useUpdateConfigFiscal,
  useUpdateFeriadoNacional,
  useUpdateSunatCredentials,
  useUpdateSerieDocumento,
  useUploadCertificadoDigital,
  type CertificadoDigitalItem,
  type ClienteValidacionSunatItem,
  type ComprobanteEnvioLogItem,
  type ConfigEmpresaFiscalItem,
  type CreateClienteValidacionSunatPayload,
  type FeriadoNacionalItem,
  type CreateSerieDocumentoPayload,
  type SerieDocumentoItem,
  type UpdateClienteValidacionSunatPayload,
  type UpdateConfigEmpresaFiscalPayload,
  type UpdateFeriadoNacionalPayload,
  type UpdateSerieDocumentoPayload,
} from "@/hooks/use-facturacion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "@/components/searchable-select";
import {
  SettingsDataTable,
  SettingsStatCard,
  type ColumnDef,
} from "@/components/settings/settings-data-table";
import { cn } from "@/lib/utils";

const TIPO_DOCUMENTO_OPTIONS = [
  { value: TipoDocumento.FACTURA, label: "Factura" },
  { value: TipoDocumento.BOLETA, label: "Boleta" },
  { value: TipoDocumento.NOTA_CREDITO, label: "Nota de crédito" },
  { value: TipoDocumento.NOTA_DEBITO, label: "Nota de débito" },
] as const;

const FORMATO_IMPRESION_OPTIONS: Array<{
  value: FormatoImpresionDocumento;
  label: string;
}> = [
  { value: "A4", label: "A4" },
  { value: "TICKET", label: "Ticket" },
  { value: "AMBOS", label: "A4 y ticket" },
];

const AMBIENTE_SUNAT_OPTIONS = [
  { value: AmbienteSunat.BETA, label: "Beta / pruebas" },
  { value: AmbienteSunat.PRODUCCION, label: "Producción" },
] as const;

const SERIE_DOCUMENTO_RULES: Record<
  TipoDocumento,
  { defaultSerie: string; pattern: RegExp; helper: string; placeholder: string }
> = {
  [TipoDocumento.FACTURA]: {
    defaultSerie: "F001",
    pattern: /^F\d{3}$/,
    helper: "Facturas usan F + 3 dígitos, por ejemplo F001.",
    placeholder: "F001",
  },
  [TipoDocumento.BOLETA]: {
    defaultSerie: "B001",
    pattern: /^B\d{3}$/,
    helper: "Boletas usan B + 3 dígitos, por ejemplo B001.",
    placeholder: "B001",
  },
  [TipoDocumento.NOTA_CREDITO]: {
    defaultSerie: "FC01",
    pattern: /^(FC|BC)\d{2}$/,
    helper:
      "Notas de crédito usan FC/BC + 2 dígitos; FC si corrigen factura, BC si corrigen boleta.",
    placeholder: "FC01",
  },
  [TipoDocumento.NOTA_DEBITO]: {
    defaultSerie: "FD01",
    pattern: /^(FD|BD)\d{2}$/,
    helper:
      "Notas de débito usan FD/BD + 2 dígitos; FD si cargan factura, BD si cargan boleta.",
    placeholder: "FD01",
  },
};

const DOCUMENTO_SUNAT_CLIENTE_CODES = ["6", "1", "0"] as const;
type DocumentoSunatClienteCode = (typeof DOCUMENTO_SUNAT_CLIENTE_CODES)[number];

const DOCUMENTO_SUNAT_OPTIONS: Array<{
  value: DocumentoSunatClienteCode;
  label: string;
  helper: string;
  placeholder: string;
  maxLength: number;
}> = [
  {
    value: "6",
    label: "RUC",
    helper:
      "Documento soportado para clientes empresa o persona natural con RUC. Debe tener 11 dígitos y empezar con 10 o 20.",
    placeholder: "20123456789",
    maxLength: 11,
  },
  {
    value: "1",
    label: "DNI",
    helper:
      "Documento soportado para cliente natural peruano. Debe tener exactamente 8 dígitos y no puede ser 00000000.",
    placeholder: "12345678",
    maxLength: 8,
  },
  {
    value: "0",
    label: "Sin documento / público general",
    helper:
      "Caso soportado para cliente genérico o ventas sin identificación. Se guarda como 00000000 y no se consulta domicilio.",
    placeholder: "00000000",
    maxLength: 8,
  },
];

const CONDICION_DOMICILIO_OPTIONS = [
  { value: "HABIDO", label: "Habido" },
  { value: "NO HABIDO", label: "No habido" },
  { value: "NO APLICABLE", label: "No aplica / sin consulta" },
] as const;

const LOG_EVENT_OPTIONS = [
  { value: "ENVIO_INICIADO", label: "Envío iniciado" },
  { value: "RESPUESTA_SUNAT", label: "Respuesta SUNAT" },
  { value: "RESPUESTA_DEV", label: "Respuesta desarrollo" },
  { value: "CONSULTA_CDR_SUNAT", label: "Consulta CDR SUNAT" },
  { value: "RESPUESTA_NOTA_CREDITO_SUNAT", label: "Respuesta nota crédito" },
  { value: "RESPUESTA_NOTA_DEBITO_SUNAT", label: "Respuesta nota débito" },
  { value: "ERROR_ENVIO", label: "Error de envío" },
] as const;

const LOG_ESTADO_OPTIONS = [
  EstadoComprobante.PENDIENTE_ENVIO,
  EstadoComprobante.EN_PROCESO_SUNAT,
  EstadoComprobante.ACEPTADO,
  EstadoComprobante.ACEPTADO_CON_OBSERVACIONES,
  EstadoComprobante.RECHAZADO,
  EstadoComprobante.BAJA_PENDIENTE,
  EstadoComprobante.ANULADO,
] as const;

const DEFAULT_CODIGO_ESTABLECIMIENTO = "0000";
const SINGLE_SITE_FISCAL_HELP =
  "Identifica el establecimiento SUNAT del emisor fiscal; normalmente 0000.";
const SECRET_INPUT_STYLE = {
  WebkitTextSecurity: "disc",
} as CSSProperties;

const ESTADO_VALIDACION_OPTIONS: Array<{
  value: EstadoValidacionSunat;
  label: string;
}> = [
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "VALIDO", label: "Válido" },
  { value: "INVALIDO", label: "Inválido" },
  { value: "ERROR", label: "Error" },
];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function optionalFormText(value?: string | null) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : undefined;
}

function documentoLabel(tipo: TipoDocumento) {
  return (
    TIPO_DOCUMENTO_OPTIONS.find((option) => option.value === tipo)?.label ??
    tipo
  );
}

function isDocumentoSunatClienteCode(
  value?: string | null,
): value is DocumentoSunatClienteCode {
  return DOCUMENTO_SUNAT_CLIENTE_CODES.includes(
    value as DocumentoSunatClienteCode,
  );
}

function documentoSunatLabel(code?: string | null) {
  if (!code) return "Sin tipo";
  const option = DOCUMENTO_SUNAT_OPTIONS.find((item) => item.value === code);
  if (option) return `${option.label} (${option.value})`;

  return `Código SUNAT ${code} · no soportado en clientes`;
}

function validateNumeroDocumentoSunat(
  tipo: DocumentoSunatClienteCode,
  numeroDocumento: string,
) {
  if (tipo === "6") return /^(10|20)\d{9}$/.test(numeroDocumento);
  if (tipo === "1")
    return /^\d{8}$/.test(numeroDocumento) && numeroDocumento !== "00000000";
  return numeroDocumento === "00000000";
}

function sanitizeDocumentoNumber(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function logEventLabel(value?: string | null) {
  if (!value) return "Sin evento";
  return (
    LOG_EVENT_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
}

function logEstadoLabel(value?: string | null) {
  if (!value) return "Sin estado";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function clienteOptionLabel(cliente: ClienteListItem) {
  const nombre =
    cliente.tipo === TipoCliente.EMPRESA
      ? cliente.razonSocial || "Empresa sin razón social"
      : [cliente.nombre, cliente.apellido].filter(Boolean).join(" ") ||
        "Cliente sin nombre";
  const documento = cliente.ruc
    ? `RUC ${cliente.ruc}`
    : cliente.dni
      ? `DNI ${cliente.dni}`
      : "Sin documento";

  return `${nombre} · ${documento}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function estadoValidacionMeta(estado: EstadoValidacionSunat) {
  if (estado === "VALIDO") {
    return {
      label: "Válido",
      className:
        "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
  }
  if (estado === "INVALIDO") {
    return {
      label: "Inválido",
      className: "border-destructive/30 bg-destructive/10 text-destructive",
    };
  }
  if (estado === "ERROR") {
    return {
      label: "Error",
      className:
        "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    };
  }

  return {
    label: "Pendiente",
    className: "border-border bg-muted/40 text-muted-foreground",
  };
}

function clienteDisplayName(item: ClienteValidacionSunatItem) {
  if (!item.cliente) return "Sin cliente vinculado";
  if (item.cliente.razonSocial) return item.cliente.razonSocial;
  return (
    [item.cliente.nombre, item.cliente.apellido].filter(Boolean).join(" ") ||
    "Cliente vinculado"
  );
}

function FiscalForbidden() {
  return (
    <div className="flex min-h-90 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/70 bg-muted/10 p-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <div className="max-w-sm">
        <h2 className="text-base font-semibold text-foreground">
          Acceso restringido
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          La configuración tributaria solo está disponible para usuarios ADMIN.
        </p>
      </div>
    </div>
  );
}

type FiscalSettingsTab =
  | "config"
  | "series"
  | "certificado"
  | "credenciales-sol"
  | "reglas"
  | "validaciones"
  | "feriados"
  | "logs";

export function FiscalSettingsContent({
  initialTab = "config",
}: {
  initialTab?: FiscalSettingsTab;
} = {}) {
  const { hasRole } = useAuth();

  if (!hasRole(RolUsuario.ADMIN)) {
    return <FiscalForbidden />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Landmark className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Tributario
              </h2>
              <p className="text-xs text-muted-foreground">
                Administra emisor fiscal/SUNAT, series documentales,
                validaciones SUNAT y logs.
              </p>
            </div>
          </div>
        </div>
        <Badge variant="outline" className="w-fit rounded-lg">
          Solo ADMIN
        </Badge>
      </div>

      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          <p>
            Los certificados y credenciales SOL solo viajan al API de forma
            transitoria para cifrarse o referenciarse en backend. Nunca se
            exponen secretos guardados en el navegador.
          </p>
        </div>
      </div>

      <Tabs defaultValue={initialTab} className="min-h-0 flex-1">
        <TabsList className="grid w-full grid-cols-2 rounded-2xl lg:grid-cols-7">
          <TabsTrigger value="config">Datos fiscales</TabsTrigger>
          <TabsTrigger value="series">Series</TabsTrigger>
          <TabsTrigger value="certificado">Certificado</TabsTrigger>
          <TabsTrigger value="credenciales-sol">SOL</TabsTrigger>
          <TabsTrigger value="reglas">Reglas</TabsTrigger>
          <TabsTrigger value="feriados">Feriados</TabsTrigger>
          <TabsTrigger value="validaciones">Padrón</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-4 min-h-0">
          <ConfigFiscalSection />
        </TabsContent>
        <TabsContent value="series" className="mt-4 min-h-0">
          <SeriesDocumentoSection />
        </TabsContent>
        <TabsContent value="certificado" className="mt-4 min-h-0">
          <CertificadosDigitalesSection />
        </TabsContent>
        <TabsContent value="credenciales-sol" className="mt-4 min-h-0">
          <CertificadosDigitalesSection initialPanel="credenciales" />
        </TabsContent>
        <TabsContent value="reglas" className="mt-4 min-h-0">
          <ReglasValidacionSection />
        </TabsContent>
        <TabsContent value="feriados" className="mt-4 min-h-0">
          <FeriadosNacionalesSection />
        </TabsContent>
        <TabsContent value="validaciones" className="mt-4 min-h-0">
          <ClienteValidacionesSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const configFiscalSchema = z.object({
  ruc: z
    .string()
    .trim()
    .regex(/^\d{11}$/, "El RUC debe tener 11 dígitos"),
  razonSocial: z
    .string()
    .trim()
    .min(1, "La razón social fiscal es obligatoria"),
  nombreComercial: z
    .string()
    .trim()
    .max(160, "Máximo 160 caracteres")
    .optional(),
  direccionFiscal: z
    .string()
    .trim()
    .min(1, "La dirección fiscal es obligatoria"),
  ubigeoFiscal: z
    .string()
    .trim()
    .refine(
      (value) => !value || /^\d{6}$/.test(value),
      "El ubigeo debe tener 6 dígitos",
    ),
  codigoEstablecimiento: z
    .string()
    .trim()
    .refine(
      (value) => !value || /^\d{4}$/.test(value),
      "El código debe tener 4 dígitos",
    ),
  correoSee: z
    .string()
    .trim()
    .refine(
      (value) => !value || EMAIL_PATTERN.test(value),
      "Ingresa un correo válido",
    ),
  regimenTributario: z
    .string()
    .trim()
    .max(120, "Máximo 120 caracteres")
    .optional(),
  formatoImpresionDefault: z.enum(["", "A4", "TICKET", "AMBOS"]),
  ambienteDefault: z.nativeEnum(AmbienteSunat),
  pieImpresion: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
});

type ConfigFiscalForm = z.infer<typeof configFiscalSchema>;

type ConfigFiscalSource = ConfigEmpresaFiscalItem | null | undefined;

function toConfigFiscalForm(config: ConfigFiscalSource): ConfigFiscalForm {
  return {
    ruc: config?.ruc ?? "",
    razonSocial: config?.razonSocial ?? "",
    nombreComercial: config?.nombreComercial ?? "",
    direccionFiscal: config?.direccionFiscal ?? "",
    ubigeoFiscal: config?.ubigeoFiscal ?? "",
    codigoEstablecimiento:
      config?.codigoEstablecimiento ?? DEFAULT_CODIGO_ESTABLECIMIENTO,
    correoSee: config?.correoSee ?? "",
    regimenTributario: config?.regimenTributario ?? "",
    formatoImpresionDefault: config?.formatoImpresionDefault ?? "",
    ambienteDefault: config?.ambienteDefault ?? AmbienteSunat.BETA,
    pieImpresion: config?.pieImpresion ?? "",
  };
}

function buildConfigFiscalPayload(values: ConfigFiscalForm) {
  const payload: UpdateConfigEmpresaFiscalPayload = {
    ruc: values.ruc.trim(),
    razonSocial: values.razonSocial.trim(),
    direccionFiscal: values.direccionFiscal.trim(),
  };

  const optionalFields: Array<keyof UpdateConfigEmpresaFiscalPayload> = [
    "nombreComercial",
    "ubigeoFiscal",
    "codigoEstablecimiento",
    "correoSee",
    "regimenTributario",
    "pieImpresion",
  ];

  optionalFields.forEach((field) => {
    const value = optionalFormText(
      values[field as keyof ConfigFiscalForm] as string | undefined,
    );
    if (value) {
      payload[field] = value as never;
    }
  });

  if (values.formatoImpresionDefault) {
    payload.formatoImpresionDefault =
      values.formatoImpresionDefault as FormatoImpresionDocumento;
  }

  payload.ambienteDefault = values.ambienteDefault;

  return payload;
}

function ConfigFiscalSection() {
  const { data, isLoading } = useConfigFiscal();
  const { data: empresaData } = useConfigEmpresa();
  const updateMutation = useUpdateConfigFiscal();
  const config = data?.data ?? null;
  const empresa = empresaData?.data ?? null;
  const formValues = useMemo(() => toConfigFiscalForm(config), [config]);

  const form = useForm<ConfigFiscalForm>({
    resolver: zodResolver(configFiscalSchema),
    values: formValues,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = form;

  const formato = watch("formatoImpresionDefault");
  const ambienteDefault = watch("ambienteDefault");

  const copyEmpresaToFiscal = () => {
    if (!empresa) {
      toast.error("Primero guarda los datos de Empresa");
      return;
    }

    if (empresa.ruc) {
      setValue("ruc", empresa.ruc, { shouldDirty: true, shouldValidate: true });
    }
    if (empresa.razonSocial) {
      setValue("razonSocial", empresa.razonSocial, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    if (empresa.nombreComercial) {
      setValue("nombreComercial", empresa.nombreComercial, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    if (empresa.direccion) {
      setValue("direccionFiscal", empresa.direccion, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    toast.success("Datos visibles copiados al formulario fiscal");
  };

  const onSubmit = (values: ConfigFiscalForm) => {
    updateMutation.mutate(buildConfigFiscalPayload(values), {
      onSuccess: (response) => {
        reset(toConfigFiscalForm(response.data));
        toast.success("Configuración fiscal actualizada");
      },
      onError: (error: Error) =>
        toast.error(
          error.message || "No se pudo guardar la configuración fiscal",
        ),
    });
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/60 p-4 text-sm text-muted-foreground">
        Cargando configuración fiscal...
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      <div className="rounded-2xl border border-border/60 bg-card/50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Landmark className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">
              Configuración fiscal no sensible
            </h3>
            <p className="text-xs text-muted-foreground">
              Esta es la fuente para el emisor de comprobantes y SUNAT. Puede
              coincidir con Empresa, pero aquí manda la dirección fiscal,
              ubigeo, establecimiento y ambiente de emisión.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-xl"
            onClick={copyEmpresaToFiscal}
          >
            Copiar desde Empresa
          </Button>
        </div>

        <div className="mt-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-xs text-blue-900 dark:text-blue-100">
          Si cambias RUC o razón social en Empresa, no se replica solo aquí para
          evitar modificar el emisor fiscal por accidente. Usa el botón de copia
          y luego guarda esta sección.
        </div>

        <FieldGroup className="mt-4 grid gap-3 lg:grid-cols-2">
          <Field data-invalid={errors.ruc ? true : undefined}>
            <FieldLabel>RUC fiscal</FieldLabel>
            <Input
              placeholder="20123456789"
              maxLength={11}
              {...register("ruc")}
            />
            <FieldError>{errors.ruc?.message}</FieldError>
          </Field>

          <Field data-invalid={errors.razonSocial ? true : undefined}>
            <FieldLabel>Razón social fiscal</FieldLabel>
            <Input
              placeholder="Empresa Demo SAC"
              {...register("razonSocial")}
            />
            <FieldError>{errors.razonSocial?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel>Nombre comercial fiscal</FieldLabel>
            <Input placeholder="Opcional" {...register("nombreComercial")} />
          </Field>

          <Field data-invalid={errors.direccionFiscal ? true : undefined}>
            <FieldLabel>Dirección fiscal</FieldLabel>
            <Input
              placeholder="Av. Fiscal 123"
              {...register("direccionFiscal")}
            />
            <FieldError>{errors.direccionFiscal?.message}</FieldError>
          </Field>

          <Field data-invalid={errors.ubigeoFiscal ? true : undefined}>
            <FieldLabel>Ubigeo fiscal</FieldLabel>
            <Input
              placeholder="150101"
              maxLength={6}
              {...register("ubigeoFiscal")}
            />
            <FieldError>{errors.ubigeoFiscal?.message}</FieldError>
          </Field>

          <Field data-invalid={errors.codigoEstablecimiento ? true : undefined}>
            <FieldLabel>Código de establecimiento SUNAT</FieldLabel>
            <Input
              placeholder={DEFAULT_CODIGO_ESTABLECIMIENTO}
              maxLength={4}
              {...register("codigoEstablecimiento")}
            />
            <p className="text-[11px] text-muted-foreground">
              {SINGLE_SITE_FISCAL_HELP}
            </p>
            <FieldError>{errors.codigoEstablecimiento?.message}</FieldError>
          </Field>

          <Field data-invalid={errors.correoSee ? true : undefined}>
            <FieldLabel>Correo SEE</FieldLabel>
            <Input
              placeholder="facturacion@empresa.com"
              {...register("correoSee")}
            />
            <FieldError>{errors.correoSee?.message}</FieldError>
          </Field>

          <Field>
            <FieldLabel>Régimen tributario</FieldLabel>
            <Input
              placeholder="MYPE Tributario"
              {...register("regimenTributario")}
            />
          </Field>

          <Field>
            <FieldLabel>Formato de impresión por defecto</FieldLabel>
            <Select
              value={formato || "__none"}
              onValueChange={(value) =>
                setValue(
                  "formatoImpresionDefault",
                  value === "__none"
                    ? ""
                    : (value as ConfigFiscalForm["formatoImpresionDefault"]),
                  { shouldDirty: true, shouldValidate: true },
                )
              }
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Sin definir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Sin definir</SelectItem>
                {FORMATO_IMPRESION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>Ambiente SUNAT por defecto</FieldLabel>
            <Select
              value={ambienteDefault}
              onValueChange={(value) =>
                setValue("ambienteDefault", value as AmbienteSunat, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AMBIENTE_SUNAT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>

        <Field className="mt-3">
          <FieldLabel>Pie de impresión</FieldLabel>
          <Textarea
            placeholder="Texto opcional para documentos impresos."
            className="min-h-24 rounded-xl"
            {...register("pieImpresion")}
          />
        </Field>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={updateMutation.isPending || !isDirty}
          className="rounded-xl"
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar configuración fiscal"
          )}
        </Button>
      </div>
    </form>
  );
}

const serieDocumentoSchema = z
  .object({
    tipo: z.nativeEnum(TipoDocumento),
    serie: z
      .string()
      .trim()
      .regex(
        /^[A-Za-z0-9]{4}$/,
        "La serie debe tener 4 caracteres alfanuméricos",
      ),
    correlativoActual: z
      .number()
      .int()
      .min(0, "El correlativo no puede ser negativo"),
    ambiente: z.nativeEnum(AmbienteSunat),
    codigoEstablecimiento: z
      .string()
      .trim()
      .refine(
        (value) => !value || /^\d{4}$/.test(value),
        "El código debe tener 4 dígitos",
      ),
    descripcion: z.string().trim().max(160, "Máximo 160 caracteres").optional(),
    activo: z.boolean(),
  })
  .superRefine((values, ctx) => {
    const serie = values.serie.trim().toUpperCase();
    const rule = SERIE_DOCUMENTO_RULES[values.tipo];
    if (!rule.pattern.test(serie)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["serie"],
        message: rule.helper,
      });
    }
  });

type SerieDocumentoForm = z.infer<typeof serieDocumentoSchema>;

function toSerieForm(item?: SerieDocumentoItem | null): SerieDocumentoForm {
  return {
    tipo: item?.tipo ?? TipoDocumento.FACTURA,
    serie:
      item?.serie ?? SERIE_DOCUMENTO_RULES[TipoDocumento.FACTURA].defaultSerie,
    correlativoActual: item?.correlativoActual ?? 0,
    ambiente: item?.ambiente ?? AmbienteSunat.BETA,
    codigoEstablecimiento:
      item?.codigoEstablecimiento ?? DEFAULT_CODIGO_ESTABLECIMIENTO,
    descripcion: item?.descripcion ?? "",
    activo: item?.activo ?? true,
  };
}

function buildSeriePayload(
  values: SerieDocumentoForm,
): CreateSerieDocumentoPayload {
  return {
    tipo: values.tipo,
    serie: values.serie.trim().toUpperCase(),
    correlativoActual: values.correlativoActual,
    ambiente: values.ambiente,
    codigoEstablecimiento:
      optionalFormText(values.codigoEstablecimiento) ??
      DEFAULT_CODIGO_ESTABLECIMIENTO,
    descripcion: optionalFormText(values.descripcion),
    activo: values.activo,
  };
}

function SeriesDocumentoSection() {
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState<TipoDocumento | "ALL">("ALL");
  const [ambienteFilter, setAmbienteFilter] = useState<AmbienteSunat | "ALL">(
    "ALL",
  );
  const [activoFilter, setActivoFilter] = useState<"ALL" | "true" | "false">(
    "ALL",
  );
  const [showCreate, setShowCreate] = useState(false);
  const [editingItem, setEditingItem] = useState<SerieDocumentoItem | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<SerieDocumentoItem | null>(
    null,
  );

  const filters = useMemo(
    () => ({
      page: 1,
      limit: 100,
      search: optionalFormText(search),
      tipo: tipoFilter === "ALL" ? undefined : tipoFilter,
      ambiente: ambienteFilter === "ALL" ? undefined : ambienteFilter,
      activo: activoFilter === "ALL" ? undefined : activoFilter === "true",
    }),
    [activoFilter, ambienteFilter, search, tipoFilter],
  );

  const { data, isLoading } = useSeriesDocumento(filters);
  const syncMutation = useSyncLegacySeriesDocumento();
  const deleteMutation = useDeleteSerieDocumento();
  const series = data?.data ?? [];

  const columns = useMemo<ColumnDef<SerieDocumentoItem, unknown>[]>(
    () => [
      {
        accessorKey: "tipo",
        header: "Tipo",
        size: 170,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="size-4" />
            </div>
            <span className="truncate font-medium text-foreground">
              {documentoLabel(row.original.tipo)}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "serie",
        header: "Serie",
        size: 100,
        cell: ({ row }) => (
          <span className="font-mono text-sm font-semibold text-foreground">
            {row.original.serie}
          </span>
        ),
      },
      {
        accessorKey: "correlativoActual",
        header: "Correlativo",
        size: 120,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {String(row.original.correlativoActual).padStart(8, "0")}
          </span>
        ),
      },
      {
        accessorKey: "codigoEstablecimiento",
        header: "Estab. SUNAT",
        size: 100,
        cell: ({ row }) => row.original.codigoEstablecimiento,
      },
      {
        accessorKey: "ambiente",
        header: "Ambiente",
        size: 120,
        cell: ({ row }) => (
          <Badge variant="outline" className="text-[10px]">
            {row.original.ambiente === AmbienteSunat.PRODUCCION
              ? "Producción"
              : "Beta"}
          </Badge>
        ),
      },
      {
        accessorKey: "activo",
        header: "Estado",
        size: 110,
        cell: ({ row }) => (
          <Badge
            variant={row.original.activo ? "default" : "outline"}
            className="text-[10px]"
          >
            {row.original.activo ? "Activo" : "Inactivo"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Acciones",
        size: 90,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-xl text-muted-foreground hover:text-foreground"
                >
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">Acciones</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditingItem(row.original)}>
                  <Pencil className="size-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteTarget(row.original)}
                >
                  <Trash2 className="size-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [],
  );

  const handleSyncLegacy = () => {
    syncMutation.mutate(undefined, {
      onSuccess: (res) => {
        const summary = res.data;
        toast.success(
          `Series sincronizadas: ${summary.created} creadas, ${summary.restored} restauradas, ${summary.skipped} omitidas`,
        );
      },
      onError: (error: Error) =>
        toast.error(error.message || "No se pudieron sincronizar las series"),
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Serie documental desactivada");
        setDeleteTarget(null);
      },
      onError: (error: Error) =>
        toast.error(error.message || "No se pudo eliminar la serie"),
    });
  };

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">
              Series documentales fiscales
            </h3>
            <p className="text-xs text-muted-foreground">
              Configura series y correlativos para el establecimiento SUNAT del
              emisor. El código normalmente es 0000.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={handleSyncLegacy}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCcw className="size-4" />
              )}
              Importar existentes
            </Button>
            <Button
              size="sm"
              className="rounded-xl"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="size-4" />
              Nueva serie
            </Button>
          </div>
        </div>

        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_180px_180px_160px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por serie, código o descripción..."
              className="rounded-xl pl-9"
            />
          </div>
          <Select
            value={tipoFilter}
            onValueChange={(value) =>
              setTipoFilter(value as TipoDocumento | "ALL")
            }
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los tipos</SelectItem>
              {TIPO_DOCUMENTO_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={ambienteFilter}
            onValueChange={(value) =>
              setAmbienteFilter(value as AmbienteSunat | "ALL")
            }
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Ambiente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los ambientes</SelectItem>
              {AMBIENTE_SUNAT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={activoFilter}
            onValueChange={(value) =>
              setActivoFilter(value as "ALL" | "true" | "false")
            }
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="true">Activos</SelectItem>
              <SelectItem value="false">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <SettingsDataTable
          columns={columns}
          data={series}
          isLoading={isLoading}
          emptyMessage="Sin series documentales"
          emptyDescription="Crea una serie o sincroniza desde la configuración heredada."
          storageKey="settings:fiscal:series-documento:columns"
        />
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nueva serie documental</DialogTitle>
            <DialogDescription>
              Crea una serie fiscal por tipo de documento para el
              establecimiento SUNAT principal.
            </DialogDescription>
          </DialogHeader>
          <SerieDocumentoFormContent
            onCancel={() => setShowCreate(false)}
            onSuccess={() => setShowCreate(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
      >
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar serie documental</DialogTitle>
            <DialogDescription>
              Actualiza la serie, correlativo o estado del documento.
            </DialogDescription>
          </DialogHeader>
          {editingItem ? (
            <SerieDocumentoFormContent
              item={editingItem}
              onCancel={() => setEditingItem(null)}
              onSuccess={() => setEditingItem(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        title="¿Eliminar serie documental?"
        description={
          deleteTarget
            ? `Se desactivará la serie ${deleteTarget.serie} para ${documentoLabel(deleteTarget.tipo)}.`
            : undefined
        }
        isPending={deleteMutation.isPending}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}

function SerieDocumentoFormContent({
  item,
  onCancel,
  onSuccess,
}: {
  item?: SerieDocumentoItem;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const createMutation = useCreateSerieDocumento();
  const updateMutation = useUpdateSerieDocumento();
  const isEditing = !!item;

  const form = useForm<SerieDocumentoForm>({
    resolver: zodResolver(serieDocumentoSchema),
    defaultValues: toSerieForm(item),
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const tipo = watch("tipo");
  const ambiente = watch("ambiente");
  const activo = watch("activo");
  const serieRule = SERIE_DOCUMENTO_RULES[tipo];
  const isPending = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (values: SerieDocumentoForm) => {
    const payload = buildSeriePayload(values);
    const mutationOptions = {
      onSuccess: () => {
        toast.success(isEditing ? "Serie actualizada" : "Serie creada");
        onSuccess();
      },
      onError: (error: Error) =>
        toast.error(error.message || "No se pudo guardar la serie"),
    };

    if (item) {
      updateMutation.mutate(
        { id: item.id, data: payload as UpdateSerieDocumentoPayload },
        mutationOptions,
      );
      return;
    }

    createMutation.mutate(payload, mutationOptions);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      <FieldGroup className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel>Tipo de documento</FieldLabel>
          <Select
            value={tipo}
            onValueChange={(value) => {
              const nextTipo = value as TipoDocumento;
              setValue("tipo", nextTipo, {
                shouldDirty: true,
                shouldValidate: true,
              });
              if (!isEditing) {
                setValue("serie", SERIE_DOCUMENTO_RULES[nextTipo].defaultSerie, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }
            }}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPO_DOCUMENTO_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field data-invalid={errors.serie ? true : undefined}>
          <FieldLabel>Serie</FieldLabel>
          <Input
            placeholder={serieRule.placeholder}
            maxLength={4}
            className="uppercase"
            {...register("serie", {
              setValueAs: (value) => String(value).trim().toUpperCase(),
            })}
          />
          <p className="text-[11px] text-muted-foreground">
            {serieRule.helper}
          </p>
          <FieldError>{errors.serie?.message}</FieldError>
        </Field>

        <Field data-invalid={errors.correlativoActual ? true : undefined}>
          <FieldLabel>Correlativo actual</FieldLabel>
          <Input
            type="number"
            min={0}
            {...register("correlativoActual", { valueAsNumber: true })}
          />
          <FieldError>{errors.correlativoActual?.message}</FieldError>
        </Field>

        <Field>
          <FieldLabel>Ambiente</FieldLabel>
          <Select
            value={ambiente}
            onValueChange={(value) =>
              setValue("ambiente", value as AmbienteSunat, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AMBIENTE_SUNAT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field data-invalid={errors.codigoEstablecimiento ? true : undefined}>
          <FieldLabel>Código de establecimiento SUNAT</FieldLabel>
          <Input
            placeholder={DEFAULT_CODIGO_ESTABLECIMIENTO}
            maxLength={4}
            {...register("codigoEstablecimiento")}
          />
          <p className="text-[11px] text-muted-foreground">
            {SINGLE_SITE_FISCAL_HELP}
          </p>
          <FieldError>{errors.codigoEstablecimiento?.message}</FieldError>
        </Field>
      </FieldGroup>

      <Field>
        <FieldLabel>Descripción</FieldLabel>
        <Input
          placeholder="Migrada desde ConfigEmpresa"
          {...register("descripcion")}
        />
      </Field>

      <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">Serie activa</p>
          <p className="text-xs text-muted-foreground">
            Disponible para generación de correlativos.
          </p>
        </div>
        <Switch
          checked={activo}
          onCheckedChange={(checked) =>
            setValue("activo", checked, { shouldDirty: true })
          }
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending} className="rounded-xl">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isEditing ? "Guardar cambios" : "Crear serie"}
        </Button>
      </div>
    </form>
  );
}

function fingerprintPreview(value?: string | null) {
  if (!value) return "—";
  return value.length <= 16
    ? value
    : `${value.slice(0, 8)}...${value.slice(-8)}`;
}

function CertificadosDigitalesSection({
  initialPanel = "certificado",
}: {
  initialPanel?: "certificado" | "credenciales";
} = {}) {
  const showCredenciales = initialPanel === "credenciales";
  const showCertificado = initialPanel === "certificado";
  const { data: statusData, isLoading: statusLoading } = useSunatDirectStatus();
  const { data: configFiscalData, isLoading: configFiscalLoading } =
    useConfigFiscal();
  const { data: credentialsData, isLoading: credentialsLoading } =
    useSunatCredentialsStatus();
  const { data, isLoading } = useCertificadosDigitales({ page: 1, limit: 100 });
  const uploadMutation = useUploadCertificadoDigital();
  const credentialsMutation = useUpdateSunatCredentials();
  const activateMutation = useActivateCertificadoDigital();
  const revokeMutation = useRevokeCertificadoDigital();
  const deleteMutation = useDeleteCertificadoDigital();
  const [nombre, setNombre] = useState("Certificado principal");
  const [password, setPassword] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [certificateInputKey, setCertificateInputKey] = useState(0);
  const [credentialMode, setCredentialMode] = useState<
    "RUC_PLUS_SOL_USER" | "FULL_USERNAME"
  >("RUC_PLUS_SOL_USER");
  const [solUser, setSolUser] = useState("");
  const [solUsername, setSolUsername] = useState("");
  const [solPassword, setSolPassword] = useState("");
  const [revokeTarget, setRevokeTarget] =
    useState<CertificadoDigitalItem | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<CertificadoDigitalItem | null>(null);

  const certificados = data?.data ?? [];
  const status = statusData?.data;
  const credentialsStatus = credentialsData?.data ?? status?.credencialesSunat;
  const configFiscal = configFiscalData?.data ?? null;
  const hasFiscalIssuer = Boolean(
    configFiscal?.ruc &&
    configFiscal?.razonSocial &&
    configFiscal?.direccionFiscal,
  );
  const canUseRucPlusSolUser = Boolean(configFiscal?.ruc);
  const requiresFiscalRucForSolUser =
    !configFiscalLoading &&
    credentialMode === "RUC_PLUS_SOL_USER" &&
    !canUseRucPlusSolUser;

  const columns = useMemo<ColumnDef<CertificadoDigitalItem, unknown>[]>(
    () => [
      {
        accessorKey: "nombre",
        header: "Certificado",
        size: 240,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">
                {row.original.nombre}
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {fingerprintPreview(row.original.fingerprintSha256)}
              </p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "validoHasta",
        header: "Vigencia",
        size: 150,
        cell: ({ row }) => (
          <div className="text-xs text-muted-foreground">
            <p>
              {row.original.validoHasta
                ? formatDateTime(row.original.validoHasta)
                : "Sin metadata"}
            </p>
            <p className="text-[11px]">
              Cargado {formatDateTime(row.original.createdAt)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "activo",
        header: "Estado",
        size: 130,
        cell: ({ row }) => (
          <Badge
            variant={row.original.activo ? "default" : "outline"}
            className="text-[10px]"
          >
            {row.original.revokedAt
              ? "Revocado"
              : row.original.activo
                ? "Activo"
                : "Inactivo"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Acciones",
        size: 90,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-xl text-muted-foreground hover:text-foreground"
                >
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">Acciones</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled={
                    row.original.activo ||
                    !!row.original.revokedAt ||
                    activateMutation.isPending
                  }
                  onClick={() =>
                    activateMutation.mutate(row.original.id, {
                      onSuccess: () => toast.success("Certificado activado"),
                      onError: (error: Error) =>
                        toast.error(error.message || "No se pudo activar"),
                    })
                  }
                >
                  <ShieldCheck className="size-4" />
                  Activar
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!!row.original.revokedAt}
                  className="text-destructive focus:text-destructive"
                  onClick={() => setRevokeTarget(row.original)}
                >
                  <X className="size-4" />
                  Revocar
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteTarget(row.original)}
                >
                  <Trash2 className="size-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [activateMutation],
  );

  const handleUpload = () => {
    if (!file) {
      toast.error("Selecciona un archivo .p12 o .pfx");
      return;
    }
    uploadMutation.mutate(
      { file, nombre, password },
      {
        onSuccess: () => {
          toast.success("Certificado cargado, cifrado y activado");
          setPassword("");
          setFile(null);
          setCertificateInputKey((value) => value + 1);
        },
        onError: (error: Error) =>
          toast.error(error.message || "No se pudo cargar el certificado"),
      },
    );
  };

  const handleCredentialsSave = () => {
    const usingFullUsername = credentialMode === "FULL_USERNAME";
    const payload = {
      solUsername: usingFullUsername ? solUsername.trim() : undefined,
      solUser: usingFullUsername ? undefined : solUser.trim(),
      password: solPassword,
    };

    if (usingFullUsername && !payload.solUsername) {
      toast.error("Ingresa el usuario SOL completo");
      return;
    }
    if (!usingFullUsername && !canUseRucPlusSolUser) {
      toast.error(
        "Configura el RUC fiscal antes de usar el modo usuario SOL sin RUC",
      );
      return;
    }
    if (!usingFullUsername && !payload.solUser) {
      toast.error("Ingresa el usuario SOL sin RUC");
      return;
    }
    if (!payload.password.trim()) {
      toast.error("Ingresa la contraseña SOL");
      return;
    }

    credentialsMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Credenciales SOL guardadas cifradas");
        setSolUser("");
        setSolUsername("");
        setSolPassword("");
      },
      onError: (error: Error) =>
        toast.error(error.message || "No se pudieron guardar credenciales"),
    });
  };

  const handleRevoke = () => {
    if (!revokeTarget) return;
    revokeMutation.mutate(revokeTarget.id, {
      onSuccess: () => {
        toast.success("Certificado revocado");
        setRevokeTarget(null);
      },
      onError: (error: Error) =>
        toast.error(error.message || "No se pudo revocar"),
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Certificado eliminado");
        setDeleteTarget(null);
      },
      onError: (error: Error) =>
        toast.error(error.message || "No se pudo eliminar"),
    });
  };

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-3">
          <SettingsStatCard
            label="Ambiente default"
            value={statusLoading ? "..." : (status?.ambienteDefault ?? "BETA")}
            tone="muted"
          />
          <SettingsStatCard
            label="Emisor fiscal"
            value={
              configFiscalLoading
                ? "..."
                : hasFiscalIssuer
                  ? "Listo"
                  : "Pendiente"
            }
            tone={hasFiscalIssuer ? "active" : "muted"}
          />
          <SettingsStatCard
            label="Certificado activo"
            value={status?.tieneCertificadoActivo ? "Sí" : "No"}
            tone={status?.tieneCertificadoActivo ? "active" : "muted"}
          />
        </div>

        {!configFiscalLoading && !hasFiscalIssuer ? (
          <div className="flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-900 dark:text-amber-100">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              Antes de guardar credenciales SOL o cargar certificados, completa
              Tributario &gt; Configuración con RUC, razón social y dirección
              fiscal. El establecimiento SUNAT del emisor suele ser{" "}
              {DEFAULT_CODIGO_ESTABLECIMIENTO}.
            </p>
          </div>
        ) : null}

        {showCredenciales ? (
        <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <KeyRound className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-foreground">
                Credenciales SOL SUNAT
              </h3>
              <p className="text-xs text-muted-foreground">
                Guarda las credenciales SOL que SUNAT asignó al RUC. No se crean
                aquí: se cifran en backend para enviar comprobantes y consultar CDR.
                Las variables de entorno quedan como fallback temporal.
              </p>
            </div>
            <Badge
              variant={credentialsStatus?.configured ? "default" : "outline"}
              className="shrink-0 text-[10px]"
            >
              {credentialsLoading
                ? "Verificando"
                : credentialsStatus?.configured
                  ? credentialsStatus.source === "FISCAL_SECRET"
                    ? "Cifrado"
                    : "Desde env"
                  : "Pendiente"}
            </Badge>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Field>
              <FieldLabel>Modo de usuario</FieldLabel>
              <Select
                value={credentialMode}
                onValueChange={(value) =>
                  setCredentialMode(
                    value as "RUC_PLUS_SOL_USER" | "FULL_USERNAME",
                  )
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecciona modo" />
                </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RUC_PLUS_SOL_USER">
                    Usuario SOL sin RUC (recomendado)
                    </SelectItem>
                  <SelectItem value="FULL_USERNAME">
                    Usuario completo RUC + usuario
                  </SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>
                {credentialMode === "FULL_USERNAME"
                  ? "Usuario SOL completo"
                  : "Usuario SOL"}
              </FieldLabel>
              <Input
                value={
                  credentialMode === "FULL_USERNAME" ? solUsername : solUser
                }
                name="sunat-sol-user-no-login"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                onChange={(event) =>
                  credentialMode === "FULL_USERNAME"
                    ? setSolUsername(event.target.value)
                    : setSolUser(event.target.value)
                }
                placeholder={
                  credentialMode === "FULL_USERNAME"
                    ? "20123456789MODDATOS"
                    : "MODDATOS"
                }
              />
              <p className="text-[11px] text-muted-foreground">
                {credentialMode === "FULL_USERNAME"
                  ? "Pega el usuario completo tal como lo entrega SUNAT: RUC + usuario SOL."
                  : "Escribe solo el usuario SOL; el sistema antepone el RUC fiscal configurado."}
              </p>
              {credentialsStatus?.usernamePreview ? (
                <p className="text-[11px] text-muted-foreground">
                  Actual: {credentialsStatus.usernamePreview} ·{" "}
                  {credentialsStatus.source}
                </p>
              ) : null}
              {requiresFiscalRucForSolUser ? (
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  Configura el RUC fiscal en Tributario &gt; Configuración o usa
                  el modo de usuario completo.
                </p>
              ) : null}
            </Field>
            <Field>
              <FieldLabel>Contraseña SOL</FieldLabel>
              <Input
                type="text"
                name="sunat-sol-secret-no-login"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
                style={SECRET_INPUT_STYLE}
                value={solPassword}
                onChange={(event) => setSolPassword(event.target.value)}
                placeholder="Clave SOL de SUNAT"
              />
              <p className="text-[11px] text-muted-foreground">
                Es la clave SOL existente de SUNAT; no se genera ni se muestra luego.
              </p>
            </Field>
            <div className="flex items-end">
              <Button
                type="button"
                className="w-full rounded-xl"
                disabled={
                  credentialsMutation.isPending ||
                  !solPassword.trim() ||
                  requiresFiscalRucForSolUser
                }
                onClick={handleCredentialsSave}
              >
                {credentialsMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Guardar SOL
              </Button>
            </div>
          </div>
        </div>
        ) : null}

        {showCertificado ? (
        <>
        <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Cargar certificado digital
              </h3>
              <p className="text-xs text-muted-foreground">
                Sube el .p12/.pfx del certificado digital. Su contraseña es la
                clave real del archivo, no una nueva; al cargarlo se valida, cifra,
                guarda y activa automáticamente.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
            <Field>
              <FieldLabel>Nombre descriptivo</FieldLabel>
              <Input
                value={nombre}
                name="certificate-display-name"
                autoComplete="off"
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Certificado principal"
              />
            </Field>
            <Field>
              <FieldLabel>Archivo .p12/.pfx</FieldLabel>
              <Input
                key={certificateInputKey}
                type="file"
                accept=".p12,.pfx"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </Field>
            <Field>
              <FieldLabel>Contraseña del certificado</FieldLabel>
              <Input
                type="text"
                name="certificate-p12-secret"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
                style={SECRET_INPUT_STYLE}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Clave del .p12/.pfx"
              />
              <p className="text-[11px] text-muted-foreground">
                Debe ser la contraseña con la que se exportó el certificado.
              </p>
            </Field>
            <div className="flex items-end">
              <Button
                type="button"
                className="w-full rounded-xl"
                disabled={
                  uploadMutation.isPending || !password || !nombre.trim()
                }
                onClick={handleUpload}
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Cargar
              </Button>
            </div>
          </div>
        </div>

        <SettingsDataTable
          columns={columns}
          data={certificados}
          isLoading={isLoading || uploadMutation.isPending}
          emptyMessage="Sin certificados cargados"
          emptyDescription="Carga el certificado .p12/.pfx de la empresa; el nuevo certificado queda activo automáticamente."
          storageKey="settings:fiscal:certificados:columns"
        />
        </>
        ) : null}
      </div>

      {showCertificado ? (
        <>
          <DeleteConfirmDialog
            open={!!revokeTarget}
            title="¿Revocar certificado?"
            description={
              revokeTarget
                ? `Se marcará como revocado ${revokeTarget.nombre}. Quedará visible como historial, pero no podrá activarse.`
                : undefined
            }
            isPending={revokeMutation.isPending}
            onOpenChange={(open) => !open && setRevokeTarget(null)}
            onConfirm={handleRevoke}
          />
          <DeleteConfirmDialog
            open={!!deleteTarget}
            title="¿Eliminar certificado?"
            description={
              deleteTarget
                ? `Se ocultará ${deleteTarget.nombre} del listado y se quitará su archivo cifrado local.`
                : undefined
            }
            isPending={deleteMutation.isPending}
            onOpenChange={(open) => !open && setDeleteTarget(null)}
            onConfirm={handleDelete}
          />
        </>
      ) : null}
    </>
  );
}

const clienteValidacionSchema = z
  .object({
    clienteId: z
      .string()
      .trim()
      .refine(
        (value) => !value || UUID_PATTERN.test(value),
        "Debe ser un UUID válido",
      ),
    tipoDocumentoSunat: z.enum(DOCUMENTO_SUNAT_CLIENTE_CODES, {
      message: "Selecciona RUC o DNI",
    }),
    numeroDocumento: z.string().trim().min(1, "Indica el número de documento"),
    nombreNormalizado: z
      .string()
      .trim()
      .max(180, "Máximo 180 caracteres")
      .optional(),
    direccionFiscal: z
      .string()
      .trim()
      .max(220, "Máximo 220 caracteres")
      .optional(),
    estado: z.enum(["PENDIENTE", "VALIDO", "INVALIDO", "ERROR"]),
    condicionDomicilio: z
      .string()
      .trim()
      .max(80, "Máximo 80 caracteres")
      .optional(),
  })
  .superRefine((values, ctx) => {
    const numeroDocumento = values.numeroDocumento.trim();

    if (
      !validateNumeroDocumentoSunat(values.tipoDocumentoSunat, numeroDocumento)
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

type ClienteValidacionForm = z.infer<typeof clienteValidacionSchema>;

function toClienteValidacionForm(
  item?: ClienteValidacionSunatItem | null,
): ClienteValidacionForm {
  return {
    clienteId: item?.clienteId ?? "",
    tipoDocumentoSunat: isDocumentoSunatClienteCode(item?.tipoDocumentoSunat)
      ? item.tipoDocumentoSunat
      : "6",
    numeroDocumento: item?.numeroDocumento ?? "",
    nombreNormalizado: item?.nombreNormalizado ?? "",
    direccionFiscal: item?.direccionFiscal ?? "",
    estado: item?.estado ?? "PENDIENTE",
    condicionDomicilio: item?.condicionDomicilio ?? "",
  };
}

function buildClienteValidacionPayload(
  values: ClienteValidacionForm,
): CreateClienteValidacionSunatPayload {
  const payload: CreateClienteValidacionSunatPayload = {
    tipoDocumentoSunat: values.tipoDocumentoSunat,
    numeroDocumento: sanitizeDocumentoNumber(values.numeroDocumento),
    estado: values.estado as EstadoValidacionSunat,
  };

  const clienteId = optionalFormText(values.clienteId);
  const nombreNormalizado = optionalFormText(values.nombreNormalizado);
  const direccionFiscal = optionalFormText(values.direccionFiscal);
  const condicionDomicilio =
    values.tipoDocumentoSunat === "6"
      ? optionalFormText(values.condicionDomicilio)
      : undefined;

  if (clienteId) payload.clienteId = clienteId;
  if (nombreNormalizado) payload.nombreNormalizado = nombreNormalizado;
  if (direccionFiscal) payload.direccionFiscal = direccionFiscal;
  if (condicionDomicilio) payload.condicionDomicilio = condicionDomicilio;

  return payload;
}

function ClienteValidacionesSection() {
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<
    EstadoValidacionSunat | "ALL"
  >("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [editingItem, setEditingItem] =
    useState<ClienteValidacionSunatItem | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<ClienteValidacionSunatItem | null>(null);

  const filters = useMemo(
    () => ({
      page: 1,
      limit: 100,
      search: optionalFormText(search),
      estado: estadoFilter === "ALL" ? undefined : estadoFilter,
    }),
    [estadoFilter, search],
  );

  const { data, isLoading } = useClienteValidacionesSunat(filters);
  const deleteMutation = useDeleteClienteValidacionSunat();
  const validaciones = data?.data ?? [];

  const columns = useMemo<ColumnDef<ClienteValidacionSunatItem, unknown>[]>(
    () => [
      {
        accessorKey: "numeroDocumento",
        header: "Documento",
        size: 180,
        cell: ({ row }) => (
          <div>
            <p className="font-mono text-sm font-semibold text-foreground">
              {row.original.numeroDocumento}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {documentoSunatLabel(row.original.tipoDocumentoSunat)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "nombreNormalizado",
        header: "Nombre fiscal",
        size: 260,
        cell: ({ row }) => (
          <div className="max-w-65">
            <p className="truncate font-medium text-foreground">
              {row.original.nombreNormalizado || "Sin nombre normalizado"}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {clienteDisplayName(row.original)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "estado",
        header: "Estado",
        size: 130,
        cell: ({ row }) => {
          const meta = estadoValidacionMeta(
            row.original.estado as EstadoValidacionSunat,
          );
          return (
            <Badge
              variant="outline"
              className={cn("text-[10px]", meta.className)}
            >
              {meta.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: "ultimaValidacionAt",
        header: "Última validación",
        size: 150,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDateTime(row.original.ultimaValidacionAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Acciones",
        size: 90,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-xl text-muted-foreground hover:text-foreground"
                >
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">Acciones</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditingItem(row.original)}>
                  <Pencil className="size-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteTarget(row.original)}
                >
                  <Trash2 className="size-4" />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [],
  );

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Validación eliminada");
        setDeleteTarget(null);
      },
      onError: (error: Error) =>
        toast.error(error.message || "No se pudo eliminar la validación"),
    });
  };

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">
              Validaciones documentales de cliente
            </h3>
            <p className="text-xs text-muted-foreground">
              Administra resultados cacheados para documentos que Clientes
              soporta actualmente: RUC, DNI y público general sin documento.
              No se habilitan documentos de extranjeros en este ERP.
            </p>
          </div>
          <Button
            size="sm"
            className="rounded-xl"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="size-4" />
            Nueva validación
          </Button>
        </div>

        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_190px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por documento, nombre o dirección..."
              className="rounded-xl pl-9"
            />
          </div>
          <Select
            value={estadoFilter}
            onValueChange={(value) =>
              setEstadoFilter(value as EstadoValidacionSunat | "ALL")
            }
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos</SelectItem>
              {ESTADO_VALIDACION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <SettingsDataTable
          columns={columns}
          data={validaciones}
          isLoading={isLoading}
          emptyMessage="Sin validaciones documentales"
          emptyDescription="Crea registros manuales/cacheados para documentar estados de clientes."
          storageKey="settings:fiscal:cliente-validaciones:columns"
        />
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nueva validación documental</DialogTitle>
            <DialogDescription>
              Registra un resultado manual o cacheado para RUC, DNI o público
              general sin documento.
            </DialogDescription>
          </DialogHeader>
          <ClienteValidacionFormContent
            onCancel={() => setShowCreate(false)}
            onSuccess={() => setShowCreate(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
      >
        <DialogContent className="sm:max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>Editar validación documental</DialogTitle>
            <DialogDescription>
              Actualiza el estado cacheado del documento de cliente.
            </DialogDescription>
          </DialogHeader>
          {editingItem ? (
            <ClienteValidacionFormContent
              item={editingItem}
              onCancel={() => setEditingItem(null)}
              onSuccess={() => setEditingItem(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        title="¿Eliminar validación documental?"
        description={
          deleteTarget
            ? `Se eliminará la validación del documento ${deleteTarget.numeroDocumento}.`
            : undefined
        }
        isPending={deleteMutation.isPending}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}

function ClienteValidacionFormContent({
  item,
  onCancel,
  onSuccess,
}: {
  item?: ClienteValidacionSunatItem;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const createMutation = useCreateClienteValidacionSunat();
  const updateMutation = useUpdateClienteValidacionSunat();
  const { data: clientesData, isLoading: clientesLoading } = useClientes({
    page: 1,
    limit: 100,
    activo: true,
  });
  const isEditing = !!item;

  const form = useForm<ClienteValidacionForm>({
    resolver: zodResolver(clienteValidacionSchema),
    defaultValues: toClienteValidacionForm(item),
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const tipoDocumentoSunat = watch("tipoDocumentoSunat");
  const estado = watch("estado");
  const condicionDomicilio = watch("condicionDomicilio") || "__none";
  const clienteId = watch("clienteId") || "";
  const numeroDocumento = watch("numeroDocumento") || "";
  const clientes = useMemo(
    () => clientesData?.data ?? [],
    [clientesData?.data],
  );
  const clienteOptions = useMemo<SearchableSelectOption[]>(
    () =>
      clientes.map((cliente) => ({
        value: cliente.id,
        label: clienteOptionLabel(cliente),
      })),
    [clientes],
  );
  const documentoSunatInfo = DOCUMENTO_SUNAT_OPTIONS.find(
    (option) => option.value === tipoDocumentoSunat,
  );
  const isRucDocumento = tipoDocumentoSunat === "6";
  const isSinDocumento = tipoDocumentoSunat === "0";
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleTipoDocumentoChange = (value: string) => {
    const nextTipo = value as DocumentoSunatClienteCode;
    setValue("tipoDocumentoSunat", nextTipo, {
      shouldDirty: true,
      shouldValidate: true,
    });

    const sanitizedNumero = sanitizeDocumentoNumber(numeroDocumento);
    if (
      sanitizedNumero &&
      !validateNumeroDocumentoSunat(nextTipo, sanitizedNumero)
    ) {
      setValue("numeroDocumento", "", {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    if (nextTipo === "0") {
      setValue("numeroDocumento", "00000000", {
        shouldDirty: true,
        shouldValidate: true,
      });
    }

    if (nextTipo !== "6") {
      setValue("condicionDomicilio", "", {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  const handleClienteChange = (value: string) => {
    setValue("clienteId", value, { shouldDirty: true, shouldValidate: true });
    const cliente = clientes.find((item) => item.id === value);
    if (!cliente) return;

    const isClienteGenerico =
      Boolean(cliente.esGenerico) ||
      (!cliente.ruc && cliente.dni === "00000000");
    const isEmpresa =
      !isClienteGenerico &&
      (cliente.tipo === TipoCliente.EMPRESA || Boolean(cliente.ruc));
    const nextTipo: DocumentoSunatClienteCode = isClienteGenerico
      ? "0"
      : isEmpresa
        ? "6"
        : "1";
    const numeroDocumento = isClienteGenerico
      ? "00000000"
      : (cliente.ruc ?? cliente.dni ?? "");
    const nombreNormalizado = isEmpresa
      ? (cliente.razonSocial ?? "")
      : [cliente.nombre, cliente.apellido].filter(Boolean).join(" ");

    setValue("tipoDocumentoSunat", nextTipo, {
      shouldDirty: true,
      shouldValidate: true,
    });
    if (numeroDocumento) {
      setValue("numeroDocumento", numeroDocumento, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    if (nextTipo !== "6") {
      setValue("condicionDomicilio", "", {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    if (nombreNormalizado) {
      setValue("nombreNormalizado", nombreNormalizado.toUpperCase(), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    if (cliente.direccion) {
      setValue("direccionFiscal", cliente.direccion, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  const onSubmit = (values: ClienteValidacionForm) => {
    const payload = buildClienteValidacionPayload(values);
    const mutationOptions = {
      onSuccess: () => {
        toast.success(
          isEditing ? "Validación actualizada" : "Validación registrada",
        );
        onSuccess();
      },
      onError: (error: Error) =>
        toast.error(error.message || "No se pudo guardar la validación"),
    };

    if (item) {
      updateMutation.mutate(
        { id: item.id, data: payload as UpdateClienteValidacionSunatPayload },
        mutationOptions,
      );
      return;
    }

    createMutation.mutate(payload, mutationOptions);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4"
    >
      <FieldGroup className="grid gap-3 sm:grid-cols-2">
        <Field
          className="sm:col-span-2"
          data-invalid={errors.clienteId ? true : undefined}
        >
          <FieldLabel>Cliente vinculado opcional</FieldLabel>
          <SearchableSelect
            value={clienteId}
            onChange={handleClienteChange}
            options={clienteOptions}
            placeholder={
              clientesLoading
                ? "Cargando clientes..."
                : "Buscar cliente por nombre o documento"
            }
            searchPlaceholder="Buscar cliente..."
            emptyLabel="No hay clientes cargados para seleccionar. Puedes registrar la validación manualmente."
            ariaLabel="Cliente vinculado"
            invalid={!!errors.clienteId}
            clearable
            clearLabel="Sin cliente vinculado"
          />
          <p className="text-[11px] text-muted-foreground">
            Al elegir un cliente se completa automáticamente tipo y número de
            documento según los campos reales de Clientes: RUC para empresa, DNI
            para natural o sin documento para Público en General.
          </p>
          <FieldError>{errors.clienteId?.message}</FieldError>
        </Field>

        <Field data-invalid={errors.tipoDocumentoSunat ? true : undefined}>
          <FieldLabel>Tipo documento SUNAT</FieldLabel>
          <Select
            value={tipoDocumentoSunat}
            onValueChange={handleTipoDocumentoChange}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENTO_SUNAT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label} · código {option.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {documentoSunatInfo ? (
            <p className="text-[11px] text-muted-foreground">
              {documentoSunatInfo.helper}
            </p>
          ) : null}
          <FieldError>{errors.tipoDocumentoSunat?.message}</FieldError>
        </Field>

        <Field data-invalid={errors.numeroDocumento ? true : undefined}>
          <FieldLabel>Número de documento</FieldLabel>
          <Input
            placeholder={documentoSunatInfo?.placeholder ?? "20123456789"}
            maxLength={documentoSunatInfo?.maxLength}
            inputMode="numeric"
            disabled={isSinDocumento}
            {...register("numeroDocumento", {
              setValueAs: sanitizeDocumentoNumber,
            })}
          />
          <FieldError>{errors.numeroDocumento?.message}</FieldError>
        </Field>

        <Field data-invalid={errors.nombreNormalizado ? true : undefined}>
          <FieldLabel>Nombre normalizado</FieldLabel>
          <Input
            placeholder="CLIENTE DEMO SAC"
            {...register("nombreNormalizado")}
          />
          <FieldError>{errors.nombreNormalizado?.message}</FieldError>
        </Field>

        <Field>
          <FieldLabel>Estado</FieldLabel>
          <Select
            value={estado}
            onValueChange={(value) =>
              setValue("estado", value as EstadoValidacionSunat, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ESTADO_VALIDACION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field className="sm:col-span-2">
          <FieldLabel>Dirección fiscal</FieldLabel>
          <Input
            placeholder="Av. Cliente 123"
            {...register("direccionFiscal")}
          />
        </Field>

        <Field className="sm:col-span-2">
          <FieldLabel>Condición de domicilio</FieldLabel>
          <Select
            value={isRucDocumento ? condicionDomicilio : "__none"}
            disabled={!isRucDocumento}
            onValueChange={(value) =>
              setValue("condicionDomicilio", value === "__none" ? "" : value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Sin condición" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">Sin consulta / no aplica</SelectItem>
              {CONDICION_DOMICILIO_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            {isRucDocumento
              ? "La condición de domicilio aplica a consultas RUC en SUNAT."
              : "Para DNI o público general sin documento no aplica condición de domicilio SUNAT; se guarda como sin consulta."}
          </p>
        </Field>
      </FieldGroup>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending} className="rounded-xl">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isEditing ? "Guardar cambios" : "Registrar validación"}
        </Button>
      </div>
    </form>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function EnvioLogsSection() {
  const [comprobanteId, setComprobanteId] = useState("");
  const [estado, setEstado] = useState<EstadoComprobante | "ALL">("ALL");
  const [tipoEvento, setTipoEvento] = useState<string | "ALL">("ALL");
  const [selectedComprobanteId, setSelectedComprobanteId] = useState("");

  const { data: comprobantesData, isLoading: comprobantesLoading } =
    useComprobantes({ page: 1, limit: 100 });
  const comprobantes = useMemo(
    () => comprobantesData?.data ?? [],
    [comprobantesData?.data],
  );
  const comprobanteOptions = useMemo<SearchableSelectOption[]>(
    () =>
      comprobantes.map((comprobante) => ({
        value: comprobante.id,
        label: `${comprobante.numero} · ${documentoLabel(comprobante.tipo)} · ${logEstadoLabel(comprobante.estado)}`,
      })),
    [comprobantes],
  );

  const selectedComprobanteLookupId =
    comprobanteId || selectedComprobanteId || undefined;

  const filters = useMemo(
    () => ({
      page: 1,
      limit: 100,
      comprobanteId: optionalFormText(comprobanteId),
      estado: estado === "ALL" ? undefined : estado,
      tipoEvento: tipoEvento === "ALL" ? undefined : tipoEvento,
    }),
    [comprobanteId, estado, tipoEvento],
  );

  const { data, isLoading } = useComprobanteEnvioLogs(filters);
  const selectedLogsQuery = useComprobanteEnvios(selectedComprobanteLookupId);
  const logs = data?.data ?? [];
  const selectedLogs = selectedLogsQuery.data?.data ?? [];

  const columns = useMemo<ColumnDef<ComprobanteEnvioLogItem, unknown>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "Fecha",
        size: 145,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
      },
      {
        accessorKey: "comprobanteId",
        header: "Comprobante",
        size: 160,
        cell: ({ row }) => (
          <div>
            <p className="font-mono text-xs font-semibold text-foreground">
              {row.original.comprobante?.numero ??
                row.original.comprobanteId.slice(0, 8)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {row.original.comprobante
                ? documentoLabel(row.original.comprobante.tipo)
                : "ID parcial"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "tipoEvento",
        header: "Evento",
        size: 150,
        cell: ({ row }) => (
          <div>
            <p className="text-xs font-medium text-foreground">
              {logEventLabel(row.original.tipoEvento)}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground">
              {row.original.tipoEvento}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "estado",
        header: "Estado",
        size: 120,
        cell: ({ row }) => (
          <Badge variant="outline" className="text-[10px]">
            {logEstadoLabel(row.original.estado)}
          </Badge>
        ),
      },
      {
        accessorKey: "proveedor",
        header: "Proveedor",
        size: 120,
        cell: ({ row }) => row.original.proveedor ?? "dev/local",
      },
      {
        accessorKey: "mensaje",
        header: "Mensaje",
        size: 280,
        cell: ({ row }) => (
          <span className="block max-w-70 truncate text-xs text-muted-foreground">
            {row.original.mensaje ||
              row.original.codigoRespuesta ||
              "Sin mensaje"}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/50 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ScrollText className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Logs de envío fiscal
          </h3>
          <p className="text-xs text-muted-foreground">
            Revisa eventos registrados por el backend. Los payloads crudos no se
            exponen en esta vista segura.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-xs leading-relaxed text-blue-900 dark:text-blue-100">
        Los logs se generan automáticamente cuando el backend emite, consulta o
        reintenta comprobantes. Ya no necesitas escribir UUID manualmente:
        selecciona un comprobante por número o filtra por estado/evento.
      </div>

      <div className="grid gap-2 lg:grid-cols-[minmax(0,1.4fr)_220px_260px]">
        <SearchableSelect
          value={comprobanteId}
          onChange={setComprobanteId}
          options={comprobanteOptions}
          placeholder={
            comprobantesLoading
              ? "Cargando comprobantes..."
              : "Filtrar por comprobante"
          }
          searchPlaceholder="Buscar comprobante por número..."
          emptyLabel="No hay comprobantes recientes para filtrar."
          ariaLabel="Filtrar logs por comprobante"
          clearable
          clearLabel="Todos los comprobantes"
        />
        <Select
          value={estado}
          onValueChange={(value) =>
            setEstado(value as EstadoComprobante | "ALL")
          }
        >
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los estados</SelectItem>
            {LOG_ESTADO_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {logEstadoLabel(option)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tipoEvento} onValueChange={setTipoEvento}>
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Tipo de evento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los eventos</SelectItem>
            {LOG_EVENT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <SettingsDataTable
        columns={columns}
        data={logs}
        isLoading={isLoading}
        emptyMessage="Sin logs de envío"
        emptyDescription="Los envíos fiscales registrarán eventos cuando existan comprobantes emitidos."
        storageKey="settings:fiscal:envio-logs:columns"
        defaultPageSize={10}
      />

      <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-foreground">
              Vista por comprobante
            </h4>
            <p className="text-xs text-muted-foreground">
              Consulta el endpoint dedicado de envíos eligiendo el comprobante
              por número.
            </p>
          </div>
          <div className="sm:w-96">
            <SearchableSelect
              value={selectedComprobanteId}
              onChange={setSelectedComprobanteId}
              options={comprobanteOptions}
              placeholder={
                comprobantesLoading
                  ? "Cargando comprobantes..."
                  : "Seleccionar comprobante"
              }
              searchPlaceholder="Buscar comprobante por número..."
              emptyLabel="No hay comprobantes recientes."
              ariaLabel="Consultar envíos por comprobante"
              clearable
              clearLabel="Limpiar comprobante"
            />
          </div>
        </div>

        {selectedComprobanteLookupId ? (
          <div className="mt-4">
            <SettingsDataTable
              columns={columns}
              data={selectedLogs}
              isLoading={selectedLogsQuery.isLoading}
              emptyMessage="Sin envíos para este comprobante"
              emptyDescription="El comprobante no tiene logs o el ID no corresponde a un comprobante existente."
              storageKey="settings:fiscal:envios-comprobante:columns"
              defaultPageSize={5}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DeleteConfirmDialog({
  open,
  title,
  description,
  isPending,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-full sm:max-w-md rounded-2xl p-6">
        <AlertDialogCancel
          variant="ghost"
          size="icon"
          className="absolute right-4 top-4 mt-0 size-6 border-0 text-muted-foreground hover:bg-muted"
        >
          <X className="size-4" />
        </AlertDialogCancel>
        <AlertDialogHeader className="flex flex-row items-start gap-4 space-y-0">
          <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <Trash2 className="size-5 text-destructive" />
          </div>
          <div className="text-left">
            <AlertDialogTitle className="text-xl">{title}</AlertDialogTitle>
            <AlertDialogDescription className="mt-1">
              {description ?? "Esta acción no se puede deshacer."}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel className="mt-0 w-full rounded-xl sm:w-auto">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="w-full rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
          >
            {isPending ? "Procesando..." : "Sí, continuar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function FeriadosNacionalesSection() {
  const currentYear = new Date().getFullYear();
  const [anio, setAnio] = useState(currentYear);
  const [fecha, setFecha] = useState(`${currentYear}-01-01`);
  const [nombre, setNombre] = useState("");
  const [esNoLaborable, setEsNoLaborable] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FeriadoNacionalItem | null>(
    null,
  );

  const { data, isLoading } = useFeriadosNacionales(anio);
  const createMutation = useCreateFeriadoNacional();
  const updateMutation = useUpdateFeriadoNacional();
  const deleteMutation = useDeleteFeriadoNacional();
  const feriados = data?.data ?? [];

  const handleCreate = () => {
    if (!nombre.trim()) {
      toast.error("Indica el nombre del feriado");
      return;
    }

    createMutation.mutate(
      { fecha, nombre: nombre.trim(), esNoLaborable },
      {
        onSuccess: () => {
          toast.success("Feriado agregado");
          setNombre("");
          setEsNoLaborable(false);
        },
        onError: (error: Error) =>
          toast.error(error.message || "No se pudo agregar el feriado"),
      },
    );
  };

  const handleToggleNoLaborable = (
    item: FeriadoNacionalItem,
    checked: boolean,
  ) => {
    const payload: UpdateFeriadoNacionalPayload = {
      esNoLaborable: checked,
    };
    updateMutation.mutate(
      { id: item.id, data: payload },
      {
        onError: (error: Error) =>
          toast.error(error.message || "No se pudo actualizar el feriado"),
      },
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Feriado eliminado");
        setDeleteTarget(null);
      },
      onError: (error: Error) =>
        toast.error(error.message || "No se pudo eliminar el feriado"),
    });
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Feriados nacionales
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Mantiene el calendario usado para calcular días hábiles en notas
              de crédito excepcionales.
            </p>
          </div>
          <div className="w-full md:w-40">
            <Field>
              <FieldLabel>Año</FieldLabel>
              <Input
                type="number"
                min={2000}
                max={2100}
                value={anio}
                onChange={(event) => setAnio(Number(event.target.value))}
              />
            </Field>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-border/60 bg-card/50 p-4 md:grid-cols-[160px_minmax(0,1fr)_160px_auto] md:items-end">
          <Field>
            <FieldLabel>Fecha</FieldLabel>
            <Input
              type="date"
              value={fecha}
              onChange={(event) => setFecha(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>Descripción</FieldLabel>
            <Input
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
              placeholder="Año Nuevo"
            />
          </Field>
          <Field className="flex-row items-center gap-3 rounded-xl border border-border/60 px-3 py-2.5">
            <Switch
              checked={esNoLaborable}
              onCheckedChange={setEsNoLaborable}
            />
            <FieldLabel>Día no laborable</FieldLabel>
          </Field>
          <Button onClick={handleCreate} disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Agregar
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Fecha</th>
                <th className="px-4 py-2 text-left">Descripción</th>
                <th className="px-4 py-2 text-left">Tipo</th>
                <th className="px-4 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                    <Loader2 className="mr-2 inline size-4 animate-spin" />
                    Cargando feriados...
                  </td>
                </tr>
              ) : feriados.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                    No hay feriados registrados para este año.
                  </td>
                </tr>
              ) : (
                feriados.map((item) => (
                  <tr key={item.id} className="border-t border-border/60">
                    <td className="px-4 py-2 font-mono text-xs">
                      {formatDateOnly(item.fecha)}
                    </td>
                    <td className="px-4 py-2">{item.nombre}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.esNoLaborable}
                          onCheckedChange={(checked) =>
                            handleToggleNoLaborable(item, checked)
                          }
                        />
                        <Badge variant="outline">
                          {item.esNoLaborable ? "No laborable" : "Feriado"}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 className="size-4" />
                        <span className="sr-only">Eliminar feriado</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        title="¿Eliminar feriado?"
        description="El cálculo de días hábiles dejará de considerar esta fecha."
        isPending={deleteMutation.isPending}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </>
  );
}

function formatDateOnly(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "short" }).format(date);
}

// Doc 10 §6 — sección de reglas configurables (BLOQUEANTE/ADVERTENCIA).
function ReglasValidacionSection() {
  const { data: configFiscalEnvelope, isLoading } = useConfigFiscal();
  const configFiscal = configFiscalEnvelope?.data ?? null;
  const updateConfigFiscal = useUpdateConfigFiscal();

  const reglasIds = Object.values(ReglaConfigurableId);
  const reglasDefaults = REGLAS_CONFIGURABLES_DEFAULTS;
  const reglasLabels = REGLAS_CONFIGURABLES_LABELS;

  const overrides =
    (configFiscal?.reglasValidacion ?? null) as Partial<
      Record<ReglaConfigurableId, NivelValidacionValue>
    > | null;

  const [draft, setDraft] = useState<
    Partial<Record<ReglaConfigurableId, NivelValidacionValue>>
  >({});

  const valorEfectivo = (id: ReglaConfigurableId): NivelValidacionValue =>
    draft[id] ?? overrides?.[id] ?? reglasDefaults[id];

  const cambioPendiente = useMemo(
    () => Object.keys(draft).length > 0,
    [draft],
  );

  const handleGuardar = () => {
    if (!configFiscal) return;
    const merged: Partial<Record<ReglaConfigurableId, NivelValidacionValue>> = {
      ...(overrides ?? {}),
      ...draft,
    };
    // Quitar entradas que coinciden con default
    const overrideFinal: Partial<
      Record<ReglaConfigurableId, NivelValidacionValue>
    > = {};
    for (const id of reglasIds) {
      if (merged[id] && merged[id] !== reglasDefaults[id]) {
        overrideFinal[id] = merged[id];
      }
    }
    updateConfigFiscal.mutate(
      { reglasValidacion: overrideFinal } as UpdateConfigEmpresaFiscalPayload,
      {
        onSuccess: () => {
          toast.success("Reglas guardadas");
          setDraft({});
        },
        onError: (err: Error) => toast.error(err.message ?? "Error al guardar"),
      },
    );
  };

  const handleRestoreDefaults = () => {
    setDraft(
      reglasIds.reduce(
        (acc, id) => {
          acc[id] = reglasDefaults[id];
          return acc;
        },
        {} as Partial<Record<ReglaConfigurableId, NivelValidacionValue>>,
      ),
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Cargando reglas...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
        Define qué reglas pre-emisión <strong>bloquean</strong> la emisión
        (no permite continuar) y cuáles solo se muestran como{" "}
        <strong>advertencia</strong> (el usuario puede confirmar y continuar).
        Las reglas obligatorias por SUNAT no aparecen aquí: son siempre
        bloqueantes.
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Regla</th>
              <th className="px-4 py-2 text-right">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {reglasIds.map((id) => {
              const valor = valorEfectivo(id);
              const esDefault =
                !draft[id] &&
                (overrides?.[id] ?? reglasDefaults[id]) === reglasDefaults[id];
              return (
                <tr key={id} className="border-t border-border/60">
                  <td className="px-4 py-2">
                    <div className="font-medium">{reglasLabels[id]}</div>
                    <div className="text-xs text-muted-foreground">
                      Default: {reglasDefaults[id]}
                      {!esDefault && (
                        <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-700 dark:text-amber-300">
                          override
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <select
                      className="rounded-lg border border-border/60 bg-background px-2 py-1 text-xs"
                      value={valor}
                      onChange={(e) =>
                        setDraft((prev) => ({
                          ...prev,
                          [id]: e.target.value as
                            | typeof NivelValidacion.BLOQUEANTE
                            | typeof NivelValidacion.ADVERTENCIA,
                        }))
                      }
                    >
                      <option value={NivelValidacion.BLOQUEANTE}>
                        Bloqueante
                      </option>
                      <option value={NivelValidacion.ADVERTENCIA}>
                        Advertencia
                      </option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={handleRestoreDefaults}
          disabled={updateConfigFiscal.isPending}
        >
          Restaurar defaults
        </Button>
        <Button
          onClick={handleGuardar}
          disabled={!cambioPendiente || updateConfigFiscal.isPending}
        >
          {updateConfigFiscal.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
