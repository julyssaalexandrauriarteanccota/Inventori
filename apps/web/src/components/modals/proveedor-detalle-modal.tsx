'use client'

import {
  Building2,
  Calendar,
  Clock,
  Copy,
  FileText,
  Info,
  Mail,
  MapPin,
  Pencil,
  Phone,
  User,
} from 'lucide-react'
import { toast } from 'sonner'

import { useProveedor } from '@/hooks/use-proveedores'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
      <div className="flex items-center gap-1.5 min-w-0">
        {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground/50" />}
        <span className="text-sm font-medium text-foreground truncate">
          {value || <span className="text-muted-foreground/40 font-normal italic text-xs">—</span>}
        </span>
        {copyable && value && (
          <button
            onClick={() => {
              void navigator.clipboard.writeText(value)
              toast.success('Copiado al portapapeles', { duration: 1500 })
            }}
            title="Copiar"
            className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-muted"
          >
            <Copy className="size-3 text-muted-foreground/50" />
          </button>
        )}
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
  const formatted = value
    ? new Date(value).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/70 ring-1 ring-border/50">
        <Icon className="size-3.5 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          {label}
        </span>
        <span className="text-sm font-medium tabular-nums">{formatted ?? '—'}</span>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: 3 }).map((_, s) => (
        <div key={s} className="rounded-2xl border border-border/40 bg-card/50 p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-4 w-32" />
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
  )
}

interface ProveedorDetalleModalProps {
  id: string | null
  onClose: () => void
  onEdit?: (proveedor: Record<string, unknown>) => void
  canEdit?: boolean
}

