export type FieldType =
  | 'TEXT'
  | 'COMBOBOX'
  | 'FILE'
  | 'CHECKBOX'
  | 'DATE'
  | 'NUMBER'

export interface FieldOption {
  value: string
  label: string
}

export interface WorkflowField {
  id: number
  type: FieldType
  label: string
  value?: string | number | boolean
  required?: boolean
  options?: FieldOption[]
  accept?: string | null
  multiple?: boolean
}

export interface WorkflowAction {
  id: number
  name: string
  type: 'APPROVE' | 'REJECT' | 'CUSTOM'
  allowed: boolean
}

export interface WorkflowFile {
  id: number
  name: string
  url: string
}

export interface WorkflowResponse {
  adimId: number
  adimAdi: string
  form: WorkflowField[]
  actions: WorkflowAction[]
  files: WorkflowFile[]
}

export type FormValue = string | number | boolean | null

export type FormState = Record<number, FormValue>
