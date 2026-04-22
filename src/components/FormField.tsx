import type { ReactNode } from 'react'
import type { TaskField } from '../types/task'

interface FormFieldProps {
  field: TaskField
  children: ReactNode
}

export default function FormField({ field, children }: FormFieldProps) {
  const typeLabel: Record<TaskField['type'], string> = {
    TEXT: 'Text',
    TEXTAREA: 'Textarea',
    NUMBER: 'Number',
    DATE: 'Date',
    RADIO: 'Radio',
    CHECKBOX: 'Checkbox',
    FILE: 'File',
    COMBOBOX: 'Combobox',
    BUTTON: 'Button',
  }

  const containerClassName = field.editable
    ? 'task-field-shell editable'
    : 'task-field-shell readonly'

  return (
    <div className={containerClassName}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{field.label}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {typeLabel[field.type]} Field
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {field.editable ? (
            <span className="task-badge editable">
              Bu alan sana ait
            </span>
          ) : (
            <span className="task-badge readonly">
              Salt okunur
            </span>
          )}
          <span className="text-[11px] text-slate-500">Alan ID: {field.fieldId}</span>
        </div>
      </div>
      {!field.editable ? (
        <div className="task-readonly-note">
          Bu alan onceki adimlarda doldurulmustur.
        </div>
      ) : null}
      {children}
    </div>
  )
}
