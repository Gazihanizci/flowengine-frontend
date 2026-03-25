import axios from 'axios'
import type { FieldOption } from '../types/form'

export interface SaveFlowField {
  type: string
  label: string
  placeholder: string
  required: boolean
  orderNo: number
  options: FieldOption[]
}

export interface SaveFlowStep {
  stepName: string
  stepOrder: number
  fields: SaveFlowField[]
}

export interface SaveFlowPayload {
  flowName: string
  aciklama: string
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
  aktif: boolean
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