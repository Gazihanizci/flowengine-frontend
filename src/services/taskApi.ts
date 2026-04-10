import axios from 'axios'
import type { TaskFileMap, TaskFormData, WorkflowTask } from '../types/task'
import { uploadFile } from './fileApi'

const taskApi = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

taskApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function fetchMyTasks() {
  const { data } = await taskApi.get<WorkflowTask[]>('/mytasks')
  return data
}

function extractApiError(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : 'Bilinmeyen hata'
  }

  const data = error.response?.data as
    | { message?: string; error?: string; detail?: string }
    | string
    | undefined
  const status = error.response?.status

  if (typeof data === 'string' && data.trim()) {
    return `HTTP ${status ?? '-'}: ${data}`
  }

  const objectData = typeof data === 'object' && data !== null ? data : undefined
  const parts = [objectData?.message, objectData?.error, objectData?.detail].filter(Boolean)
  if (parts.length > 0) {
    return `HTTP ${status ?? '-'}: ${parts.join(' | ')}`
  }

  return error.message || 'API hatasi'
}

export async function submitTaskAction(
  taskId: number,
  payload: TaskFormData,
  aksiyonId: number,
  files: TaskFileMap = {},
  context?: {
    surecId: number
    adimId: number
    userId: number
  },
) {
  const requestPayload: TaskFormData = { ...payload }
  const hasFiles = Object.keys(files).length > 0

  if (hasFiles && context) {
    const uploads = Object.keys(files).map(async (key) => {
      const fieldId = Number(key)
      const file = files[fieldId]
      if (!file) return

      let uploaded
      try {
        uploaded = await uploadFile(file, {
          surecId: context.surecId,
          adimId: context.adimId,
          aksiyonId,
          userId: context.userId,
        })
      } catch (error) {
        throw new Error(`Dosya yukleme hatasi (fieldId=${fieldId}): ${extractApiError(error)}`)
      }

      const uploadedId = uploaded.dosyaId ?? uploaded.fileId
      if (!uploadedId) {
        throw new Error('Dosya yukleme yanitinda dosyaId bulunamadi.')
      }

      requestPayload[fieldId] = String(uploadedId)
    })

    await Promise.all(uploads)
  }

  const endpoint = `/tasks/${taskId}/action`
  let multipartErrorMessage = ''

  try {
    // New backend contract: multipart with aksiyonId + formData(JSON string)
    const multipartBody = new FormData()
    multipartBody.append('aksiyonId', String(aksiyonId))
    multipartBody.append('formData', JSON.stringify(requestPayload))

    const { data } = await taskApi.post(endpoint, multipartBody, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return data
  } catch (error) {
    multipartErrorMessage = extractApiError(error)

    // Backward compatibility fallback for servers still expecting JSON
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const unsupportedContentType =
        multipartErrorMessage.toLowerCase().includes('content-type') &&
        multipartErrorMessage.toLowerCase().includes('not supported')

      const shouldFallbackToJson =
        status === 400 || status === 404 || status === 415 || unsupportedContentType

      if (!shouldFallbackToJson) {
        throw new Error(`Aksiyon gonderimi basarisiz (multipart): ${multipartErrorMessage}`)
      }
    }

    try {
      const { data } = await taskApi.post(endpoint, {
        aksiyonId,
        formData: requestPayload,
      })
      return data
    } catch (jsonError) {
      const jsonErrorMessage = extractApiError(jsonError)
      throw new Error(
        `Aksiyon gonderimi basarisiz. Multipart hata: ${multipartErrorMessage}. JSON fallback hata: ${jsonErrorMessage}`,
      )
    }
  }
}
