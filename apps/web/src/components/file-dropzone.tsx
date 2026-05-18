'use client'

import { useCallback, useRef, useState, type DragEvent } from 'react'
import { FileUp, Loader2, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  getUploadAcceptAttr,
  validateSelectedFiles,
  type UploadPreset,
} from '@/lib/file-uploads'
import { Button } from '@/components/ui/button'

export interface FileDropzoneProps {
  /** Upload preset defining accepted types and max size. */
  preset: UploadPreset
  /** Maximum files allowed. */
  maxFiles?: number
  /** Called when valid files are selected. */
  onFiles: (files: File[]) => void
  /** Whether the upload is currently in progress. */
  isUploading?: boolean
  /** Whether the component is disabled. */
  disabled?: boolean
  /** Custom placeholder label. */
  label?: string
  /** Custom description. */
  description?: string
  className?: string
}

export function FileDropzone({
  preset,
  maxFiles = 1,
  onFiles,
  isUploading = false,
  disabled = false,
  label,
  description,
  className,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const accept = getUploadAcceptAttr(preset)

  const processFiles = useCallback(
    (files: File[]) => {
      setError(null)
      try {
        validateSelectedFiles(files, { preset, maxFiles })
        setSelectedFiles(files)
        onFiles(files)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al seleccionar archivos')
      }
    },
    [preset, maxFiles, onFiles],
  )

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled && !isUploading) setIsDragging(true)
    },
    [disabled, isUploading],
  )

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      if (disabled || isUploading) return

      const droppedFiles = Array.from(e.dataTransfer.files)
      if (droppedFiles.length > 0) processFiles(droppedFiles)
    },
    [disabled, isUploading, processFiles],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      if (files.length > 0) processFiles(files)
      if (inputRef.current) inputRef.current.value = ''
    },
    [processFiles],
  )

  const removeFile = useCallback(
    (index: number) => {
      setSelectedFiles((prev) => {
        const next = prev.filter((_, i) => i !== index)
        if (next.length === 0) setError(null)
        return next
      })
    },
    [],
  )

  const isDisabled = disabled || isUploading

  const presetLabels: Record<UploadPreset, string> = {
    image: 'imágenes (JPG, PNG, WebP)',
    document: 'documentos (PDF)',
    mixed: 'archivos (JPG, PNG, WebP, PDF)',
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={maxFiles > 1}
        className="hidden"
        onChange={handleInputChange}
        disabled={isDisabled}
      />

      <button
        type="button"
        disabled={isDisabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex min-h-[140px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200',
          isDragging
            ? 'border-primary/60 bg-primary/5 scale-[1.01]'
            : 'border-border/60 bg-muted/20 hover:border-border hover:bg-muted/30',
          isDisabled && 'pointer-events-none opacity-50',
          error && 'border-destructive/40',
        )}
      >
        {isUploading ? (
          <Loader2 className="size-8 animate-spin text-primary" />
        ) : (
          <div
            className={cn(
              'flex size-12 items-center justify-center rounded-xl transition-colors',
              isDragging
                ? 'bg-primary/15 text-primary'
                : 'bg-muted/50 text-muted-foreground',
            )}
          >
            <FileUp className="size-6" />
          </div>
        )}

        <div>
          <p className="text-sm font-medium text-foreground">
            {isUploading
              ? 'Subiendo…'
              : label ?? 'Arrastra archivos aquí o haz clic para seleccionar'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {description ??
              `Acepta ${presetLabels[preset]}. Máx. ${maxFiles} archivo(s), 5 MB c/u`}
          </p>
        </div>
      </button>

      {/* Error */}
      {error ? (
        <p className="text-xs text-destructive animate-fade-in">{error}</p>
      ) : null}

      {/* Selected files preview */}
      {selectedFiles.length > 0 && !isUploading ? (
        <div className="flex flex-wrap gap-2 animate-fade-up">
          {selectedFiles.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-1.5 text-xs shadow-sm"
            >
              <span className="max-w-[160px] truncate text-foreground">
                {file.name}
              </span>
              <span className="text-muted-foreground">
                {(file.size / 1024).toFixed(0)} KB
              </span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="flex size-4 items-center justify-center rounded text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
