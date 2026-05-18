'use client'

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  MessageSquarePlus,
  Pencil,
  QrCode,
  ScanSearch,
  ShieldCheck,
  User,
  Wrench,
} from 'lucide-react'
import { toast } from 'sonner'
import { EstadoGarantia } from '@erp/shared'

import { useGarantia } from '@/hooks/use-garantias'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'

const ESTADO_LABELS: Record<EstadoGarantia, string> = {
  [EstadoGarantia.ACTIVA]: 'Activa',
  [EstadoGarantia.VENCIDA]: 'Vencida',
  [EstadoGarantia.ANULADA]: 'Anulada',
}

export interface GarantiaCasoItem {
  id: string
  descripcion: string
  resolucion?: string | null
  aceptada?: boolean | null
  motivo?: string | null
  createdAt: string
}

export interface GarantiaDetailRecord {
  id: string
  estado: EstadoGarantia
  fechaInicio: string
  fechaFin: string
  cobertura: string
  exclusiones?: string | null
  clienteNombre?: string | null
  codigoQR: string
  vigente?: boolean
  ventaId?: string | null
  createdAt?: string
  updatedAt?: string
  equipo: {
    id: string
    numeroSerie: string
    producto: {
      nombre: string
      modelo?: string | null
      marca?: {
        nombre: string
      } | null
    }
  }
  casos: GarantiaCasoItem[]
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'

  return new Date(value).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—'

  return new Date(value).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 3 }).map((_, sectionIndex) => (
        <div key={sectionIndex} className="rounded-2xl border border-border/40 bg-card/50 p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, itemIndex) => (
              <div key={itemIndex} className="flex flex-col gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function InfoItem({
  label,
  value,
  icon: Icon,
  copyable = false,
}: {
  label: string
  value: string | null | undefined
  icon?: React.ElementType
  copyable?: boolean
}) {
  return (
    <div className="group flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
        {label}
      </span>
      <div className="flex min-w-0 items-center gap-1.5">
        {Icon ? <Icon className="size-3.5 shrink-0 text-muted-foreground/50" /> : null}
        <span className="truncate text-sm font-medium text-foreground">
          {value || <span className="text-xs font-normal italic text-muted-foreground/40">—</span>}
        </span>
        {copyable && value ? (
          <button
            type="button"
            className="ml-auto shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
            onClick={() => {
              void navigator.clipboard.writeText(value)
              toast.success('Copiado al portapapeles', { duration: 1500 })
            }}
            title="Copiar"
          >
            <Copy className="size-3 text-muted-foreground/50" />
          </button>
        ) : null}
      </div>
    </div>
  )
}

function AuditItem({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | null | undefined
  icon: React.ElementType
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/70 ring-1 ring-border/50">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          {label}
        </span>
        <span className="text-sm font-medium tabular-nums">{formatDateTime(value)}</span>
      </div>
    </div>
  )
}

interface GarantiaDetalleModalProps {
  id: string | null
  onClose: () => void
  onEdit?: (garantia: GarantiaDetailRecord) => void
  onCreateCaso?: (garantiaId: string) => void
  onUpdateCaso?: (garantiaId: string, caso: GarantiaCasoItem) => void
  canEdit?: boolean
  canManageCasos?: boolean
}

