import type { FormField } from './form'

export type ExternalFlowCancelBehavior = 'PROPAGATE' | 'WAIT'

export interface FlowStep {
  stepId: number
  stepName: string
  requiredApprovalCount: number
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
  starterRoleIds?: number[]
  starterUserIds?: number[]
  steps: FlowStep[]
}
