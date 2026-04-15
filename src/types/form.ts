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

export type FieldPermissionTip = 'ROLE' | 'USER'
export type FieldPermissionYetkiTipi = 'VIEW' | 'EDIT'

export interface FieldPermission {
  tip: FieldPermissionTip
  refId: number
  yetkiTipi: FieldPermissionYetkiTipi
}

export interface FormField {
  id: string
  type: FieldType
  label: string
  placeholder?: string
  required?: boolean
  options?: FieldOption[]
  permissions?: FieldPermission[]
  accept?: string
  multiple?: boolean
}
