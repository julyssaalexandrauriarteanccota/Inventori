'use client'

import { useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown, Loader2, ReceiptText, Search, Send } from 'lucide-react'
import {
  EstadoComprobante,
  TipoDocumento,
  type ComprobanteListItem,
  type VentaPendienteFacturacionItem,
} from '@erp/shared'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ServerDataTable } from '@/components/tables/ServerDataTable'
import { useDebounce } from '@/hooks/use-debounce'
import {
  useComprobantes,
  useEmitirComprobante,
  useVentasPendientesFacturacion,
} from '@/hooks/use-facturacion'

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

const ESTADO_TONE: Record<EstadoComprobante, string> = {
  [EstadoComprobante.PENDIENTE_ENVIO]:
    'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  [EstadoComprobante.EN_PROCESO_SUNAT]: 'bg-primary/10 text-primary',
  [EstadoComprobante.ACEPTADO]:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  [EstadoComprobante.ACEPTADO_CON_OBSERVACIONES]:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
  [EstadoComprobante.RECHAZADO]:
    'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300',
  [EstadoComprobante.REQUIERE_REVISION]:
    'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
  [EstadoComprobante.BAJA_PENDIENTE]:
    'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  [EstadoComprobante.ANULADO]:
    'bg-neutral-100 text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400',
}

const TIPO_LABEL: Record<TipoDocumento, string> = {
  [TipoDocumento.FACTURA]: 'Factura',
  [TipoDocumento.BOLETA]: 'Boleta',
  [TipoDocumento.NOTA_CREDITO]: 'Nota de crédito',
  [TipoDocumento.NOTA_DEBITO]: 'Nota de débito',
}

