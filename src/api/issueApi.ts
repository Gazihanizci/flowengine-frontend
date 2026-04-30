import axios from 'axios'
import type { IssueComment } from '../types/issue'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function extractApiError(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : 'Bilinmeyen hata'
  }

  const status = error.response?.status
  const data = error.response?.data as
    | { message?: string; error?: string; detail?: string; title?: string; mesaj?: string }
    | string
    | undefined

  if (typeof data === 'string' && data.trim()) {
    return `HTTP ${status ?? '-'}: ${data}`
  }

  if (data && typeof data === 'object') {
    const parts = [data.message, data.error, data.detail, data.title, data.mesaj].filter(Boolean)
    if (parts.length > 0) {
      return `HTTP ${status ?? '-'}: ${parts.join(' | ')}`
    }
  }

  return error.message || `HTTP ${status ?? '-'}: API hatasi`
}

export async function getComments(issueId: number) {
  try {
    const { data } = await api.get<IssueComment[]>(`/issues/${issueId}/comments`)
    return data
  } catch (error) {
    throw new Error(extractApiError(error))
  }
}

export async function addComment(issueId: number, message: string) {
  try {
    const { data } = await api.post<IssueComment>(`/issues/${issueId}/comments`, { message })
    return data
  } catch (error) {
    throw new Error(extractApiError(error))
  }
}