export function ProveedorDetalleModal({
  id,
  onClose,
  onEdit,
  canEdit,
}: ProveedorDetalleModalProps) {
  const { data: proveedorRes, isLoading, isError } = useProveedor(id ?? undefined)
  const proveedor = proveedorRes?.data as Record<string, unknown> | undefined

  if (!id) return null

  const razonSocial = (proveedor?.razonSocial as string) ?? ''
  const initials = razonSocial
    ? razonSocial
        .split(' ')
        .slice(0, 2)
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
    : '?'

  return (
    <Dialog open={!!id} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[88vh] w-full max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[24px] border border-border/60 bg-background p-0 shadow-2xl sm:max-w-2xl md:max-w-4xl lg:max-w-5xl">

        {/* ── HEADER ── */}
        <DialogHeader className="shrink-0 border-b border-border/40 bg-background px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3 sm:gap-4">

            {/* Avatar */}
            <div
              className={cn(
                'flex size-12 sm:size-14 shrink-0 items-center justify-center rounded-2xl font-bold text-base sm:text-lg select-none shadow-md ring-2 ring-background dark:ring-border transition-all',
                isLoading
                  ? 'bg-muted ring-0 shadow-none text-muted-foreground'
                  : 'bg-gradient-to-br from-blue-500 to-blue-700 dark:from-blue-700 dark:to-blue-900 text-white',
              )}
            >
              {isLoading ? '…' : initials}
            </div>

            {/* Title + badges */}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base sm:text-xl font-semibold leading-tight truncate">
                {isLoading ? <Skeleton className="h-5 w-48" /> : (razonSocial || 'Cargando...')}
              </DialogTitle>
              {proveedor && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className="text-xs h-5 gap-1 font-medium bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                  >
                    <Building2 className="size-3" />
                    RUC {proveedor.ruc as string}
                  </Badge>
                  <Badge
                    variant={(proveedor.activo as boolean) ? 'default' : 'outline'}
                    className={cn(
                      'text-xs h-5 gap-1.5',
                      (proveedor.activo as boolean)
                        ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                        : 'text-muted-foreground',
                    )}
                  >
                    {(proveedor.activo as boolean) ? (
                      <span className="relative flex size-1.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex size-1.5 rounded-full bg-green-500" />
                      </span>
                    ) : (
                      <span className="size-1.5 rounded-full inline-block bg-muted-foreground/40" />
                    )}
                    {(proveedor.activo as boolean) ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
              )}
              <DialogDescription className="sr-only">
                Información detallada del proveedor.
              </DialogDescription>
            </div>

            {/* Edit button */}
            {canEdit && proveedor && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0 mr-8 sm:mr-10 h-8"
                onClick={() => onEdit?.(proveedor)}
              >
                <Pencil className="size-3.5" />
                <span className="hidden sm:inline text-xs">Editar</span>
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* ── BODY ── */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
          {isLoading ? (
            <DetailSkeleton />
          ) : isError || !proveedor ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
              No se pudo cargar la información del proveedor.
            </div>
          ) : (
            <Tabs defaultValue="informacion" className="flex h-full flex-col gap-4">
              <TabsList className="mb-4 h-10 w-full shrink-0">
                <TabsTrigger value="informacion" className="flex-1 gap-1.5 text-xs sm:text-sm">
                  <Info className="size-3.5 shrink-0" />
                  Información
                </TabsTrigger>
              </TabsList>

              {/* ── TAB: INFORMACIÓN ── */}
              <TabsContent value="informacion" className="mt-0 data-[state=active]:animate-fade-up">
                <div className="flex flex-col gap-3 sm:gap-4">

                  {/* 1 — Datos fiscales */}
                  <section className="rounded-xl border border-border/50 border-l-[3px] border-l-blue-400 dark:border-l-blue-800 bg-card p-4 sm:p-5">
                    <div className="mb-4 flex items-center gap-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 ring-2 ring-blue-100 dark:ring-blue-900/30">
                        1
                      </span>
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
                        <Building2 className="size-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">Datos fiscales</h3>
                    </div>
                    <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                      <InfoItem label="Razón Social" value={proveedor.razonSocial as string} icon={Building2} />
                      <InfoItem label="RUC" value={proveedor.ruc as string} copyable />
                    </div>
                  </section>

                  {/* 2 — Contacto */}
                  <section className="rounded-xl border border-border/50 border-l-[3px] border-l-green-400 dark:border-l-green-800 bg-card p-4 sm:p-5">
                    <div className="mb-4 flex items-center gap-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-[11px] font-bold text-green-600 dark:bg-green-900/40 dark:text-green-400 ring-2 ring-green-100 dark:ring-green-900/30">
                        2
                      </span>
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/40">
                        <Phone className="size-3.5 text-green-600 dark:text-green-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">Contacto</h3>
                    </div>
                    <div className="grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
                      <InfoItem label="Email" value={proveedor.email as string} icon={Mail} copyable />
                      <InfoItem label="Teléfono" value={proveedor.telefono as string} icon={Phone} copyable />
                      <InfoItem label="Persona de contacto" value={proveedor.contactoNombre as string} icon={User} />
                      <InfoItem label="Tel. contacto" value={proveedor.contactoTelefono as string} icon={Phone} copyable />
                    </div>
                  </section>

                  {/* 3 — Ubicación y notas */}
                  <section className="rounded-xl border border-border/50 border-l-[3px] border-l-orange-400 dark:border-l-orange-800 bg-card p-4 sm:p-5">
                    <div className="mb-4 flex items-center gap-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-bold text-orange-600 dark:bg-orange-900/40 dark:text-orange-400 ring-2 ring-orange-100 dark:ring-orange-900/30">
                        3
                      </span>
                      <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/40">
                        <MapPin className="size-3.5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">Ubicación y notas</h3>
                    </div>
                    <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                      <InfoItem label="Dirección" value={proveedor.direccion as string} icon={MapPin} />
                    </div>
                    {(proveedor.notas as string) && (
                      <div className="mt-4 border-t border-border/40 pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="size-3.5 text-muted-foreground/50" />
                          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Notas
                          </p>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-foreground/90">
                          {proveedor.notas as string}
                        </p>
                      </div>
                    )}
                  </section>

                  {/* 4 — Auditoría */}
                  <section className="rounded-xl border border-border/50 border-l-[3px] border-l-border bg-muted/20 p-4 sm:p-5">
                    <div className="mb-4 flex items-center gap-2.5">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground ring-2 ring-muted">
                        4
                      </span>
                      <h3 className="text-sm font-semibold text-muted-foreground">Auditoría</h3>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <AuditItem
                        label="Registrado el"
                        value={proveedor.createdAt as string}
                        icon={Calendar}
                      />
                      <AuditItem
                        label="Última actualización"
                        value={proveedor.updatedAt as string}
                        icon={Clock}
                      />
                    </div>
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
