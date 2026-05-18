'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import {
  CheckCircle2,
  Download,
  Filter,
  RefreshCcw,
  ScrollText,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { type AuditoriaListItem } from '@erp/shared'
import { toast } from 'sonner'

import { useAuditoria } from '@/hooks/use-configuracion'
import { useDebounce } from '@/hooks/use-debounce'
import {
  readStoredAuditoriaAutoRefreshPreference,
  writeStoredAuditoriaAutoRefreshPreference,
} from '@/lib/auditoria-auto-refresh'
import { cn } from '@/lib/utils'
import { AutoRefreshControl } from '@/components/layout/auto-refresh-control'
import { PageActionsMenu } from '@/components/layout/page-actions-menu'
import { PageHeader } from '@/components/layout/page-header'
import { StatCard } from '@/components/layout/stat-card'
import { ToolbarFiltersButton } from '@/components/layout/toolbar-filters-button'
import { ToolbarSearchInput } from '@/components/layout/toolbar-search-input'
import { ErpBadge, type ErpBadgeTone } from '@/components/erp-badges'
import { ServerDataTable } from '@/components/tables/ServerDataTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const DEFAULT_LIMIT = 20
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
const REFRESH_INTERVALS = [
  { label: '30 s', value: 30_000 },
  { label: '1 min', value: 60_000 },
  { label: '5 min', value: 300_000 },
  { label: '15 min', value: 900_000 },
]

const AUDITORIA_REFRESH_TOAST_ID = 'auditoria-refresh'
const AUDITORIA_AUTO_REFRESH_TOAST_ID = 'auditoria-auto-refresh'

