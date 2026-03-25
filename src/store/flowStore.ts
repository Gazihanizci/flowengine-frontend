import { create } from 'zustand'
import type { FlowState, FlowStep } from '../types/flow'
import type { FormField } from '../types/form'

interface FlowStore extends FlowState {
  aciklama: string
  setFlowName: (name: string) => void
  setAciklama: (value: string) => void
  initializeSteps: (count: number) => void
  updateStepFields: (stepId: number, fields: FormField[]) => void
  updateStepName: (stepId: number, name: string) => void
  resetFlow: () => void
}

const initialState: FlowState = {
  flowName: '',
  steps: [],
}

export const useFlowStore = create<FlowStore>((set) => ({
  ...initialState,
  aciklama: '',
  setFlowName: (name) => set({ flowName: name }),
  setAciklama: (value) => set({ aciklama: value }),
  initializeSteps: (count) =>
    set(() => {
      const steps: FlowStep[] = Array.from({ length: count }, (_, index) => ({
        stepId: index + 1,
        stepName: `Adım ${index + 1}`,
        fields: [],
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
  resetFlow: () => set({ ...initialState, aciklama: '' }),
}))