export default function ComprobantesPage() {
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 300)
  const [page, setPage] = useState(1)
  const [pendingPage, setPendingPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [selectedVenta, setSelectedVenta] =
    useState<VentaPendienteFacturacionItem | null>(null)
  const [selectedTipo, setSelectedTipo] = useState<TipoDocumento>(
    TipoDocumento.BOLETA,
  )

  const comprobantesQuery = useComprobantes({
    page,
    limit,
    search: debounced || undefined,
  })
  const pendientesQuery = useVentasPendientesFacturacion({
    page: pendingPage,
    limit,
    search: debounced || undefined,
  })
  const emitir = useEmitirComprobante()

  const columns = useMemo<ColumnDef<ComprobanteListItem>[]>(
    () => [
      {
        accessorKey: 'numero',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 gap-1 px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Número
            <ArrowUpDown className="size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.numero}</span>
        ),
      },
      {
        accessorKey: 'tipo',
        header: 'Tipo',
        cell: ({ row }) => TIPO_LABEL[row.original.tipo] ?? row.original.tipo,
      },
      {
        id: 'cliente',
        header: 'Cliente',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span>{row.original.clienteNombre || '—'}</span>
            {row.original.clienteDocNum ? (
              <span className="font-mono text-[10px] text-muted-foreground">
                {row.original.clienteDocNum}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={`border-0 ${ESTADO_TONE[row.original.estado]}`}
          >
            {row.original.estado}
          </Badge>
        ),
      },
      {
        accessorKey: 'subtotal',
        header: () => <div className="text-right">Subtotal</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-xs tabular-nums">
            S/ {row.original.subtotal.toFixed(2)}
          </div>
        ),
        meta: { defaultHidden: true },
      },
      {
        accessorKey: 'igv',
        header: () => <div className="text-right">IGV</div>,
        cell: ({ row }) => (
          <div className="text-right font-mono text-xs tabular-nums">
            S/ {row.original.igv.toFixed(2)}
          </div>
        ),
        meta: { defaultHidden: true },
      },
      {
        accessorKey: 'total',
        header: () => <div className="text-right">Total</div>,
        cell: ({ row }) => (
          <div className="text-right font-semibold tabular-nums text-primary">
            S/ {row.original.total.toFixed(2)}
          </div>
        ),
      },
    ],
    [],
  )

  const pendingColumns = useMemo<ColumnDef<VentaPendienteFacturacionItem>[]>(
    () => [
      {
        accessorKey: 'numero',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 gap-1 px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Venta
            <ArrowUpDown className="size-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.numero}</span>
        ),
      },
      {
        id: 'cliente',
        header: 'Cliente',
        cell: ({ row }) => {
          const cliente = row.original.cliente
          const nombre =
            cliente.razonSocial ??
            [cliente.nombre, cliente.apellido].filter(Boolean).join(' ') ??
            'Cliente'
          const doc = cliente.ruc ?? cliente.dni
          return (
            <div className="flex flex-col">
              <span>{nombre}</span>
              {doc ? (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {doc}
                </span>
              ) : null}
            </div>
          )
        },
      },
      {
        accessorKey: 'estado',
        header: 'Venta',
        cell: ({ row }) => (
          <Badge variant="outline" className="border-primary/20 text-primary">
            {row.original.estado}
          </Badge>
        ),
      },
      {
        accessorKey: 'total',
        header: () => <div className="text-right">Total</div>,
        cell: ({ row }) => (
          <div className="text-right font-semibold tabular-nums text-primary">
            S/ {row.original.total.toFixed(2)}
          </div>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Acción</div>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              size="sm"
              className="h-8 gap-1"
              onClick={() => {
                const venta = row.original
                setSelectedVenta(venta)
                setSelectedTipo(
                  venta.cliente.ruc?.length === 11
                    ? TipoDocumento.FACTURA
                    : TipoDocumento.BOLETA,
                )
              }}
            >
              <Send className="size-3.5" /> Emitir
            </Button>
          </div>
        ),
      },
    ],
    [],
  )

  async function handleEmitir() {
    if (!selectedVenta) return
    await emitir.mutateAsync({
      ventaId: selectedVenta.id,
      tipo: selectedTipo,
    })
    setSelectedVenta(null)
    await Promise.all([
      pendientesQuery.refetch(),
      comprobantesQuery.refetch(),
    ])
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
            setPendingPage(1)
          }}
          placeholder="Buscar por número o cliente…"
          className="rounded-lg pl-8"
        />
      </div>

      <Tabs defaultValue="pendientes">
        <TabsList>
          <TabsTrigger value="pendientes">
            <ReceiptText className="size-4" /> Por emitir
          </TabsTrigger>
          <TabsTrigger value="emitidos">Emitidos</TabsTrigger>
        </TabsList>
        <TabsContent value="pendientes">
          <ServerDataTable
            columns={pendingColumns}
            data={pendientesQuery.data?.data ?? []}
            total={pendientesQuery.data?.meta?.total ?? 0}
            page={pendingPage}
            limit={limit}
            isLoading={pendientesQuery.isLoading}
            isError={pendientesQuery.isError}
            errorMessage="No se pudo cargar la bandeja de ventas por emitir."
            onRetry={() => void pendientesQuery.refetch()}
            onPageChange={setPendingPage}
            onLimitChange={(l) => {
              setLimit(l)
              setPendingPage(1)
              setPage(1)
            }}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            emptyMessage="Sin ventas por emitir"
            emptyDescription="No hay ventas confirmadas o entregadas pendientes de comprobante."
            enableColumnVisibility
            columnVisibilityStorageKey="erp:comprobantes:pendientes-columns"
          />
        </TabsContent>
        <TabsContent value="emitidos">
          <ServerDataTable
            columns={columns}
            data={comprobantesQuery.data?.data ?? []}
            total={comprobantesQuery.data?.meta?.total ?? 0}
            page={page}
            limit={limit}
            isLoading={comprobantesQuery.isLoading}
            isError={comprobantesQuery.isError}
            errorMessage="No se pudo cargar la lista de comprobantes."
            onRetry={() => void comprobantesQuery.refetch()}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l)
              setPage(1)
              setPendingPage(1)
            }}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            emptyMessage="Sin comprobantes"
            emptyDescription="No hay boletas, facturas ni notas emitidas."
            enableColumnVisibility
            columnVisibilityStorageKey="erp:comprobantes:table-columns"
          />
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!selectedVenta}
        onOpenChange={(open) => {
          if (!open) setSelectedVenta(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Emitir comprobante</DialogTitle>
            <DialogDescription>
              {selectedVenta
                ? `Venta ${selectedVenta.numero} por S/ ${selectedVenta.total.toFixed(2)}`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Tipo</label>
            <Select
              value={selectedTipo}
              onValueChange={(value) => setSelectedTipo(value as TipoDocumento)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TipoDocumento.FACTURA}>Factura</SelectItem>
                <SelectItem value={TipoDocumento.BOLETA}>Boleta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedVenta(null)}
              disabled={emitir.isPending}
            >
              Cancelar
            </Button>
            <Button onClick={() => void handleEmitir()} disabled={emitir.isPending}>
              {emitir.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Emitir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
