export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH'

export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | string

export interface Issue {
  id: number | string
  title: string
  description?: string
  priority?: IssuePriority
  status: IssueStatus
  assignedUserId?: number | string | null
  akisId?: number | string | null
  createdAt?: string
  updatedAt?: string
}

export interface IssueComment {
  id: number
  message: string
  createdAt: string
}

export interface IssueHistoryItem {
  id?: number | string
  action?: string
  field?: string
  oldValue?: string
  newValue?: string
  changedBy?: number | string
  changedAt?: string
}

export interface CreateIssuePayload {
  title: string
  description: string
  priority: IssuePriority
  assignedUserId: number
  akisId: number
}
