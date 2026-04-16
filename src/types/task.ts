export type TaskFieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'NUMBER'
  | 'DATE'
  | 'RADIO'
  | 'CHECKBOX'
  | 'FILE'
  | 'COMBOBOX'
  | 'BUTTON'

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
  actionId?: number
}

export interface TaskAction {
  actionId: number
  label: string
}

export interface WorkflowTask {
  taskId: number
  surecId: number
  adimId: number
  adimAdi: string
  akisAdi?: string | null
  akisAciklama?: string | null
  form: TaskField[]
  actions?: TaskAction[]
}

export type TaskFormValue = string | boolean | number | null
export type TaskFormData = Record<string, TaskFormValue>
export type TaskFileMap = Record<number, File>
