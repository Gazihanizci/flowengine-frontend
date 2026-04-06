export type TaskFieldType = 'TEXT' | 'DATE' | 'RADIO' | 'CHECKBOX' | 'FILE' | 'COMBOBOX'

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
  value?: TaskFormValue
}

export interface WorkflowTask {
  taskId: number
  surecId: number
  adimId: number
  adimAdi: string
  form: TaskField[]
}

export type TaskFormValue = string | boolean | number | null
export type TaskFormData = Record<string, TaskFormValue>
