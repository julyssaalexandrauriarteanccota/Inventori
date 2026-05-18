'use client'

import { useMutation } from '@tanstack/react-query'
import type { OcrInvoiceResult, OcrSerialResult, TicketClassificationResult } from '@erp/shared'
import { api } from '@/lib/api'

export function useOcrInvoice() {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api
        .upload<{ data: OcrInvoiceResult }>('/compras/ocr-factura', form)
        .then((response) => response.data)
    },
  })
}

export function useOcrSerial() {
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return api.upload<{ data: OcrSerialResult }>('/ai/ocr/serial', form)
    },
  })
}

export function useClasificarTicket() {
  return useMutation({
    mutationFn: (data: { titulo: string; descripcion: string; fallaReportada?: string }) =>
      api
        .post<{ data: TicketClassificationResult }>('/soporte/clasificar-ticket', data)
        .then((response) => response.data),
  })
}
