"use client";

/* eslint-disable @next/next/no-img-element */

import {
  Activity,
  Barcode,
  Calendar,
  CircleAlert,
  Clock,
  Copy,
  Cpu,
  FileSignature,
  Gauge,
  Hash,
  ImageIcon,
  LogIn,
  LogOut,
  MapPin,
  Package,
  Pencil,
  PlusCircle,
  QrCode,
  ShieldCheck,
  Tag,
  User,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";
import {
  CondicionProducto,
  EstadoComercialEquipo,
  EstadoEquipo,
  EstadoGarantia,
} from "@erp/shared";

import {
  useEquipo,
  useEquipoHistorial,
  useEquipoLecturas,
} from "@/hooks/use-equipos";
import { getApiAssetUrl } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LecturaSnmpDialog } from "@/components/forms/lectura-snmp-dialog";

const ESTADO_LABELS: Record<EstadoEquipo, string> = {
  [EstadoEquipo.ACTIVO]: "Activo",
  [EstadoEquipo.EN_REPARACION]: "En reparación",
  [EstadoEquipo.BAJA]: "Baja",
};

const CONDICION_LABELS: Record<CondicionProducto, string> = {
  [CondicionProducto.NUEVO]: "Nuevo",
  [CondicionProducto.SEMINUEVO]: "Seminuevo",
  [CondicionProducto.USADO]: "Usado",
  [CondicionProducto.REACONDICIONADO]: "Reacondicionado",
  [CondicionProducto.RECUPERADO]: "Recuperado",
};

const GARANTIA_LABELS: Record<EstadoGarantia, string> = {
  [EstadoGarantia.ACTIVA]: "Activa",
  [EstadoGarantia.VENCIDA]: "Vencida",
  [EstadoGarantia.ANULADA]: "Anulada",
};

const ESTADO_COMERCIAL_LABELS: Record<EstadoComercialEquipo, string> = {
  [EstadoComercialEquipo.DISPONIBLE]: "Disponible",
  [EstadoComercialEquipo.VENDIDO]: "Vendido",
  [EstadoComercialEquipo.ALQUILADO]: "Alquilado",
  [EstadoComercialEquipo.RESERVADO]: "Reservado",
  [EstadoComercialEquipo.EN_REPARACION]: "En reparación",
  [EstadoComercialEquipo.USO_INTERNO]: "Uso interno",
  [EstadoComercialEquipo.BAJA]: "Baja",
};

const ESTADO_GRADIENT: Record<EstadoEquipo, string> = {
  [EstadoEquipo.ACTIVO]:
    "bg-linear-to-br from-emerald-500 to-green-700 dark:from-emerald-700 dark:to-green-900",
  [EstadoEquipo.EN_REPARACION]:
    "bg-linear-to-br from-amber-500 to-orange-600 dark:from-amber-700 dark:to-orange-800",
  [EstadoEquipo.BAJA]:
    "bg-linear-to-br from-red-500 to-rose-600 dark:from-red-700 dark:to-rose-900",
};

const ESTADO_BADGE_CLASS: Record<EstadoEquipo, string> = {
  [EstadoEquipo.ACTIVO]:
    "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  [EstadoEquipo.EN_REPARACION]:
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  [EstadoEquipo.BAJA]:
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
};

interface EquipoClienteAsignacion {
  id: string;
  fechaInicio: string;
  fechaFin: string | null;
  notas: string | null;
  cliente: {
    id: string;
    nombre: string | null;
    apellido: string | null;
    razonSocial: string | null;
    ruc: string | null;
    dni: string | null;
  };
}

interface EquipoGarantiaResumen {
  id: string;
  estado: EstadoGarantia;
  fechaInicio: string;
  fechaFin: string;
  codigoQR: string;
}

interface LecturaSNMPItem {
  id?: string;
  timestamp?: string;
  nivelTonerNegro?: number | null;
  nivelTonerCian?: number | null;
  nivelTonerMagenta?: number | null;
  nivelTonerAmarillo?: number | null;
  paginasTotales?: number | null;
  erroresActivos?: string[] | null;
  estadoFusor?: string | null;
}

