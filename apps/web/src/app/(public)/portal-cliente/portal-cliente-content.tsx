'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useComprobantePublico,
  useComprobantePublicoPorToken,
  type ComprobantePublicoLookup,
} from '@/hooks/use-public'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'

const TIPOS = [
  { value: 'FACTURA', label: 'Factura' },
  { value: 'BOLETA', label: 'Boleta' },
  { value: 'NOTA_CREDITO', label: 'Nota de crédito' },
  { value: 'NOTA_DEBITO', label: 'Nota de débito' },
] as const

const ESTADO_LABEL: Record<string, { label: string; tone: string }> = {
  PENDIENTE_ENVIO: { label: 'Pendiente de envío', tone: 'bg-muted text-muted-foreground' },
  EN_PROCESO_SUNAT: { label: 'En proceso SUNAT', tone: 'bg-blue-500/15 text-blue-700' },
  ACEPTADO: { label: 'Aceptado por SUNAT', tone: 'bg-emerald-500/15 text-emerald-700' },
  ACEPTADO_CON_OBSERVACIONES: {
    label: 'Aceptado con observaciones',
    tone: 'bg-amber-500/15 text-amber-700',
  },
  RECHAZADO: { label: 'Rechazado por SUNAT', tone: 'bg-rose-500/15 text-rose-700' },
  REQUIERE_REVISION: {
    label: 'Requiere revisión',
    tone: 'bg-rose-500/15 text-rose-700',
  },
  BAJA_PENDIENTE: { label: 'Baja en proceso', tone: 'bg-blue-500/15 text-blue-700' },
  ANULADO: { label: 'Anulado', tone: 'bg-zinc-700/15 text-zinc-700' },
}

interface FormState {
  rucEmisor: string
  tipo: string
  serie: string
  correlativo: string
  clienteDocTipo: string
  clienteDocNum: string
}

export function PortalClienteContent({ tokenConsulta }: { tokenConsulta?: string }) {
  const [form, setForm] = useState<FormState>({
    rucEmisor: '',
    tipo: 'FACTURA',
    serie: '',
    correlativo: '',
    clienteDocTipo: 'RUC',
    clienteDocNum: '',
  })
  const [params, setParams] = useState<FormState | null>(null)

  const lookupQuery = useComprobantePublico(params)
  const tokenQuery = useComprobantePublicoPorToken(tokenConsulta ?? null)
  const query = tokenConsulta ? tokenQuery : lookupQuery
  const comprobante = query.data?.data

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (
      form.rucEmisor.trim().length === 11 &&
      form.serie.trim().length > 0 &&
      form.correlativo.trim().length > 0 &&
      form.clienteDocNum.trim().length > 0
    ) {
      setParams({ ...form })
    }
  }

  return (
    <div className="mt-8 space-y-8">
      {!tokenConsulta && (
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6"
        >
          <Input
            placeholder="RUC del emisor"
            value={form.rucEmisor}
            maxLength={11}
            inputMode="numeric"
            onChange={(e) =>
              setForm((s) => ({ ...s, rucEmisor: e.target.value.trim() }))
            }
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={form.tipo}
            onChange={(e) => setForm((s) => ({ ...s, tipo: e.target.value }))}
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <Input
            placeholder="Serie (ej. F001)"
            value={form.serie}
            onChange={(e) =>
              setForm((s) => ({ ...s, serie: e.target.value.trim().toUpperCase() }))
            }
          />
          <Input
            placeholder="Correlativo"
            value={form.correlativo}
            inputMode="numeric"
            onChange={(e) =>
              setForm((s) => ({ ...s, correlativo: e.target.value.trim() }))
            }
          />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={form.clienteDocTipo}
            onChange={(e) =>
              setForm((s) => ({ ...s, clienteDocTipo: e.target.value }))
            }
          >
            <option value="DNI">DNI</option>
            <option value="RUC">RUC</option>
            <option value="CE">CE</option>
          </select>
          <div className="flex gap-2">
            <Input
              placeholder="Doc. receptor"
              value={form.clienteDocNum}
              onChange={(e) =>
                setForm((s) => ({ ...s, clienteDocNum: e.target.value.trim() }))
              }
              className="flex-1"
            />
            <Button type="submit">Consultar</Button>
          </div>
        </form>
      )}

      {query.isLoading && (params || tokenConsulta) && (
        <div className="space-y-4">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      )}

      {query.isError && (params || tokenConsulta) && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="font-medium text-destructive">
              No se encontró un comprobante con esos datos.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Verifica que el RUC, serie y correlativo sean correctos.
            </p>
          </CardContent>
        </Card>
      )}

      {comprobante && <ComprobanteCard comprobante={comprobante} />}
    </div>
  )
}

