import axios from 'axios'
import type {
  CreateIssuePayload,
  Issue,
  IssueActivity,
  IssueComment,
  IssueFilters,
  IssueHistoryItem,
  IssueStatus,
} from '../types/issue'
import { normalizeIssueStatus, STATUS_ID_FALLBACKS, STATUS_ID_MAP } from '../components/issues/monitoring/constants'

const issueApi = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

function extractApiError(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : 'Unknown error'
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

  return error.message || `HTTP ${status ?? '-'}: API error`
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

function filtersToParams(filters?: IssueFilters) {
  if (!filters) return undefined
  const params: Record<string, string> = {}
  if (filters.search) params.search = filters.search
  if (filters.status?.length) params.status = filters.status.join(',')
  if (filters.priority?.length) params.priority = filters.priority.join(',')
  if (filters.assignedUserId?.length) params.assignedUserId = filters.assignedUserId.join(',')
  if (filters.currentOwnerId?.length) params.currentOwnerId = filters.currentOwnerId.join(',')
  if (filters.workflowStatus?.length) params.workflowStatus = filters.workflowStatus.join(',')
  if (filters.createdDate) params.createdDate = filters.createdDate
  return params
}

function normalizeIssue(raw: unknown): Issue {
  const item = (raw ?? {}) as Record<string, unknown>
  const assignedUserId = item.assignedUserId
  const assignedUserIds = item.assignedUserIds
  const currentOwnerUserId = item.currentOwnerUserId
  const createdBy = item.createdBy

  return {
    ...item,
    id: item.id as number | string,
    title: String(item.title ?? ''),
    description: (item.description as string | undefined) ?? '',
    priority: (item.priority as string | undefined) ?? 'MEDIUM',
    status: normalizeIssueStatus(String(item.status ?? 'TODO')),
    assignedUserId: (assignedUserId as number | string | null | undefined) ?? null,
    assignedUserIds: Array.isArray(assignedUserIds) ? (assignedUserIds as number[]) : [],
    currentOwnerUserId: typeof currentOwnerUserId === 'number' ? currentOwnerUserId : null,
    currentOwner:
      item.currentOwner && typeof item.currentOwner === 'object'
        ? (item.currentOwner as Issue['currentOwner'])
        : typeof currentOwnerUserId === 'number'
          ? { id: currentOwnerUserId, name: `Kullanici ${currentOwnerUserId}` }
          : undefined,
    createdById: typeof createdBy === 'number' ? createdBy : null,
    createdBy:
      createdBy && typeof createdBy === 'object'
        ? (createdBy as Issue['createdBy'])
        : typeof createdBy === 'number'
          ? { id: createdBy, name: `Kullanici ${createdBy}` }
          : undefined,
    assignedUsers: Array.isArray(item.assignedUsers) ? (item.assignedUsers as Issue['assignedUsers']) : [],
  }
}

export async function fetchIssues(filters?: IssueFilters) {
  try {
    const { data } = await issueApi.get<Issue[]>('/issues', { params: filtersToParams(filters) })
    return Array.isArray(data) ? data.map(normalizeIssue) : []
  } catch (error) {
    rethrowApiError(error)
  }
}

export async function fetchMyIssues(filters?: IssueFilters) {
  try {
    const { data } = await issueApi.get<Issue[]>('/issues/my', { params: filtersToParams(filters) })
    return Array.isArray(data) ? data.map(normalizeIssue) : []
  } catch (error) {
    rethrowApiError(error)
  }
}

export async function fetchIssueById(id: string) {
  try {
    const { data } = await issueApi.get<Issue>(`/issues/${id}`)
    return normalizeIssue(data)
  } catch (error) {
    rethrowApiError(error)
  }
}

export async function createIssue(payload: CreateIssuePayload) {
  try {
    const resolvedAssignedUserIds =
      payload.assignedUserIds && payload.assignedUserIds.length
        ? payload.assignedUserIds
        : payload.assignments?.map((item) => item.userId) ??
          (payload.assignedUserId ? [payload.assignedUserId] : [])

    const body = {
      title: payload.title,
      description: payload.description,
      priority: payload.priority,
      akisId: payload.akisId,
      assignedUserIds: resolvedAssignedUserIds,
    }

    const { data } = await issueApi.post<Issue>('/issues', body)
    return data
  } catch (error) {
    rethrowApiError(error)
  }
}

export async function updateIssueStatus(id: string, status: IssueStatus) {
  try {
    const normalizedStatus = normalizeIssueStatus(String(status))
    const statusId = STATUS_ID_MAP[normalizedStatus]
    if (!Number.isFinite(statusId)) {
      throw new Error(`Gecersiz durum degeri: ${String(status)}`)
    }

    const candidates = STATUS_ID_FALLBACKS[normalizedStatus] ?? [statusId]
    let lastError: unknown = null
    for (const candidate of candidates) {
      try {
        const { data } = await issueApi.put<Issue>(`/issues/${id}/status`, { statusId: candidate })
        return normalizeIssue(data)
      } catch (error) {
        lastError = error
      }
    }

    if (lastError) {
      rethrowApiError(lastError)
    }
    throw new Error('Durum guncellenemedi.')
  } catch (error) {
    rethrowApiError(error)
  }
}

export async function assignIssueUser(id: string, userId: number, roleId = 0) {
  try {
    const { data } = await issueApi.put<Issue>(`/issues/${id}/assign`, { userId, roleId })
    return data
  } catch (error) {
    rethrowApiError(error)
  }
}

export async function assignIssueUsers(id: string, assignments: Array<{ userId: number; roleId: number }>) {
  try {
    let latest: Issue | null = null
    for (const item of assignments) {
      const { data } = await issueApi.put<Issue>(`/issues/${id}/assign`, {
        userId: item.userId,
        roleId: item.roleId,
      })
      latest = data
    }
    return latest
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

export async function addIssueComment(id: string, message: string) {
  try {
    const { data } = await issueApi.post<IssueComment>(`/issues/${id}/comments`, { message })
    return data
  } catch (error) {
    rethrowApiError(error)
  }
}

export async function fetchIssueActivities(id: string) {
  try {
    const { data } = await issueApi.get<IssueActivity[]>(`/issues/${id}/activities`)
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