export function GarantiaDetalleModal({
  id,
  onClose,
  onEdit,
  onCreateCaso,
  onUpdateCaso,
  canEdit,
  canManageCasos,
}: GarantiaDetalleModalProps) {
  const { data: garantiaResponse, isLoading, isError } = useGarantia(id ?? undefined)
  const garantia = garantiaResponse?.data as unknown as GarantiaDetailRecord | undefined

  if (!id) return null

  const productName = garantia
    ? [garantia.equipo.producto.nombre, garantia.equipo.producto.modelo].filter(Boolean).join(' · ')
    : ''
  const marcaNombre = garantia?.equipo.producto.marca?.nombre ?? null
  const isVigente = garantia
    ? typeof garantia.vigente === 'boolean'
      ? garantia.vigente
      : garantia.estado === EstadoGarantia.ACTIVA && new Date(garantia.fechaFin) > new Date()
    : false

  return (
    <Dialog open={!!id} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[88vh] w-full max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[24px] border border-border/60 bg-background p-0 shadow-2xl sm:max-w-2xl md:max-w-4xl lg:max-w-5xl">
        <DialogHeader className="shrink-0 border-b border-border/40 bg-background px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className={cn(
                'flex size-12 shrink-0 items-center justify-center rounded-2xl font-bold text-base text-white shadow-md ring-2 ring-background transition-all dark:ring-border sm:size-14 sm:text-lg',
                isLoading
                  ? 'bg-muted text-muted-foreground ring-0 shadow-none'
                  : 'bg-gradient-to-br from-emerald-500 to-emerald-700 dark:from-emerald-700 dark:to-emerald-900',
              )}
            >
              {isLoading ? '…' : <ShieldCheck className="size-6" />}
            </div>

            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base font-semibold leading-tight sm:text-xl">
                {isLoading ? <Skeleton className="h-5 w-52" /> : productName || 'Detalle de garantía'}
              </DialogTitle>

              {garantia ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="h-5 gap-1 border-emerald-200 bg-emerald-50 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                  >
                    <QrCode className="size-3" />
                    {garantia.codigoQR}
                  </Badge>

                  <Badge
                    variant="outline"
                    className={cn(
                      'h-5 gap-1.5 text-xs',
                      garantia.estado === EstadoGarantia.ACTIVA
                        ? 'border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : garantia.estado === EstadoGarantia.VENCIDA
                          ? 'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'border-destructive/20 bg-destructive/10 text-destructive',
                    )}
                  >
                    {garantia.estado === EstadoGarantia.ACTIVA ? (
                      <span className="relative flex size-1.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-green-500" />
                      </span>
                    ) : garantia.estado === EstadoGarantia.VENCIDA ? (
                      <Clock className="size-3" />
                    ) : (
                      <AlertCircle className="size-3" />
                    )}
                    {ESTADO_LABELS[garantia.estado]}
                  </Badge>

                  <Badge
                    variant={isVigente ? 'default' : 'outline'}
                    className={cn(
                      'h-5 gap-1.5 text-xs',
                      isVigente
                        ? 'border-primary/20 bg-primary/10 text-primary'
                        : 'text-muted-foreground',
                    )}
                  >
                    {isVigente ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                    {isVigente ? 'Vigente' : 'No vigente'}
                  </Badge>
                </div>
              ) : null}

              <DialogDescription className="sr-only">
                Información detallada de la garantía y sus casos asociados.
              </DialogDescription>
            </div>

            {canEdit && garantia ? (
              <Button
                variant="outline"
                size="sm"
                className="mr-8 h-8 shrink-0 gap-1.5 sm:mr-10"
                onClick={() => onEdit?.(garantia)}
              >
                <Pencil className="size-3.5" />
                <span className="hidden text-xs sm:inline">Editar</span>
              </Button>
            ) : null}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {isLoading ? (
            <DetailSkeleton />
          ) : isError || !garantia ? (
            <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
              No se pudo cargar la información de la garantía.
            </div>
          ) : (
            <Tabs defaultValue="informacion" className="flex h-full flex-col gap-4">
              <TabsList className="mb-4 h-10 w-full shrink-0">
                <TabsTrigger value="informacion" className="flex-1 gap-1.5 text-xs sm:text-sm">
                  <FileText className="size-3.5 shrink-0" />
                  Información
                </TabsTrigger>
                <TabsTrigger value="casos" className="flex-1 gap-1.5 text-xs sm:text-sm">
                  <Wrench className="size-3.5 shrink-0" />
                  Casos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="informacion" className="mt-0 data-[state=active]:animate-fade-up">
                <div className="flex flex-col gap-3 sm:gap-4">
                  <section className="rounded-xl border border-border/50 border-l-[3px] border-l-emerald-400 bg-card p-4 sm:p-5 dark:border-l-emerald-800">
                    <div className="mb-4 flex items-center gap-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-600 ring-2 ring-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400 dark:ring-emerald-900/30">
                        1
                      </span>
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                        <ScanSearch className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">Equipo y cliente</h3>
                    </div>

                    <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                      <InfoItem label="Producto" value={garantia.equipo.producto.nombre} icon={ShieldCheck} />
                      <InfoItem label="Modelo" value={garantia.equipo.producto.modelo} icon={Wrench} />
                      <InfoItem label="Marca" value={marcaNombre} icon={ShieldCheck} />
                      <InfoItem label="N.° de serie" value={garantia.equipo.numeroSerie} icon={QrCode} copyable />
                      <InfoItem label="Cliente" value={garantia.clienteNombre} icon={User} />
                      <InfoItem label="Código QR" value={garantia.codigoQR} icon={QrCode} copyable />
                    </div>
                  </section>

                  <section className="rounded-xl border border-border/50 border-l-[3px] border-l-blue-400 bg-card p-4 sm:p-5 dark:border-l-blue-800">
                    <div className="mb-4 flex items-center gap-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-600 ring-2 ring-blue-100 dark:bg-blue-900/40 dark:text-blue-400 dark:ring-blue-900/30">
                        2
                      </span>
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
                        <Calendar className="size-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">Vigencia</h3>
                    </div>

                    <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                      <InfoItem label="Estado" value={ESTADO_LABELS[garantia.estado]} icon={CheckCircle2} />
                      <InfoItem label="Inicio" value={formatDate(garantia.fechaInicio)} icon={Calendar} />
                      <InfoItem label="Vence" value={formatDate(garantia.fechaFin)} icon={Clock} />
                      <InfoItem label="Vigencia" value={isVigente ? 'Vigente' : 'No vigente'} icon={ShieldCheck} />
                      <InfoItem label="Venta asociada" value={garantia.ventaId} icon={FileText} copyable />
                    </div>
                  </section>

                  <section className="rounded-xl border border-border/50 border-l-[3px] border-l-orange-400 bg-card p-4 sm:p-5 dark:border-l-orange-800">
                    <div className="mb-4 flex items-center gap-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-bold text-orange-600 ring-2 ring-orange-100 dark:bg-orange-900/40 dark:text-orange-400 dark:ring-orange-900/30">
                        3
                      </span>
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/40">
                        <FileText className="size-3.5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">Cobertura y exclusiones</h3>
                    </div>

                    <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                          Cobertura
                        </span>
                        <p className="whitespace-pre-wrap text-sm text-foreground/90">{garantia.cobertura}</p>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                          Exclusiones
                        </span>
                        <p className="whitespace-pre-wrap text-sm text-foreground/90">
                          {garantia.exclusiones || 'No se registraron exclusiones'}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-xl border border-border/50 bg-card p-4 sm:p-5">
                    <div className="mb-4 flex items-center gap-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                        4
                      </span>
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-muted/70">
                        <Clock className="size-3.5 text-muted-foreground" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">Auditoría</h3>
                    </div>

                    <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                      <AuditItem label="Creado" value={garantia.createdAt} icon={Calendar} />
                      <AuditItem label="Actualizado" value={garantia.updatedAt} icon={Clock} />
                    </div>
                  </section>
                </div>
              </TabsContent>

              <TabsContent value="casos" className="mt-0 data-[state=active]:animate-fade-up">
                <div className="flex flex-col gap-3 sm:gap-4">
                  <section className="rounded-xl border border-border/50 border-l-[3px] border-l-violet-400 bg-card p-4 sm:p-5 dark:border-l-violet-800">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-600 ring-2 ring-violet-100 dark:bg-violet-900/40 dark:text-violet-400 dark:ring-violet-900/30">
                          {garantia.casos.length}
                        </span>
                        <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40">
                          <Wrench className="size-3.5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">Casos registrados</h3>
                          <p className="text-xs text-muted-foreground">Seguimiento de reclamos y resoluciones</p>
                        </div>
                      </div>

                      {canManageCasos && garantia.estado === EstadoGarantia.ACTIVA ? (
                        <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-lg" onClick={() => onCreateCaso?.(garantia.id)}>
                          <MessageSquarePlus className="size-3.5" />
                          <span className="hidden sm:inline">Nuevo caso</span>
                        </Button>
                      ) : null}
                    </div>

                    {garantia.casos.length > 0 ? (
                      <div className="flex flex-col gap-3">
                        {garantia.casos.map((caso) => (
                          <article key={caso.id} className="rounded-xl border border-border/60 bg-background/70 p-3.5 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-foreground">{caso.descripcion}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(caso.createdAt)}</p>
                              </div>

                              <div className="flex shrink-0 items-center gap-1.5">
                                {caso.aceptada === true ? (
                                  <Badge variant="outline" className="border-green-200 bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400">
                                    Aceptado
                                  </Badge>
                                ) : caso.aceptada === false ? (
                                  <Badge variant="outline" className="border-destructive/20 bg-destructive/10 text-destructive">
                                    Rechazado
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                    Pendiente
                                  </Badge>
                                )}

                                {canManageCasos ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 gap-1.5 rounded-lg px-2.5 text-xs"
                                    onClick={() => onUpdateCaso?.(garantia.id, caso)}
                                  >
                                    <Pencil className="size-3.5" />
                                    Editar
                                  </Button>
                                ) : null}
                              </div>
                            </div>

                            {caso.resolucion ? (
                              <div className="mt-3 rounded-lg bg-muted/40 p-3 text-sm text-foreground/90">
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                                  Resolución
                                </p>
                                <p className="whitespace-pre-wrap">{caso.resolucion}</p>
                              </div>
                            ) : null}

                            {caso.motivo ? (
                              <div className="mt-2 rounded-lg border border-destructive/10 bg-destructive/5 p-3 text-sm text-foreground/90">
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                                  Motivo de rechazo
                                </p>
                                <p className="whitespace-pre-wrap">{caso.motivo}</p>
                              </div>
                            ) : null}
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 px-4 py-12 text-center text-muted-foreground">
                        <Wrench className="size-10 opacity-25" />
                        <div>
                          <p className="text-sm font-medium">No hay casos registrados</p>
                          <p className="mt-1 text-xs opacity-70">Esta garantía aún no tiene reclamos ni seguimientos asociados.</p>
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}