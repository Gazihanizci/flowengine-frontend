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
  try {
    const { data } = await taskApi.get<WorkflowTask[]>('/my-tasks')
    return data
  } catch {
    const { data } = await taskApi.get<WorkflowTask[]>('/mytasks')
    return data
  }
}

export async function fetchFlowDetailBySurecId(surecId: number) {
  try {
    const { data } = await taskApi.get(`/flow-detail/${surecId}`)
    return data
  } catch {
    const { data } = await taskApi.get(`/workflow/${surecId}`)
    return data
  }
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
  const resolvedUserId = context?.userId

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
  let jsonErrorMessage = ''

  const jsonAttempts: Array<Record<string, unknown>> = []
  const baseJsonBody: Record<string, unknown> = {
    aksiyonId,
    formData: requestPayload,
  }

  jsonAttempts.push(baseJsonBody)

  if (typeof resolvedUserId === 'number' && Number.isFinite(resolvedUserId) && resolvedUserId > 0) {
    jsonAttempts.push({
      ...baseJsonBody,
      userId: resolvedUserId,
    })
    jsonAttempts.push({
      ...baseJsonBody,
      kullaniciId: resolvedUserId,
    })
  }

  for (const body of jsonAttempts) {
    try {
      const { data } = await taskApi.post(endpoint, body)
      return data
    } catch (error) {
      jsonErrorMessage = extractApiError(error)

      if (!axios.isAxiosError(error)) {
        throw error
      }

      const status = error.response?.status
      const shouldTryNextJson =
        status === 400 || status === 404 || status === 405 || status === 415 || status === 422

      if (!shouldTryNextJson) {
        throw new Error(`Aksiyon gonderimi basarisiz (json): ${jsonErrorMessage}`)
      }
    }
  }

  try {
    // Compatibility fallback for servers expecting multipart.
    const multipartBody = new FormData()
    multipartBody.append('aksiyonId', String(aksiyonId))
    multipartBody.append('formData', JSON.stringify(requestPayload))

    if (typeof resolvedUserId === 'number' && Number.isFinite(resolvedUserId) && resolvedUserId > 0) {
      multipartBody.append('userId', String(resolvedUserId))
      multipartBody.append('kullaniciId', String(resolvedUserId))
    }

    const { data } = await taskApi.post(endpoint, multipartBody, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return data
  } catch (multipartError) {
    const multipartErrorMessage = extractApiError(multipartError)
    throw new Error(
      `Aksiyon gonderimi basarisiz. JSON hata: ${jsonErrorMessage}. Multipart fallback hata: ${multipartErrorMessage}`,
    )
  }
}
