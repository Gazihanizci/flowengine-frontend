import axios from 'axios'
import type { WorkflowResponse, FormState } from '../types/workflow'

export const apiClient = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function fetchWorkflow(surecId: string | number) {
  const { data } = await apiClient.get<WorkflowResponse>(
    `/api/workflow/${surecId}`,
  )
  return data
}

export interface WorkflowActionRequest {
  surecId: number
  aksiyonId: number
  formData: FormState
}

export async function sendWorkflowAction(payload: WorkflowActionRequest) {
  const { data } = await apiClient.post('/api/workflow/action', payload)
  return data
}