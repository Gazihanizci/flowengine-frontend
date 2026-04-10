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
    ? 'border-cyan-300 bg-cyan-50/60'
    : 'border-slate-400 bg-slate-200'

  return (
    <div className={`rounded-2xl border p-4 ${containerClassName}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">{field.label}</p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {typeLabel[field.type]} Field
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {field.editable ? (
            <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-700">
              Bu alan sana ait
            </span>
          ) : (
            <span className="rounded-full border border-slate-400 bg-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700">
              Yetki yok / Salt okunur
            </span>
          )}
          <span className="text-[11px] text-slate-500">Alan ID: {field.fieldId}</span>
        </div>
      </div>
      {!field.editable ? (
        <div className="mt-3 rounded-lg border border-slate-400 bg-slate-300 px-3 py-2 text-xs font-medium text-slate-700">
          Bu alan onceki adimlarda doldurulmustur. Yalnizca goruntuleyebilirsiniz.
        </div>
      ) : null}
      {children}
    </div>
  )
}
