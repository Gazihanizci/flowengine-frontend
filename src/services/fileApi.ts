import axios from 'axios'

export interface UploadResponse {
  dosyaId?: number
  fileId?: number
  dosyaAdi?: string
  fileName?: string
  downloadUrl?: string
}

export interface FileUploadParams {
  surecId: number
  adimId: number
  aksiyonId: number
  userId: number
}

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

export async function uploadFile(file: File, params?: FileUploadParams) {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await fileApi.post<UploadResponse>('/files/upload', formData, {
    params: params ?? undefined,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return data
}
