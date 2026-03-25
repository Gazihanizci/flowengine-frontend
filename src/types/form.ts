export type FieldType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'COMBOBOX'
  | 'CHECKBOX'
  | 'DATE'
  | 'NUMBER'
  | 'FILE'
  | 'BUTTON'
  | 'RADIO'

export interface FieldOption {
  label: string
  value: string
}

export interface FormField {
  id: string
  type: FieldType
  label: string
  placeholder?: string
  required?: boolean
  options?: FieldOption[]
}