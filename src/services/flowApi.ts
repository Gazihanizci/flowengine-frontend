import axios from 'axios'
import type { FieldOption, FieldPermission } from '../types/form'

export interface SaveFlowField {
  type: string
  label: string
  placeholder: string
  required: boolean
  orderNo: number
  permissions: FieldPermission[]
  options: FieldOption[]
  accept?: string
  multiple?: boolean
}

export interface SaveFlowStep {
  stepName: string
  stepOrder: number
  requiredApprovalCount: number
  fields: SaveFlowField[]
  externalFlowEnabled?: boolean
  externalFlowId?: number | null
  subFlowId?: number | null
  nextFlowId?: number | null
  waitForExternalFlowCompletion?: boolean
  resumeParentAfterSubFlow?: boolean
  cancelBehavior?: 'PROPAGATE' | 'WAIT'
}

export interface SaveFlowPayload {
  flowName: string
  aciklama: string
  baslatmaYetkileri: Array<{
    tip: 'ROLE' | 'USER'
    refId: number
  }>
  steps: SaveFlowStep[]
}

export interface SaveFlowResponse {
  flowId: number
  message: string
}

export interface FlowListItem {
  akisId: number
  akisAdi: string
  aciklama: string
}

export interface FlowFieldItem {
  fieldId: number
  type: string
  label: string
  placeholder: string | null
  required: boolean
  orderNo: number
  accept?: string | null
  multiple?: boolean
  roleIds?: number[]
  userIds?: number[]
  permissions?: FieldPermission[]
  options: FieldOption[]
}

export interface FlowStepDetail {
  stepId: number
  stepName: string
  requiredApprovalCount?: number
  fields: FlowFieldItem[]
  externalFlowEnabled?: boolean
  externalFlowId?: number | null
  subFlowId?: number | null
  nextFlowId?: number | null
}

export interface FlowDetailResponse {
  flowId: number
  flowName: string
  aciklama: string
  baslatmaYetkileri?: Array<{
    tip: 'ROLE' | 'USER'
    refId: number
  }>
  steps: FlowStepDetail[]
}

export interface StartFlowPayload {
  akisId?: number
  flowId?: number
}

export interface StartFlowResponse {
  surecId: number | null
  mevcutAdimId: number | null
  mesaj: string
}

export interface FlowMapComponentItem {
  etiket: string
  tip: string
  yetkiliIsimleri: string[]
}

export interface FlowMapStepItem {
  evre: string
  adimId: number
  adimAdi: string
  sira: number
  bilesenler: FlowMapComponentItem[]
  tip: string
}

export interface FlowMapResponse {
  akisId: number
  akisAdi: string
  adimlar: FlowMapStepItem[]
}

export interface FlowPermissionItem {
  id: number
  akisId: number
  tip: 'ROLE' | 'USER'
  refId: number
}

export const flowApi = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
})

flowApi.interceptors.request.use((config) => {
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
    | { message?: string; error?: string; detail?: string; mesaj?: string }
    | string
    | undefined

  if (typeof data === 'string' && data.trim()) {
    return `HTTP ${status ?? '-'}: ${data}`
  }

  if (data && typeof data === 'object') {
    const parts = [data.message, data.error, data.detail, data.mesaj].filter(Boolean)
    if (parts.length > 0) {
      return `HTTP ${status ?? '-'}: ${parts.join(' | ')}`
    }
  }

  return error.message || `HTTP ${status ?? '-'}: API hatasi`
}

export async function saveFlow(flowData: SaveFlowPayload) {
  const { data } = await flowApi.post<SaveFlowResponse>(
    '/api/designer/flows',
    flowData,
  )
  return data
}

export async function fetchFlows() {
  const { data } = await flowApi.get<FlowListItem[]>('/api/flows')
  return data
}

export async function fetchFlowDetail(flowId: number) {
  const { data } = await flowApi.get<FlowDetailResponse>(`/api/flows/${flowId}`)
  return data
}

export async function startFlow(payload: StartFlowPayload) {
  const flowId = payload.akisId ?? payload.flowId
  if (!Number.isFinite(flowId)) {
    throw new Error('Akis baslatmak icin gecerli akisId/flowId gerekli.')
  }

  const attempts: Array<{ endpoint: string; body: { akisId?: number; flowId?: number } }> = [
    { endpoint: '/api/flow/start', body: { akisId: flowId } },
    { endpoint: '/api/flow/start', body: { flowId: flowId } },
    { endpoint: '/api/flow/star', body: { akisId: flowId } },
    { endpoint: '/api/flow/star', body: { flowId: flowId } },
  ]

  let lastError: unknown

  for (const attempt of attempts) {
    try {
      const { data } = await flowApi.post<StartFlowResponse>(attempt.endpoint, attempt.body)
      return data
    } catch (error) {
      lastError = error

      if (!axios.isAxiosError(error)) {
        throw error
      }

      const status = error.response?.status
      const shouldTryNext = status === 400 || status === 404 || status === 405 || status === 415 || status === 422
      if (!shouldTryNext) {
        throw new Error(extractApiError(error))
      }
    }
  }

  throw new Error(extractApiError(lastError))
}

export async function fetchFlowMap(akisId: number) {
  const { data } = await flowApi.get<FlowMapResponse>(`/api/flow-map/${akisId}`)
  return data
}

export async function fetchFlowPermissions() {
  const { data } = await flowApi.get<FlowPermissionItem[]>('/api/flow-yetki')
  return data
}
