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
}

export interface SaveFlowStep {
  stepName: string
  stepOrder: number
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
  roleIds?: number[]
  userIds?: number[]
  permissions?: FieldPermission[]
  options: FieldOption[]
}

export interface FlowStepDetail {
  stepId: number
  stepName: string
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
  akisId: number
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

export const flowApi = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
})

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
  const { data } = await flowApi.post<StartFlowResponse>('/api/flow/start', payload)
  return data
}

export async function fetchFlowMap(akisId: number) {
  const { data } = await flowApi.get<FlowMapResponse>(`/api/flow-map/${akisId}`)
  return data
}
