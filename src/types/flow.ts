import type { FormField } from './form'

export type ExternalFlowCancelBehavior = 'PROPAGATE' | 'WAIT'

export interface FlowStep {
  stepId: number
  stepName: string
  fields: FormField[]
  externalFlowEnabled?: boolean
  externalFlowId?: number | null
  waitForExternalFlowCompletion?: boolean
  resumeParentAfterSubFlow?: boolean
  cancelBehavior?: ExternalFlowCancelBehavior
}

export interface FlowState {
  flowName: string
  aciklama?: string
  steps: FlowStep[]
}
