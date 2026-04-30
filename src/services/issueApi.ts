import axios from 'axios'
import type {
  CreateIssuePayload,
  Issue,
  IssueComment,
  IssueHistoryItem,
  IssueStatus,
} from '../types/issue'

const issueApi = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
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

function rethrowApiError(error: unknown): never {
  throw new Error(extractApiError(error))
}

issueApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function fetchIssues() {
  try {
    const { data } = await issueApi.get<Issue[]>('/issues')
    return data
  } catch (error) {
    rethrowApiError(error)
  }
}

export async function fetchMyIssues() {
  try {
    const { data } = await issueApi.get<Issue[]>('/issues/my')
    return data
  } catch (error) {
    rethrowApiError(error)
  }
}

export async function fetchIssueById(id: string) {
  try {
    const { data } = await issueApi.get<Issue>(`/issues/${id}`)
    return data
  } catch (error) {
    rethrowApiError(error)
  }
}

export async function createIssue(payload: CreateIssuePayload) {
  try {
    const { data } = await issueApi.post<Issue>('/issues', payload)
    return data
  } catch (error) {
    rethrowApiError(error)
  }
}

export async function updateIssueStatus(id: string, status: IssueStatus) {
  try {
    const { data } = await issueApi.put<Issue>(`/issues/${id}/status`, { status })
    return data
  } catch (error) {
    rethrowApiError(error)
  }
}

export async function assignIssueUser(id: string, assignedUserId: number) {
  try {
    const { data } = await issueApi.put<Issue>(`/issues/${id}/assign`, { assignedUserId })
    return data
  } catch (error) {
    rethrowApiError(error)
  }
}

export async function fetchIssueComments(id: string) {
  try {
    const { data } = await issueApi.get<IssueComment[]>(`/issues/${id}/comments`)
    return data
  } catch (error) {
    rethrowApiError(error)
  }
}

export async function addIssueComment(id: string, comment: string) {
  try {
    const { data } = await issueApi.post<IssueComment>(`/issues/${id}/comments`, { comment })
    return data
  } catch (error) {
    rethrowApiError(error)
  }
}

export async function fetchIssueHistory(id: string) {
  try {
    const { data } = await issueApi.get<IssueHistoryItem[]>(`/issues/${id}/history`)
    return data
  } catch (error) {
    rethrowApiError(error)
  }
}
