import type { TaskFormData, TaskFormValue, WorkflowTask } from '../types/task'

function isFilledByType(type: WorkflowTask['form'][number]['type'], value: TaskFormValue) {
  if (type === 'BUTTON') return true
  if (type === 'CHECKBOX') return typeof value === 'boolean'
  if (type === 'NUMBER') return value !== '' && value !== null && value !== undefined
  return String(value ?? '').trim().length > 0
}

export function validateTaskForm(task: WorkflowTask, formData: TaskFormData): string | null {
  const missing = task.form.filter((field) => {
    if (!field.editable) return false
    const value = formData[field.fieldId]
    return !isFilledByType(field.type, value)
  })

  if (missing.length === 0) return null
  return `${missing.length} alan doldurulmadan ilerleyemezsiniz.`
}

export function shouldBypassTaskValidation(task: WorkflowTask, aksiyonId: number): boolean {
  if (aksiyonId === 2) {
    return true
  }

  const action = task.actions?.find((item) => item.actionId === aksiyonId)
  if (!action) return false

  const label = action.label.toLowerCase()
  return (
    label.includes('iptal') ||
    label.includes('reddet') ||
    label.includes('vazgec') ||
    label.includes('cancel')
  )
}
