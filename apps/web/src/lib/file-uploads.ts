'use client'

import { api } from '@/lib/api'

export type UploadPreset = 'image' | 'document' | 'mixed'

export interface NormalizedUploadedFile {
  filename: string
  path: string
  originalName: string
  mimeType: string
  size: number
  isImage: boolean
  previewUrl?: string
}

type UploadApiPayload = {
  filename?: string
  path?: string
  originalName?: string
  mimeType?: string
  size?: number
  isImage?: boolean
}

type UploadApiResponse = UploadApiPayload & {
  data?: UploadApiPayload
}

const UPLOAD_PRESET_CONFIG: Record<UploadPreset, { accept: string[]; maxSizeMb: number }> = {
  image: {
    accept: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeMb: 5,
  },
  document: {
    accept: ['application/pdf'],
    maxSizeMb: 5,
  },
  mixed: {
    accept: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSizeMb: 5,
  },
}

export function getUploadAcceptAttr(preset: UploadPreset) {
  return UPLOAD_PRESET_CONFIG[preset].accept.join(',')
}

export function createObjectPreviewUrl(file: File) {
  return file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
}

export function revokeObjectPreviewUrl(url?: string) {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

export async function validateRemoteImageUrl(url: string) {
  if (typeof window === 'undefined') {
    return
  }

  await new Promise<void>((resolve, reject) => {
    const probe = new window.Image()
    probe.referrerPolicy = 'no-referrer'
    probe.onload = () => resolve()
    probe.onerror = () =>
      reject(new Error('El enlace no apunta a una imagen visible o no permite carga directa'))
    probe.src = url
  })
}

export function validateSelectedFiles(
  files: File[],
  options: {
    preset: UploadPreset
    maxFiles?: number
    maxSizeMb?: number
  },
) {
  const presetConfig = UPLOAD_PRESET_CONFIG[options.preset]
  const maxSizeMb = options.maxSizeMb ?? presetConfig.maxSizeMb
  const maxSizeBytes = maxSizeMb * 1024 * 1024

  if (options.maxFiles && files.length > options.maxFiles) {
    throw new Error(`Solo puedes subir hasta ${options.maxFiles} archivo(s) en esta operación`)
  }

  for (const file of files) {
    if (!presetConfig.accept.includes(file.type)) {
      throw new Error(`Tipo de archivo no permitido: ${file.name}`)
    }

    if (file.size > maxSizeBytes) {
      throw new Error(`${file.name} excede el límite de ${maxSizeMb} MB`)
    }
  }
}

export async function uploadSelectedFiles(
  files: File[],
  options: {
    preset: UploadPreset
    maxFiles?: number
    endpoint?: string
  },
) {
  validateSelectedFiles(files, {
    preset: options.preset,
    maxFiles: options.maxFiles,
  })

  const uploadedFiles: NormalizedUploadedFile[] = []

  for (const file of files) {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.upload<UploadApiResponse>(
      options.endpoint ?? '/uploads',
      formData,
    )

    const payload = response.data ?? response
    const filename = payload.filename

    if (!filename) {
      throw new Error(`No se pudo completar la subida de ${file.name}`)
    }

    const isImage = payload.isImage ?? file.type.startsWith('image/')

    uploadedFiles.push({
      filename,
      path: payload.path ?? (isImage ? `/uploads/public/${filename}` : `/uploads/${filename}`),
      originalName: payload.originalName ?? file.name,
      mimeType: payload.mimeType ?? file.type,
      size: payload.size ?? file.size,
      isImage,
      previewUrl: createObjectPreviewUrl(file),
    })
  }

  return uploadedFiles
}
