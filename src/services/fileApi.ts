import axios from 'axios'

export interface UploadResponse {
  dosyaId?: number
  fileId?: number
  fotografId?: number
  dosyaAdi?: string
  fileName?: string
  fotografAdi?: string
  downloadUrl?: string
  imageUrl?: string
}

export interface FileUploadParams {
  surecId: number
  adimId: number
  aksiyonId: number
  userId: number
}

type UploadTarget = 'file' | 'photo'

const fileApi = axios.create({
  baseURL: '/api',
})

fileApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function uploadByTarget(target: UploadTarget, file: File, params?: FileUploadParams) {
  const formData = new FormData()
  formData.append('file', file)

  const endpoint = target === 'photo' ? '/fotograflar/upload' : '/files/upload'

  return fileApi.post<UploadResponse>(endpoint, formData, {
    params: params ?? undefined,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

function hasImageExtension(value: unknown) {
  const text = String(value ?? '')
    .toLocaleLowerCase('tr-TR')
    .trim()
  return (
    text.endsWith('.png') ||
    text.endsWith('.jpg') ||
    text.endsWith('.jpeg') ||
    text.endsWith('.webp') ||
    text.endsWith('.gif') ||
    text.endsWith('.bmp') ||
    text.endsWith('.heic') ||
    text.endsWith('.heif')
  )
}

export function isPhotoField(field?: {
  label?: string | null
  accept?: string | null
  type?: string | null
  value?: unknown
  isPhoto?: boolean
}) {
  if (field?.isPhoto === true) return true

  const accept = String(field?.accept ?? '')
    .toLocaleLowerCase('tr-TR')
    .trim()
  const label = String(field?.label ?? '')
    .toLocaleLowerCase('tr-TR')
    .trim()
  const type = String(field?.type ?? '')
    .toLocaleLowerCase('tr-TR')
    .trim()

  if (accept.includes('image/')) return true
  if (accept.includes('.png') || accept.includes('.jpg') || accept.includes('.jpeg') || accept.includes('.webp')) {
    return true
  }

  if (type.includes('photo') || type.includes('image') || type.includes('fotograf') || type.includes('gorsel')) {
    return true
  }

  if (hasImageExtension(field?.value)) return true

  return label.includes('foto') || label.includes('gorsel') || label.includes('resim')
}

export function downloadFileUrl(fileId: number | string) {
  return `/api/files/download/${fileId}`
}

export function viewPhotoUrl(photoId: number | string) {
  return `/api/fotograflar/view/${photoId}`
}

export function getUploadedResourceId(result?: UploadResponse | null) {
  return result?.dosyaId ?? result?.fileId ?? result?.fotografId ?? null
}

export function getUploadedResourceName(result?: UploadResponse | null) {
  return result?.dosyaAdi ?? result?.fileName ?? result?.fotografAdi ?? null
}

export function getUploadedResourceUrl(result?: UploadResponse | null) {
  return result?.downloadUrl ?? result?.imageUrl ?? null
}

export async function uploadFile(file: File, params?: FileUploadParams) {
  const { data } = await uploadByTarget('file', file, params)
  return data
}

export async function uploadPhoto(file: File, params?: FileUploadParams) {
  const { data } = await uploadByTarget('photo', file, params)

  return data
}