type HistorialEventoTipo =
  | "CREACION"
  | "ASIGNACION_INICIO"
  | "ASIGNACION_FIN"
  | "GARANTIA"
  | "LECTURA_SNMP";

interface HistorialEvento {
  id: string;
  tipo: HistorialEventoTipo;
  timestamp: string;
  titulo: string;
  descripcion?: string | null;
  cliente?: {
    id: string;
    nombre?: string | null;
    apellido?: string | null;
    razonSocial?: string | null;
  } | null;
  metadata?: Record<string, unknown> | null;
}

interface ProductoImagenResumen {
  id?: string;
  url: string;
  nombre?: string | null;
  esPrincipal?: boolean;
  orden?: number | null;
}

interface ProductoEquipoDetalle {
  id: string;
  sku: string;
  nombre: string;
  modelo: string | null;
  imagen: string | null;
  imagenes?: ProductoImagenResumen[];
  codigoBarras?: string | null;
  condicion?: CondicionProducto | null;
  manejaInventario?: boolean;
  categoria?: {
    id: string;
    nombre: string;
  } | null;
  marca?: {
    id?: string;
    nombre: string;
  } | null;
  unidadMedida?: {
    id: string;
    codigo: string;
    nombre: string;
  } | null;
}

interface EquipoDetalleRecord extends Record<string, unknown> {
  id?: string;
  numeroSerie?: string;
  estado?: EstadoEquipo;
  estadoComercial?: EstadoComercialEquipo;
  procedencia?: string | null;
  contadorInicial?: number | null;
  contadorActual?: number | null;
  fechaIngreso?: string | null;
  observacionEstado?: string | null;
  codigoQr?: string | null;
  ubicacion?: string | null;
  firmware?: string | null;
  notas?: string | null;
  createdAt?: string;
  updatedAt?: string;
  producto?: ProductoEquipoDetalle | null;
  almacen?: {
    id: string;
    nombre: string;
  } | null;
  equipoClientes?: EquipoClienteAsignacion[];
  garantias?: EquipoGarantiaResumen[];
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getClienteNombre(cliente: EquipoClienteAsignacion["cliente"]) {
  return cliente.razonSocial
    ? cliente.razonSocial
    : [cliente.nombre, cliente.apellido].filter(Boolean).join(" ") || undefined;
}

function getProductImages(
  imagenes: ProductoImagenResumen[] | undefined,
  legacyImage: string | null | undefined,
) {
  if (imagenes?.length) {
    return [...imagenes].sort((a, b) => {
      if (a.esPrincipal && !b.esPrincipal) return -1;
      if (!a.esPrincipal && b.esPrincipal) return 1;
      return (a.orden ?? 0) - (b.orden ?? 0);
    });
  }

  if (!legacyImage) {
    return [];
  }

  return [
    {
      id: legacyImage,
      url: legacyImage,
      nombre: "Imagen principal",
      esPrincipal: true,
      orden: 0,
    },
  ];
}

function equipoCuentaEnInventario(
  estadoComercial: EstadoComercialEquipo | undefined,
  almacenNombre: string | undefined,
  manejaInventario: boolean | undefined,
) {
  return Boolean(
    manejaInventario &&
    almacenNombre &&
    estadoComercial !== EstadoComercialEquipo.VENDIDO &&
    estadoComercial !== EstadoComercialEquipo.ALQUILADO &&
    estadoComercial !== EstadoComercialEquipo.BAJA,
  );
}

function getInventarioMessage(
  estadoComercial: EstadoComercialEquipo | undefined,
  almacenNombre: string | undefined,
  manejaInventario: boolean | undefined,
  unidadCodigo: string | undefined,
) {
  const unidad = unidadCodigo ?? "UND";

  if (!manejaInventario) {
    return "Este producto no maneja stock desde Inventario.";
  }

  if (!almacenNombre) {
    return "No suma stock porque la unidad no tiene almacén asignado.";
  }

  if (estadoComercial === EstadoComercialEquipo.VENDIDO) {
    return "No suma stock porque la unidad ya fue vendida.";
  }

  if (estadoComercial === EstadoComercialEquipo.ALQUILADO) {
    return "No suma stock porque la unidad está alquilada fuera del almacén.";
  }

  if (estadoComercial === EstadoComercialEquipo.BAJA) {
    return "No suma stock porque la unidad está dada de baja.";
  }

  return `Sí, esta unidad aporta 1 ${unidad} al stock del almacén ${almacenNombre}.`;
}

function InfoItem({
  label,
  value,
  icon: Icon,
  copyable = false,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ElementType;
  copyable?: boolean;
}) {
  return (
    <div className="group flex min-w-0 flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        {label}
      </span>
      <div className="flex min-w-0 items-center gap-1.5">
        {Icon && (
          <Icon className="size-3.5 shrink-0 text-muted-foreground/50" />
        )}
        <span className="truncate text-sm font-medium text-foreground">
          {value || (
            <span className="text-xs font-normal italic text-muted-foreground/40">
              —
            </span>
          )}
        </span>
        {copyable && value && (
          <button
            onClick={() => {
              void navigator.clipboard.writeText(value);
              toast.success("Copiado al portapapeles", { duration: 1500 });
            }}
            title="Copiar"
            className="ml-auto shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
          >
            <Copy className="size-3 text-muted-foreground/50" />
          </button>
        )}
      </div>
    </div>
  );
}

function NoteCard({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/60 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {value?.trim() || "—"}
      </p>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[1, 2, 3].map((s) => (
        <div key={s} className="rounded-xl border border-border/50 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-36" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface EquipoDetalleModalProps {
  serie: string | null;
  onClose: () => void;
  onEdit?: (equipo: Record<string, unknown>) => void;
  canEdit?: boolean;
}

export function EquipoDetalleModal({
  serie,
  onClose,
  onEdit,
  canEdit,
}: EquipoDetalleModalProps) {
  const { data: equipoRes, isLoading, isError } = useEquipo(serie || undefined);
  const { data: historialRes, isLoading: historialLoading } =
    useEquipoHistorial(serie || undefined);
  const { data: lecturasRes, isLoading: lecturasLoading } = useEquipoLecturas(
    serie || undefined,
  );

  const equipo = equipoRes?.data as EquipoDetalleRecord | undefined;

  if (!serie) return null;

  const estado = equipo?.estado as EstadoEquipo | undefined;
  const estadoComercial = equipo?.estadoComercial as
    | EstadoComercialEquipo
    | undefined;
  const producto = equipo?.producto as ProductoEquipoDetalle | undefined;
  const almacen = equipo?.almacen as { id: string; nombre: string } | undefined;
  const asignaciones =
    (equipo?.equipoClientes as EquipoClienteAsignacion[] | undefined) ?? [];
  const asignacionActual =
    asignaciones.find((a) => !a.fechaFin) ?? asignaciones[0];
  const garantias =
    (equipo?.garantias as EquipoGarantiaResumen[] | undefined) ?? [];
  const garantiaActual =
    garantias.find((g) => g.estado === EstadoGarantia.ACTIVA) ?? garantias[0];

  const displayName = producto
    ? `${producto.nombre}${producto.modelo ? ` — ${producto.modelo}` : ""}`
    : "Cargando equipo...";

  const serieLabel = (serie ?? "").slice(0, 3).toUpperCase();
  const productImages = getProductImages(producto?.imagenes, producto?.imagen);
  const primaryImage = productImages[0];
  const imageUrl = primaryImage ? getApiAssetUrl(primaryImage.url) : null;
  const cuentaStock = equipoCuentaEnInventario(
    estadoComercial,
    almacen?.nombre,
    producto?.manejaInventario,
  );
  const contadorDelta =
    typeof equipo?.contadorInicial === "number" &&
    typeof equipo?.contadorActual === "number"
      ? String(
          Math.max(
            (equipo.contadorActual ?? 0) - (equipo.contadorInicial ?? 0),
            0,
          ),
        )
      : null;

  const clienteSectionNum = 5;
  const garantiaSectionNum = clienteSectionNum + (asignacionActual ? 1 : 0);
  const auditSectionNum =
    5 + (asignacionActual ? 1 : 0) + (garantiaActual ? 1 : 0);

  return (
    <Dialog open={!!serie} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[88vh] w-full max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-3xl border border-border/60 bg-background p-0 shadow-2xl sm:max-w-2xl md:max-w-4xl lg:max-w-5xl">
        <DialogHeader className="shrink-0 border-b border-border/40 bg-background px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className={cn(
                "flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-sm font-bold text-white shadow-md ring-2 ring-background transition-all dark:ring-border sm:size-14",
                isLoading
                  ? "bg-muted text-muted-foreground ring-0 shadow-none"
                  : imageUrl
                    ? "bg-muted"
                    : estado
                      ? ESTADO_GRADIENT[estado]
                      : "bg-linear-to-br from-slate-500 to-slate-700",
              )}
            >
              {isLoading ? (
                "…"
              ) : imageUrl ? (
                <img
                  src={imageUrl}
                  alt={producto?.nombre ?? serie}
                  className="size-full bg-white/70 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                serieLabel
              )}
            </div>

            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base font-semibold leading-tight sm:text-xl">
                {isLoading ? <Skeleton className="h-5 w-48" /> : displayName}
              </DialogTitle>
              {equipo && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary" className="h-5 text-xs font-mono">
                    {equipo.numeroSerie as string}
                  </Badge>
                  {estado && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 gap-1.5 text-xs",
                        ESTADO_BADGE_CLASS[estado],
                      )}
                    >
                      {estado === EstadoEquipo.ACTIVO ? (
                        <span className="relative flex size-1.5 shrink-0">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                          <span className="relative inline-flex size-1.5 rounded-full bg-green-500" />
                        </span>
                      ) : (
                        <span
                          className={cn("inline-block size-1.5 rounded-full", {
                            "bg-amber-400":
                              estado === EstadoEquipo.EN_REPARACION,
                            "bg-red-400": estado === EstadoEquipo.BAJA,
                          })}
                        />
                      )}
                      {ESTADO_LABELS[estado]}
                    </Badge>
                  )}
                  {estadoComercial && (
                    <Badge variant="outline" className="h-5 text-xs">
                      {ESTADO_COMERCIAL_LABELS[estadoComercial]}
                    </Badge>
                  )}
                </div>
              )}
              <DialogDescription className="sr-only">
                Información detallada del equipo.
              </DialogDescription>
            </div>