const ACCION_META: Record<string, { label: string; tone: ErpBadgeTone }> = {
  CREAR: {
    label: 'Crear',
    tone: 'success',
  },
  ACTUALIZAR: {
    label: 'Actualizar',
    tone: 'info',
  },
  ELIMINAR: {
    label: 'Eliminar',
    tone: 'danger',
  },
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatModelo(modelo: string) {
  return modelo.replace(/_/g, ' ')
}

function shortenId(value: string | null) {
  if (!value) {
    return null
  }

  return value.length > 14 ? `${value.slice(0, 8)}...` : value
}

function getAccionMeta(accion: string) {
  return ACCION_META[accion] ?? {
    label: accion,
    tone: 'neutral',
  }
}

function exportToCSV(rows: AuditoriaListItem[], filename: string) {
  const header = ['Fecha', 'Acción', 'Módulo', 'Referencia', 'Usuario', 'Email', 'Registro']
  const lines = rows.map((row) => [
    `"${formatDateTime(row.createdAt)}"`,
    getAccionMeta(row.accion).label,
    `"${formatModelo(row.modelo)}"`,
    row.modeloId ?? '',
    `"${row.usuario?.nombre ?? 'Sistema'}"`,
    row.usuario?.email ?? '',
    row.id,
  ].join(','))

  const blob = new Blob([[header.join(','), ...lines].join('\n')], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}


export default function AuditoriaPage() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const [search, setSearch] = useState('')
  const [selectionMode, setSelectionMode] = useState(false)
  const [accionFilter, setAccionFilter] = useState<string>('all')
  const [filtrosOpen, setFiltrosOpen] = useState(false)
  const [modeloFilter, setModeloFilter] = useState('')
  const [fechaDesde, setFechaDesde] = useState<string | undefined>()
  const [fechaHasta, setFechaHasta] = useState<string | undefined>()
  const [draftModelo, setDraftModelo] = useState('')
  const [draftDesde, setDraftDesde] = useState('')
  const [draftHasta, setDraftHasta] = useState('')
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(() =>
    readStoredAuditoriaAutoRefreshPreference().enabled,
  )
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(() =>
    readStoredAuditoriaAutoRefreshPreference().interval,
  )

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const debouncedSearch = useDebounce(search, 300)

  const auditoriaFilters = useMemo(() => ({
    page,
    limit,
    search: debouncedSearch || undefined,
    accion: accionFilter !== 'all' ? accionFilter : undefined,
    modelo: modeloFilter || undefined,
    fechaDesde,
    fechaHasta,
  }), [page, limit, debouncedSearch, accionFilter, modeloFilter, fechaDesde, fechaHasta])

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useAuditoria(auditoriaFilters)

  const rows = useMemo(() => data?.data ?? [], [data?.data])
  const total = data?.meta?.total ?? 0
  const currentPage = data?.meta?.page ?? page
  const uniqueUsers = new Set(rows.map((row) => row.usuario?.id).filter(Boolean)).size
  const activeFilterCount = (modeloFilter ? 1 : 0) + (fechaDesde ? 1 : 0) + (fechaHasta ? 1 : 0)

  const refetchAll = useCallback(async () => {
    await refetch()
  }, [refetch])

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (autoRefreshEnabled) {
      intervalRef.current = setInterval(() => {
        void refetchAll()
      }, autoRefreshInterval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoRefreshEnabled, autoRefreshInterval, refetchAll])

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  const openFiltrosPopover = useCallback((open: boolean) => {
    setFiltrosOpen(open)

    if (open) {
      setDraftModelo(modeloFilter)
      setDraftDesde(fechaDesde ?? '')
      setDraftHasta(fechaHasta ?? '')
    }
  }, [modeloFilter, fechaDesde, fechaHasta])

  const applyFiltros = useCallback(() => {
    if (draftDesde && draftHasta && draftDesde > draftHasta) {
      toast.error('La fecha inicial no puede ser mayor que la final', { duration: 1800 })
      return
    }

    setModeloFilter(draftModelo.trim())
    setFechaDesde(draftDesde || undefined)
    setFechaHasta(draftHasta || undefined)
    setPage(1)
    setFiltrosOpen(false)
  }, [draftDesde, draftHasta, draftModelo])

  const clearFiltros = useCallback(() => {
    setDraftModelo('')
    setDraftDesde('')
    setDraftHasta('')
    setModeloFilter('')
    setFechaDesde(undefined)
    setFechaHasta(undefined)
    setPage(1)
    setFiltrosOpen(false)
  }, [])

  const handleToggleAutoRefresh = useCallback((enabled: boolean) => {
    setAutoRefreshEnabled(enabled)
    writeStoredAuditoriaAutoRefreshPreference({ enabled, interval: autoRefreshInterval })
  }, [autoRefreshInterval])

  const handleChangeInterval = useCallback((interval: number) => {
    setAutoRefreshInterval(interval)
    writeStoredAuditoriaAutoRefreshPreference({ enabled: autoRefreshEnabled, interval })
  }, [autoRefreshEnabled])

  const handleManualRefresh = useCallback(() => {
    void refetchAll()
    toast.info('Auditoría actualizada', { id: AUDITORIA_REFRESH_TOAST_ID, duration: 1600 })
  }, [refetchAll])

  const handleExportCSV = useCallback(() => {
    if (rows.length === 0) {
      toast.info('No hay registros para exportar', { duration: 1600 })
      return
    }

    exportToCSV(rows, `auditoria-${new Date().toISOString().slice(0, 10)}.csv`)
    toast.success('CSV exportado', { duration: 1600 })
  }, [rows])

  const columns = useMemo<ColumnDef<AuditoriaListItem, unknown>[]>(() => [
    {
      accessorKey: 'createdAt',
      header: 'Fecha',
      size: 170,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {formatDateTime(row.original.createdAt)}
        </span>
      ),
    },
    {
      accessorKey: 'accion',
      header: 'Acción',
      size: 120,
        cell: ({ row }) => {
          const meta = getAccionMeta(row.original.accion)
          return (
            <ErpBadge tone={meta.tone} className="whitespace-nowrap">
              {meta.label}
            </ErpBadge>
          )
        },
      },
    {
      accessorKey: 'modelo',
      header: 'Módulo',
      size: 180,
      cell: ({ row }) => (
        <span className="text-sm font-medium">{formatModelo(row.original.modelo)}</span>
      ),
    },
    {
      id: 'usuario',
      header: 'Usuario',
      size: 220,
      cell: ({ row }) => (
        row.original.usuario ? (
          <div className="flex flex-col max-w-[220px]">
            <span className="truncate font-medium" title={row.original.usuario.nombre}>
              {row.original.usuario.nombre}
            </span>
            <span className="truncate text-xs text-muted-foreground" title={row.original.usuario.email}>
              {row.original.usuario.email}
            </span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Sistema</span>
        )
      ),
    },
    {
      accessorKey: 'modeloId',
      header: 'Referencia',
      size: 150,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {shortenId(row.original.modeloId) ?? 'Sin referencia'}
        </span>
      ),
    },
    {
      accessorKey: 'id',
      header: 'Registro',
      size: 140,
      meta: { defaultHidden: true },
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">{shortenId(row.original.id)}</span>
      ),
    },
  ], [])

  return (
    <div className="flex flex-col gap-5 w-full min-w-0 flex-1 min-h-0">
      <PageHeader
        title="Auditoría"
        description="Revisa el historial operativo y los cambios registrados en el sistema."
        hideTitleVisually
        actions={
          <>
            <AutoRefreshControl
              enabled={autoRefreshEnabled}
              interval={autoRefreshInterval}
              intervals={REFRESH_INTERVALS}
              switchId="auditoria-auto-refresh"
              onEnabledChange={(value) => {
                handleToggleAutoRefresh(value)
                if (value) {
                  toast.success('Auto-refresh activado', { id: AUDITORIA_AUTO_REFRESH_TOAST_ID, duration: 1800 })
                } else {
                  toast.info('Auto-refresh desactivado', { id: AUDITORIA_AUTO_REFRESH_TOAST_ID, duration: 1800 })
                }
              }}
              onIntervalChange={handleChangeInterval}
              onManualRefresh={handleManualRefresh}
              className={cn(isFetching && 'border-primary/20')}
            />
            <PageActionsMenu
              items={[
                { label: 'Actualizar lista', icon: RefreshCcw, onSelect: handleManualRefresh },
                { label: 'Exportar CSV', icon: Download, onSelect: handleExportCSV },
              ]}
            />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total registros"
          value={total}
          icon={ScrollText}
          color="bg-primary/10 text-primary"
          index={0}
          isLoading={isLoading}
        />
        <StatCard
          label="En página"
          value={rows.length}
          icon={Filter}
          color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
          index={1}
          isLoading={isLoading}
        />
        <StatCard
          label="Usuarios visibles"
          value={uniqueUsers}
          icon={UserRound}
          color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
          index={2}
          isLoading={isLoading}
        />
        <StatCard
          label="Página actual"
          value={currentPage}
          icon={ShieldCheck}
          color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          index={3}
          isLoading={isLoading}
        />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <ToolbarSearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Buscar por módulo, acción, usuario o referencia…"
            inputClassName="border-border/60 bg-background/40 hover:bg-muted/60"
          />

          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
            <Tabs
              value={accionFilter}
              onValueChange={(value) => {
                setAccionFilter(value)
                setPage(1)
              }}
            >
              <TabsList className="h-9 gap-0.5 overflow-x-auto rounded-lg border border-border bg-muted p-0.5">
                <TabsTrigger value="all" className="h-8 shrink-0 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-background/75 data-[state=active]:text-foreground data-[state=active]:shadow-none">
                  Todo
                </TabsTrigger>
                <TabsTrigger value="CREAR" className="h-8 shrink-0 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-background/75 data-[state=active]:text-foreground data-[state=active]:shadow-none">
                  Crear
                </TabsTrigger>
                <TabsTrigger value="ACTUALIZAR" className="h-8 shrink-0 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-background/75 data-[state=active]:text-foreground data-[state=active]:shadow-none">
                  Actualizar
                </TabsTrigger>
                <TabsTrigger value="ELIMINAR" className="h-8 shrink-0 rounded-md px-3 text-xs text-muted-foreground data-[state=active]:bg-background/75 data-[state=active]:text-foreground data-[state=active]:shadow-none">
                  Eliminar
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Popover open={filtrosOpen} onOpenChange={openFiltrosPopover}>
              <PopoverTrigger asChild>
                <ToolbarFiltersButton
                  open={filtrosOpen}
                  activeCount={activeFilterCount}
                />
              </PopoverTrigger>
              <PopoverContent
                align="end"
                sideOffset={10}
                className="w-[280px] rounded-xl border border-border/70 p-0 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.4)]"
              >
                <div className="border-b border-border/60 px-4 py-3">
                  <p className="text-sm font-semibold">Filtros</p>
                  <p className="text-xs text-muted-foreground">Refina la bitácora visible</p>
                </div>

                <div className="space-y-4 px-4 py-4">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Módulo
                    </p>
                    <Input
                      value={draftModelo}
                      onChange={(event) => setDraftModelo(event.target.value)}
                      placeholder="Ej. clientes, ventas, config"
                      className="h-9 rounded-lg text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Desde
                      </p>
                      <Input
                        type="date"
                        value={draftDesde}
                        onChange={(event) => setDraftDesde(event.target.value)}
                        className="h-9 rounded-lg text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                        Hasta
                      </p>
                      <Input
                        type="date"
                        value={draftHasta}
                        onChange={(event) => setDraftHasta(event.target.value)}
                        className="h-9 rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-lg text-xs text-muted-foreground"
                      onClick={clearFiltros}
                    >
                      Limpiar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 rounded-lg text-xs"
                      onClick={applyFiltros}
                    >
                      Aplicar filtros
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant={selectionMode ? 'secondary' : 'outline'}
              size="sm"
              className="h-9 gap-1.5 rounded-lg text-xs"
              onClick={() => setSelectionMode((value) => !value)}
            >
              <CheckCircle2 className="size-3.5" />
              {selectionMode ? 'Cancelar' : 'Seleccionar'}
            </Button>
          </div>
        </div>
      </div>

      <ServerDataTable
        columns={columns}
        data={rows}
        total={total}
        page={currentPage}
        limit={limit}
        isLoading={isLoading}
        isError={isError}
        errorMessage={error instanceof Error ? error.message : 'No se pudo cargar la auditoría.'}
        onRetry={() => {
          void refetchAll()
        }}
        onPageChange={setPage}
        onLimitChange={(nextLimit) => {
          setLimit(nextLimit)
          setPage(1)
        }}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        enableRowSelection={selectionMode}
        enableColumnVisibility
        enableColumnResizing
        columnVisibilityStorageKey="erp:auditoria:table-columns"
        bulkActionsBar={(selectedRows, clearSelection) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 rounded-xl text-xs"
              onClick={() => {
                const typedRows = selectedRows as AuditoriaListItem[]
                exportToCSV(typedRows, 'auditoria-seleccion.csv')
                toast.success(`${typedRows.length} registros exportados`)
                clearSelection()
              }}
            >
              <Download className="size-3.5" /> Exportar
            </Button>
          </div>
        )}
        emptyMessage="Sin registros de auditoría"
        emptyDescription={
          search || accionFilter !== 'all' || activeFilterCount > 0
            ? 'No hay actividad para los filtros aplicados.'
            : 'Cuando se registren cambios, aparecerán aquí.'
        }
      />
    </div>
  )
}
