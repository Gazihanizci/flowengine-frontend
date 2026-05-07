export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string

export type IssueStatus =
  | 'TODO'
  | 'IN_PROGRESS'
  | 'WAITING_APPROVAL'
  | 'WAITING_EXTERNAL'
  | 'REJECTED'
  | 'DONE'
  | 'OPEN'
  | 'RESOLVED'
  | 'CLOSED'
  | string

export interface IssueUser {
  id: number
  name: string
  avatarUrl?: string
  role?: string
}

export interface WorkflowStep {
  id: string
  name: string
  status: 'DONE' | 'ACTIVE' | 'PENDING' | 'REJECTED'
  owner?: IssueUser
}

export interface IssueWorkflow {
  workflowName?: string
  workflowId?: string | number
  status?: string
  currentStep?: string
  activeOwner?: IssueUser
  childFlows?: Array<{ id: string | number; name: string; status: string }>
  steps?: WorkflowStep[]
}

export interface Issue {
  id: number | string
  title: string
  description?: string
  priority?: string
  status: string
  assignedUserId?: number | string | null
  assignedUserName?: string
  assignedUsers?: IssueUser[]
  assignedUserIds?: number[]
  currentOwner?: IssueUser
  currentOwnerUserId?: number | null
  createdBy?: IssueUser
  createdById?: number | null
  akisId?: number | string | null
  surecId?: number | string | null
  createdAt?: string
  updatedAt?: string
  startedAt?: string
  completedAt?: string
  lastActivityAt?: string
  progress?: number
  workflow?: IssueWorkflow
}

export interface IssueComment {
  id: number
  message: string
  createdAt: string
  userId?: number
  user?: IssueUser
}

export interface IssueActivity {
  id?: number | string
  type: string
  message: string
  userId?: number
  userName?: string
  workflowStep?: string
  createdAt: string
}

export interface IssueHistoryItem {
  id?: number | string
  action?: string
  field?: string
  oldValue?: string
  newValue?: string
  changedBy?: number | string
  changedByName?: string
  changedAt?: string
}

export interface CreateIssuePayload {
  title: string
  description: string
  priority: IssuePriority
  akisId: number
  assignedUserId?: number
  roleId?: number
  assignedUserIds?: number[]
  assignments?: Array<{ userId: number; roleId: number }>
}

export interface IssueFilters {
  search?: string
  status?: string[]
  priority?: string[]
  assignedUserId?: number[]
  currentOwnerId?: number[]
  workflowStatus?: string[]
  createdDate?: string
}


