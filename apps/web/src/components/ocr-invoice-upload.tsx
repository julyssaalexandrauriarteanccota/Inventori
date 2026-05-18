'use client'

import { useCallback, useRef, useState } from 'react'
import { Loader2, ScanLine, X } from 'lucide-react'
import type { OcrInvoiceResult } from '@erp/shared'

import { useOcrInvoice } from '@/hooks/use-ai'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface OcrInvoiceUploadProps {
  onResult: (result: OcrInvoiceResult) => void
}

export function OcrInvoiceUpload({ onResult }: OcrInvoiceUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewName, setPreviewName] = useState<string | null>(null)
  const { mutate: runOcr, isPending, reset } = useOcrInvoice()

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      setPreviewName(file.name)
      runOcr(file, {
        onSuccess: (result) => {
          onResult(result)
        },
        onError: () => {
          setPreviewName(null)
          reset()
        },
      })
    },
    [runOcr, onResult, reset],
  )

  const handleClear = () => {
    setPreviewName(null)
    reset()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFileChange}
        disabled={isPending}
      />

      {!previewName && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ScanLine className="mr-2 h-4 w-4" />
          )}
          {isPending ? 'Procesando…' : 'Escanear factura con IA'}
        </Button>
      )}

      {previewName && !isPending && (
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="max-w-[200px] truncate">
            {previewName}
          </Badge>
          <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={handleClear}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  )
}
