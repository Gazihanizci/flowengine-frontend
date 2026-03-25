import type { FormField } from './form'

export interface FlowStep {
  stepId: number
  stepName: string
  fields: FormField[]
}

export interface FlowState {
  flowName: string
  aciklama?: string
  steps: FlowStep[]
}