'use client'

/**
 * Recibo térmico 80mm (HTML in iframe + window.print()).
 * No depende de @react-pdf/renderer ni de un endpoint backend de PDF.
 * El componente padre controla apertura via prop `open`.
 */

import { useEffect, useMemo, useRef } from 'react'
import { Printer, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface ThermalReceiptItem {
  sku?: string | null
  nombre: string
  cantidad: number
  precioUnitario: number
  total: number
}

export interface ThermalReceiptData {
  empresa: {
    nombre: string
    ruc?: string
    direccion?: string
    telefono?: string
  }
  comprobante: {
    tipo: 'BOLETA' | 'FACTURA' | string
    serie?: string
    numero?: string
    fecha: string // ISO
  }
  cliente: {
    nombre: string
    docTipo?: string
    docNumero?: string
  }
  items: ThermalReceiptItem[]
  totales: {
    subtotal: number
    igv: number
    total: number
  }
  pago?: {
    metodo?: string
    referencia?: string
  }
  ventaNumero?: string
}

const formatPEN = (v: number) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(v ?? 0)

function buildHtml(data: ThermalReceiptData) {
  const itemsRows = data.items
    .map(
      (it) => `
        <tr>
          <td class="qty">${it.cantidad}</td>
          <td class="desc">
            <div class="nombre">${escapeHtml(it.nombre)}</div>
            ${it.sku ? `<div class="sku">${escapeHtml(it.sku)}</div>` : ''}
          </td>
          <td class="amt">${formatPEN(it.total)}</td>
        </tr>
        <tr class="unit">
          <td></td>
          <td colspan="2">${it.cantidad} x ${formatPEN(it.precioUnitario)}</td>
        </tr>
      `,
    )
    .join('')

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Recibo</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    font-family: 'Courier New', ui-monospace, monospace;
    font-size: 11px;
    color: #000;
    background: #fff;
  }
  .ticket { width: 76mm; padding: 4mm 3mm; }
  h1 { font-size: 13px; text-align: center; margin: 0 0 2mm; letter-spacing: 0.5px; }
  .center { text-align: center; }
  .small { font-size: 10px; }
  .row { display: flex; justify-content: space-between; gap: 6px; }
  hr { border: none; border-top: 1px dashed #000; margin: 2mm 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 0; vertical-align: top; }
  td.qty { width: 8mm; }
  td.amt { text-align: right; white-space: nowrap; }
  .nombre { font-weight: bold; }
  .sku { font-size: 9px; color: #444; }
  tr.unit td { font-size: 9px; color: #555; padding-bottom: 1mm; }
  .totales .row { font-size: 11px; }
  .totales .grand { font-size: 14px; font-weight: bold; margin-top: 1mm; }
  .footer { text-align: center; margin-top: 3mm; font-size: 10px; }
  @media print { body { width: 80mm; } }
</style>
</head>
<body>
  <div class="ticket">
    <h1>${escapeHtml(data.empresa.nombre)}</h1>
    <div class="center small">
      ${data.empresa.ruc ? `RUC ${escapeHtml(data.empresa.ruc)}<br/>` : ''}
      ${data.empresa.direccion ? `${escapeHtml(data.empresa.direccion)}<br/>` : ''}
      ${data.empresa.telefono ? `Tel. ${escapeHtml(data.empresa.telefono)}` : ''}
    </div>
    <hr/>
    <div class="center">
      <strong>${escapeHtml(data.comprobante.tipo)} ELECTRONICA</strong><br/>
      ${data.comprobante.serie ?? ''}${data.comprobante.numero ? ' - ' + escapeHtml(data.comprobante.numero) : ''}
    </div>
    <div class="small">
      <div class="row"><span>Fecha</span><span>${new Date(data.comprobante.fecha).toLocaleString('es-PE')}</span></div>
      ${data.ventaNumero ? `<div class="row"><span>Venta</span><span>${escapeHtml(data.ventaNumero)}</span></div>` : ''}
    </div>
    <hr/>
    <div class="small">
      <div><strong>Cliente:</strong> ${escapeHtml(data.cliente.nombre)}</div>
      ${data.cliente.docNumero ? `<div>${escapeHtml(data.cliente.docTipo ?? 'DOC')}: ${escapeHtml(data.cliente.docNumero)}</div>` : ''}
    </div>
    <hr/>
    <table>
      <tbody>${itemsRows}</tbody>
    </table>
    <hr/>
    <div class="totales">
      <div class="row"><span>Subtotal</span><span>${formatPEN(data.totales.subtotal)}</span></div>
      <div class="row"><span>IGV (18%)</span><span>${formatPEN(data.totales.igv)}</span></div>
      <div class="row grand"><span>TOTAL</span><span>${formatPEN(data.totales.total)}</span></div>
    </div>
    ${
      data.pago?.metodo
        ? `<hr/><div class="small">
            <div class="row"><span>Pago</span><span>${escapeHtml(data.pago.metodo)}</span></div>
            ${data.pago.referencia ? `<div class="row"><span>Ref</span><span>${escapeHtml(data.pago.referencia)}</span></div>` : ''}
          </div>`
        : ''
    }
    <div class="footer">
      ¡Gracias por su compra!<br/>
      <span class="small">Representación impresa del comprobante electrónico.</span>
    </div>
  </div>
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => { window.focus(); window.print(); }, 80);
    });
  </script>
</body>
</html>`
}

function escapeHtml(s: string) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function ThermalReceiptDialog({
  open,
  onOpenChange,
  data,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: ThermalReceiptData | null
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const html = useMemo(() => (data ? buildHtml(data) : ''), [data])

  useEffect(() => {
    if (!open || !data || !iframeRef.current) return
    const iframe = iframeRef.current
    iframe.srcdoc = html
  }, [open, data, html])

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.focus()
    iframeRef.current?.contentWindow?.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Vista previa del ticket</DialogTitle>
        </DialogHeader>
        <div className="overflow-hidden rounded-md border bg-white">
          <iframe
            ref={iframeRef}
            title="Recibo térmico"
            className="h-[60vh] w-full"
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            <X className="size-4" /> Cerrar
          </Button>
          <Button onClick={handlePrint} type="button">
            <Printer className="size-4" /> Imprimir ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