function ComprobanteCard({ comprobante }: { comprobante: ComprobantePublicoLookup }) {
  const token = comprobante.tokenConsulta

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-2xl">{comprobante.numero}</CardTitle>
            <CardDescription>
              Emitido por {comprobante.emisorRazonSocial} (RUC{' '}
              {comprobante.emisorRuc})
            </CardDescription>
          </div>
          <Badge className={ESTADO_LABEL[comprobante.estado]?.tone ?? 'bg-muted'}>
            {ESTADO_LABEL[comprobante.estado]?.label ?? comprobante.estado}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Receptor" value={comprobante.clienteNombre} />
          <Field
            label={comprobante.clienteDocTipo || 'Documento'}
            value={comprobante.clienteDocNum}
          />
          <Field
            label="Fecha de emisión"
            value={new Date(comprobante.fechaEmision).toLocaleString('es-PE')}
          />
          <Field
            label="CDR recibido"
            value={
              comprobante.cdrRecibidaAt
                ? new Date(comprobante.cdrRecibidaAt).toLocaleString('es-PE')
                : '—'
            }
          />
          <Field
            label="Subtotal"
            value={`S/ ${Number(comprobante.subtotal ?? 0).toFixed(2)}`}
          />
          <Field label="IGV" value={`S/ ${Number(comprobante.igv ?? 0).toFixed(2)}`} />
          <Field label="Total" value={`S/ ${Number(comprobante.total).toFixed(2)}`} />
          <Field label="Hash CPE" value={comprobante.hashCpe ?? '—'} />
        </div>

        {comprobante.detalles && comprobante.detalles.length > 0 && (
          <div className="overflow-hidden rounded-xl border">
            <div className="grid grid-cols-[48px_1fr_90px_110px] gap-2 bg-muted px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
              <span>#</span>
              <span>Descripción</span>
              <span className="text-right">Cant.</span>
              <span className="text-right">Total</span>
            </div>
            {comprobante.detalles.map((detalle) => (
              <div
                key={detalle.item}
                className="grid grid-cols-[48px_1fr_90px_110px] gap-2 border-t px-3 py-2"
              >
                <span>{detalle.item}</span>
                <span>{detalle.descripcion}</span>
                <span className="text-right">{Number(detalle.cantidad).toFixed(2)}</span>
                <span className="text-right">S/ {Number(detalle.total).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <DownloadButton token={token} artifact="xml" enabled={!!comprobante.hasXml}>
            Descargar XML
          </DownloadButton>
          <DownloadButton token={token} artifact="cdr" enabled={!!comprobante.hasCdr}>
            Descargar CDR
          </DownloadButton>
          <DownloadButton token={token} artifact="pdf" enabled={!!comprobante.hasPdf}>
            Descargar PDF
          </DownloadButton>
        </div>
      </CardContent>
    </Card>
  )
}

function DownloadButton({
  token,
  artifact,
  enabled,
  children,
}: {
  token: string
  artifact: 'xml' | 'cdr' | 'pdf'
  enabled: boolean
  children: React.ReactNode
}) {
  if (!enabled) {
    return (
      <Button type="button" variant="outline" disabled>
        {children}
      </Button>
    )
  }

  return (
    <Button asChild variant="outline">
      <a href={`${API_BASE_URL}/portal-cliente/c/${token}/descargas/${artifact}`}>
        {children}
      </a>
    </Button>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  )
}