            {canEdit && equipo && (
              <Button
                variant="outline"
                size="sm"
                className="mr-8 h-8 shrink-0 gap-1.5 sm:mr-10"
                onClick={() => onEdit?.(equipo)}
              >
                <Pencil className="size-3.5" />
                <span className="hidden text-xs sm:inline">Editar</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {isLoading ? (
            <DetailSkeleton />
          ) : isError || !equipo ? (
            <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
              <div className="flex size-14 items-center justify-center rounded-full bg-muted/60">
                <Package className="size-6 opacity-40" />
              </div>
              <p className="text-sm">
                No se pudo cargar la información del equipo.
              </p>
            </div>
          ) : (
            <Tabs defaultValue="informacion" className="flex flex-col gap-3">
              <TabsList className="h-9 w-full rounded-lg border border-border/60 bg-muted/60 p-0.5">
                <TabsTrigger
                  value="informacion"
                  className="h-8 flex-1 rounded-md text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Información
                </TabsTrigger>
                <TabsTrigger
                  value="lecturas"
                  className="h-8 flex-1 rounded-md text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Lecturas SNMP
                </TabsTrigger>
                <TabsTrigger
                  value="historial"
                  className="h-8 flex-1 rounded-md text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Historial
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="informacion"
                className="mt-0 data-[state=active]:animate-fade-up"
              >
                <div className="flex flex-col gap-3 sm:gap-4">
                  <section className="rounded-xl border border-border/50 border-l-[3px] border-l-blue-400 bg-card p-4 dark:border-l-blue-800 sm:p-5">
                    <div className="mb-4 flex items-center gap-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-600 ring-2 ring-blue-100 dark:bg-blue-900/40 dark:text-blue-400 dark:ring-blue-900/30">
                        1
                      </span>
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
                        <Package className="size-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Catálogo heredado
                      </h3>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                      <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={producto?.nombre ?? "Imagen del producto"}
                            className="aspect-4/3 w-full bg-white/70 object-contain"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="flex aspect-4/3 w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                            <ImageIcon className="size-8 opacity-50" />
                            <span className="text-xs">
                              Sin imagen del producto
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <InfoItem
                          label="Producto"
                          value={producto?.nombre}
                          icon={Package}
                        />
                        <InfoItem
                          label="SKU"
                          value={producto?.sku}
                          icon={Tag}
                          copyable
                        />
                        <InfoItem
                          label="Marca"
                          value={producto?.marca?.nombre}
                          icon={Tag}
                        />
                        <InfoItem
                          label="Modelo"
                          value={producto?.modelo}
                          icon={Cpu}
                        />
                        <InfoItem
                          label="Categoría"
                          value={producto?.categoria?.nombre}
                        />
                        <InfoItem
                          label="Unidad"
                          value={
                            producto?.unidadMedida
                              ? `${producto.unidadMedida.codigo} · ${producto.unidadMedida.nombre}`
                              : null
                          }
                          icon={Warehouse}
                        />
                        <InfoItem
                          label="Condición"
                          value={
                            producto?.condicion
                              ? CONDICION_LABELS[producto.condicion]
                              : null
                          }
                        />
                        <InfoItem
                          label="Código de barras"
                          value={producto?.codigoBarras ?? null}
                          icon={Barcode}
                          copyable
                        />
                      </div>
                    </div>
                  </section>

                  <section className="rounded-xl border border-border/50 border-l-[3px] border-l-green-400 bg-card p-4 dark:border-l-green-800 sm:p-5">
                    <div className="mb-4 flex items-center gap-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-[11px] font-bold text-green-600 ring-2 ring-green-100 dark:bg-green-900/40 dark:text-green-400 dark:ring-green-900/30">
                        2
                      </span>
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40">
                        <MapPin className="size-3.5 text-green-600 dark:text-green-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Unidad física y ubicación
                      </h3>
                    </div>

                    <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                      <InfoItem
                        label="Nro. serie"
                        value={equipo.numeroSerie as string}
                        icon={Hash}
                        copyable
                      />
                      <InfoItem
                        label="QR físico"
                        value={equipo.codigoQr as string}
                        icon={QrCode}
                        copyable
                      />
                      <InfoItem
                        label="Estado operativo"
                        value={estado ? ESTADO_LABELS[estado] : undefined}
                      />
                      <InfoItem
                        label="Estado comercial"
                        value={
                          estadoComercial
                            ? ESTADO_COMERCIAL_LABELS[estadoComercial]
                            : undefined
                        }
                      />
                      <InfoItem
                        label="Almacén interno"
                        value={almacen?.nombre}
                        icon={Warehouse}
                      />
                      <InfoItem
                        label="Ubicación exacta"
                        value={equipo.ubicacion as string}
                        icon={MapPin}
                      />
                      <InfoItem
                        label="Procedencia"
                        value={equipo.procedencia as string}
                      />
                      <InfoItem
                        label="Fecha de ingreso"
                        value={
                          equipo.fechaIngreso
                            ? formatDate(equipo.fechaIngreso as string)
                            : null
                        }
                        icon={Calendar}
                      />
                      <InfoItem
                        label="Firmware"
                        value={equipo.firmware as string}
                        icon={Cpu}
                      />
                    </div>
                  </section>

                  <section className="rounded-xl border border-border/50 border-l-[3px] border-l-violet-400 bg-card p-4 dark:border-l-violet-800 sm:p-5">
                    <div className="mb-4 flex items-center gap-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-600 ring-2 ring-violet-100 dark:bg-violet-900/40 dark:text-violet-400 dark:ring-violet-900/30">
                        3
                      </span>
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40">
                        <Gauge className="size-3.5 text-violet-600 dark:text-violet-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Contadores e inventario
                      </h3>
                    </div>

                    <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
                      <InfoItem
                        label="Contador inicial"
                        value={
                          equipo.contadorInicial != null
                            ? String(equipo.contadorInicial)
                            : null
                        }
                        icon={Gauge}
                      />
                      <InfoItem
                        label="Contador actual"
                        value={
                          equipo.contadorActual != null
                            ? String(equipo.contadorActual)
                            : null
                        }
                        icon={Gauge}
                      />
                      <InfoItem label="Diferencia" value={contadorDelta} />
                      <InfoItem
                        label="Aporta al stock"
                        value={cuentaStock ? "Sí" : "No"}
                        icon={Warehouse}
                      />
                    </div>

                    <div className="mt-4 rounded-xl border border-border/60 bg-background/60 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                        Estado en inventario
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-foreground">
                        {getInventarioMessage(
                          estadoComercial,
                          almacen?.nombre,
                          producto?.manejaInventario,
                          producto?.unidadMedida?.codigo,
                        )}
                      </p>
                    </div>
                  </section>

                  <section className="rounded-xl border border-border/50 border-l-[3px] border-l-amber-400 bg-card p-4 dark:border-l-amber-800 sm:p-5">
                    <div className="mb-4 flex items-center gap-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-600 ring-2 ring-amber-100 dark:bg-amber-900/40 dark:text-amber-400 dark:ring-amber-900/30">
                        4
                      </span>
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                        <Clock className="size-3.5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Observaciones y trazabilidad
                      </h3>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <NoteCard
                        label="Observación de estado"
                        value={equipo.observacionEstado as string}
                      />
                      <NoteCard
                        label="Notas internas"
                        value={equipo.notas as string}
                      />
                    </div>
                  </section>

                  {asignacionActual && (
                    <section className="rounded-xl border border-border/50 border-l-[3px] border-l-cyan-400 bg-card p-4 dark:border-l-cyan-800 sm:p-5">
                      <div className="mb-4 flex items-center gap-2.5">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-[11px] font-bold text-cyan-600 ring-2 ring-cyan-100 dark:bg-cyan-900/40 dark:text-cyan-400 dark:ring-cyan-900/30">
                          {clienteSectionNum}
                        </span>
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-900/40">
                          <User className="size-3.5 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                          Cliente asignado
                        </h3>
                      </div>
                      <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                        <InfoItem
                          label="Nombre"
                          value={getClienteNombre(asignacionActual.cliente)}
                          icon={User}
                        />
                        <InfoItem
                          label="Doc. identidad"
                          value={
                            asignacionActual.cliente.ruc ??
                            asignacionActual.cliente.dni
                          }
                          copyable
                        />
                        <InfoItem
                          label="Desde"
                          value={formatDate(asignacionActual.fechaInicio)}
                          icon={Calendar}
                        />
                        {asignacionActual.notas && (
                          <InfoItem
                            label="Notas"
                            value={asignacionActual.notas}
                          />
                        )}
                      </div>
                    </section>
                  )}

                  {garantiaActual && (
                    <section className="rounded-xl border border-border/50 border-l-[3px] border-l-rose-400 bg-card p-4 dark:border-l-rose-800 sm:p-5">
                      <div className="mb-4 flex items-center gap-2.5">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[11px] font-bold text-rose-600 ring-2 ring-rose-100 dark:bg-rose-900/40 dark:text-rose-400 dark:ring-rose-900/30">
                          {garantiaSectionNum}
                        </span>
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/40">
                          <ShieldCheck className="size-3.5 text-rose-600 dark:text-rose-400" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">
                          Garantía
                        </h3>
                      </div>
                      <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
                        <InfoItem
                          label="Estado"
                          value={GARANTIA_LABELS[garantiaActual.estado]}
                        />
                        <InfoItem
                          label="Inicio"
                          value={formatDate(garantiaActual.fechaInicio)}
                          icon={Calendar}
                        />
                        <InfoItem
                          label="Fin"
                          value={formatDate(garantiaActual.fechaFin)}
                          icon={Calendar}
                        />
                        <InfoItem
                          label="Código QR"
                          value={garantiaActual.codigoQR}
                          copyable
                        />
                      </div>
                    </section>
                  )}

                  <section className="rounded-xl border border-border/50 border-l-[3px] border-l-border bg-muted/20 p-4 sm:p-5">
                    <div className="mb-4 flex items-center gap-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground ring-2 ring-muted">
                        {auditSectionNum}
                      </span>
                      <h3 className="text-sm font-semibold text-muted-foreground">
                        Auditoría
                      </h3>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/70 ring-1 ring-border/50">
                          <Calendar className="size-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                            Registrado el
                          </span>
                          <span className="text-sm font-medium tabular-nums">
                            {equipo.createdAt
                              ? formatDateTime(equipo.createdAt as string)
                              : "—"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/70 ring-1 ring-border/50">
                          <Clock className="size-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                            Última actualización
                          </span>
                          <span className="text-sm font-medium tabular-nums">
                            {equipo.updatedAt
                              ? formatDateTime(equipo.updatedAt as string)
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </TabsContent>

              <TabsContent
                value="lecturas"
                className="mt-0 data-[state=active]:animate-fade-up"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    Lecturas SNMP capturadas (manuales y automáticas)
                  </p>
                  {serie ? (
                    <LecturaSnmpDialog
                      serie={serie}
                      hasIp={Boolean(equipo?.ipAddress)}
                    />
                  ) : null}
                </div>
                {lecturasLoading ? (
                  <div className="flex flex-col gap-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-border/50 bg-card p-4"
                      >
                        <Skeleton className="mb-2 h-4 w-40" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    ))}
                  </div>
                ) : (
                  (() => {
                    const lecturas = (lecturasRes?.data ??
                      []) as LecturaSNMPItem[];
                    if (lecturas.length === 0) {
                      return (
                        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                          <div className="flex size-14 items-center justify-center rounded-full bg-muted/60">
                            <Gauge className="size-6 opacity-40" />
                          </div>
                          <p className="text-sm font-medium">
                            Sin lecturas SNMP
                          </p>
                          <p className="text-xs text-muted-foreground/70">
                            Las lecturas se registran automáticamente o
                            manualmente.
                          </p>
                        </div>
                      );
                    }
                    return (
                      <div className="flex flex-col gap-3">
                        {lecturas.map((l, i) => (
                          <div
                            key={l.id ?? i}
                            className="rounded-xl border border-border/50 bg-card p-4 sm:p-5"
                          >
                            <div className="mb-3 flex items-center justify-between gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {l.timestamp
                                  ? formatDateTime(l.timestamp)
                                  : `Lectura ${i + 1}`}
                              </span>
                            </div>
                            <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                              {l.paginasTotales != null && (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                                    Páginas totales
                                  </span>
                                  <span className="font-mono">
                                    {String(l.paginasTotales)}
                                  </span>
                                </div>
                              )}
                              {l.nivelTonerNegro != null && (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                                    Tóner negro
                                  </span>
                                  <span className="font-mono">
                                    {String(l.nivelTonerNegro)}%
                                  </span>
                                </div>
                              )}
                              {l.nivelTonerCian != null && (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                                    Tóner cian
                                  </span>
                                  <span className="font-mono">
                                    {String(l.nivelTonerCian)}%
                                  </span>
                                </div>
                              )}
                              {l.nivelTonerMagenta != null && (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                                    Tóner magenta
                                  </span>
                                  <span className="font-mono">
                                    {String(l.nivelTonerMagenta)}%
                                  </span>
                                </div>
                              )}
                              {l.nivelTonerAmarillo != null && (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                                    Tóner amarillo
                                  </span>
                                  <span className="font-mono">
                                    {String(l.nivelTonerAmarillo)}%
                                  </span>
                                </div>
                              )}
                              {l.estadoFusor && (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                                    Fusor
                                  </span>
                                  <span>{l.estadoFusor}</span>
                                </div>
                              )}
                              {!!l.erroresActivos?.length && (
                                <div className="flex flex-col gap-0.5 sm:col-span-2">
                                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                                    Errores activos
                                  </span>
                                  <span>{l.erroresActivos.join(", ")}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </TabsContent>

              <TabsContent
                value="historial"
                className="mt-0 data-[state=active]:animate-fade-up"
              >
                {historialLoading ? (
                  <div className="flex flex-col gap-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-border/50 bg-card p-4"
                      >
                        <Skeleton className="mb-2 h-4 w-40" />
                        <Skeleton className="h-4 w-64" />
                      </div>
                    ))}
                  </div>
                ) : (
                  (() => {
                    const historial = (historialRes?.data ??
                      []) as unknown as HistorialEvento[];
                    if (historial.length === 0) {
                      return (
                        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
                          <div className="flex size-14 items-center justify-center rounded-full bg-muted/60">
                            <Clock className="size-6 opacity-40" />
                          </div>
                          <p className="text-sm font-medium">Sin historial</p>
                          <p className="text-xs text-muted-foreground/70">
                            Aquí aparecerán los eventos del equipo: creación,
                            asignaciones, garantías y lecturas.
                          </p>
                        </div>
                      );
                    }

                    const tipoMeta: Record<
                      HistorialEventoTipo,
                      {
                        Icon: typeof Clock;
                        ring: string;
                        bg: string;
                        text: string;
                      }
                    > = {
                      CREACION: {
                        Icon: PlusCircle,
                        ring: "ring-emerald-200 dark:ring-emerald-900/40",
                        bg: "bg-emerald-100 dark:bg-emerald-900/30",
                        text: "text-emerald-700 dark:text-emerald-400",
                      },
                      ASIGNACION_INICIO: {
                        Icon: LogIn,
                        ring: "ring-blue-200 dark:ring-blue-900/40",
                        bg: "bg-blue-100 dark:bg-blue-900/30",
                        text: "text-blue-700 dark:text-blue-400",
                      },
                      ASIGNACION_FIN: {
                        Icon: LogOut,
                        ring: "ring-orange-200 dark:ring-orange-900/40",
                        bg: "bg-orange-100 dark:bg-orange-900/30",
                        text: "text-orange-700 dark:text-orange-400",
                      },
                      GARANTIA: {
                        Icon: FileSignature,
                        ring: "ring-purple-200 dark:ring-purple-900/40",
                        bg: "bg-purple-100 dark:bg-purple-900/30",
                        text: "text-purple-700 dark:text-purple-400",
                      },
                      LECTURA_SNMP: {
                        Icon: Activity,
                        ring: "ring-cyan-200 dark:ring-cyan-900/40",
                        bg: "bg-cyan-100 dark:bg-cyan-900/30",
                        text: "text-cyan-700 dark:text-cyan-400",
                      },
                    };

                    return (
                      <div className="flex flex-col gap-3">
                        {historial.map((h, i) => {
                          const meta = tipoMeta[h.tipo] ?? {
                            Icon: CircleAlert,
                            ring: "ring-border/50",
                            bg: "bg-muted/60",
                            text: "text-muted-foreground",
                          };
                          const Icon = meta.Icon;
                          const clienteNombre = h.cliente
                            ? getClienteNombre(
                                h.cliente as EquipoClienteAsignacion["cliente"],
                              )
                            : null;
                          return (
                            <div
                              key={h.id ?? i}
                              className="rounded-xl border border-border/50 bg-card p-4 sm:p-5"
                            >
                              <div className="mb-1 flex items-center gap-3">
                                <div
                                  className={cn(
                                    "flex size-7 shrink-0 items-center justify-center rounded-lg ring-1",
                                    meta.bg,
                                    meta.ring,
                                  )}
                                >
                                  <Icon
                                    className={cn("size-3.5", meta.text)}
                                  />
                                </div>
                                <span className="text-sm font-medium text-foreground">
                                  {h.titulo}
                                </span>
                                <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                                  {formatDateTime(h.timestamp)}
                                </span>
                              </div>
                              {clienteNombre ? (
                                <p className="pl-10 text-sm text-foreground/80">
                                  {clienteNombre}
                                </p>
                              ) : null}
                              {h.descripcion ? (
                                <p className="pl-10 text-sm text-muted-foreground">
                                  {h.descripcion}
                                </p>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
