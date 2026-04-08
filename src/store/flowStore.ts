import { create } from 'zustand'
import type { ExternalFlowCancelBehavior, FlowState, FlowStep } from '../types/flow'
import type { FormField } from '../types/form'

interface FlowStore extends FlowState {
  aciklama: string
  starterRoleIds: number[]
  starterUserIds: number[]
  setFlowName: (name: string) => void
  setAciklama: (value: string) => void
  setStarterRoleIds: (value: number[]) => void
  setStarterUserIds: (value: number[]) => void
  initializeSteps: (count: number) => void
  updateStepFields: (stepId: number, fields: FormField[]) => void
  updateStepName: (stepId: number, name: string) => void
  updateStepExternalFlow: (
    stepId: number,
    patch: {
      externalFlowEnabled?: boolean
      externalFlowId?: number | null
      waitForExternalFlowCompletion?: boolean
      resumeParentAfterSubFlow?: boolean
      cancelBehavior?: ExternalFlowCancelBehavior
    },
  ) => void
  resetFlow: () => void
}

const initialState: FlowState = {
  flowName: '',
  starterRoleIds: [],
  starterUserIds: [],
  steps: [],
}

export const useFlowStore = create<FlowStore>((set) => ({
  ...initialState,
  aciklama: '',
  starterRoleIds: [],
  starterUserIds: [],
  setFlowName: (name) => set({ flowName: name }),
  setAciklama: (value) => set({ aciklama: value }),
  setStarterRoleIds: (value) => set({ starterRoleIds: value }),
  setStarterUserIds: (value) => set({ starterUserIds: value }),
  initializeSteps: (count) =>
    set(() => {
      const steps: FlowStep[] = Array.from({ length: count }, (_, index) => ({
        stepId: index + 1,
        stepName: `Adım ${index + 1}`,
        fields: [],
        externalFlowEnabled: false,
        externalFlowId: null,
        waitForExternalFlowCompletion: false,
        resumeParentAfterSubFlow: true,
        cancelBehavior: 'PROPAGATE',
      }))
      return { steps }
    }),
  updateStepFields: (stepId, fields) =>
    set((state) => ({
      steps: state.steps.map((step) =>
        step.stepId === stepId ? { ...step, fields } : step,
      ),
    })),
  updateStepName: (stepId, name) =>
    set((state) => ({
      steps: state.steps.map((step) =>
        step.stepId === stepId ? { ...step, stepName: name } : step,
      ),
    })),
  updateStepExternalFlow: (stepId, patch) =>
    set((state) => ({
      steps: state.steps.map((step) =>
        step.stepId === stepId
          ? {
              ...step,
              ...patch,
              ...(patch.externalFlowEnabled === false
                ? {
                    externalFlowId: null,
                    waitForExternalFlowCompletion: false,
                    resumeParentAfterSubFlow: true,
                    cancelBehavior: 'PROPAGATE' as ExternalFlowCancelBehavior,
                  }
                : {}),
            }
          : step,
      ),
    })),
  resetFlow: () =>
    set({
      ...initialState,
      aciklama: '',
      starterRoleIds: [],
      starterUserIds: [],
    }),
}))
