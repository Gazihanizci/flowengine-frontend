export type TaskFieldType = 'TEXT' | 'DATE' | 'RADIO' | 'CHECKBOX' | 'FILE'

export interface TaskFieldOption {
  label: string
  value: string
}

export interface TaskField {
  fieldId: number
  type: TaskFieldType
  label: string
  options?: TaskFieldOption[]
  editable: boolean
}

export interface WorkflowTask {
  taskId: number
  surecId: number
  adimId: number
  adimAdi: string
  form: TaskField[]
}

export type TaskFormData = Record<number, string | boolean>
