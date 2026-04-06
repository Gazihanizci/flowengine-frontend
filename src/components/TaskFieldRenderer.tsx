import type { ChangeEvent, ReactElement } from 'react'
import type { TaskField, TaskFormValue } from '../types/task'

interface TaskFieldRendererProps {
  field: TaskField
  value: TaskFormValue
  onChange: (fieldId: number, value: TaskFormValue) => void
}

type RendererProps = {
  field: TaskField
  value: TaskFormValue
  disabled: boolean
  inputClassName: string
  onChange: (fieldId: number, value: TaskFormValue) => void
}

type FieldRendererMap = Record<TaskField['type'], (props: RendererProps) => ReactElement>

const fieldRendererMap: FieldRendererMap = {
  TEXT: ({ field, value, disabled, inputClassName, onChange }) => (
    <input
      type="text"
      className={inputClassName}
      value={typeof value === 'string' ? value : ''}
      disabled={disabled}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(field.fieldId, event.target.value)}
    />
  ),
  DATE: ({ field, value, disabled, inputClassName, onChange }) => (
    <input
      type="date"
      className={inputClassName}
      value={typeof value === 'string' ? value : ''}
      disabled={disabled}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(field.fieldId, event.target.value)}
    />
  ),
  COMBOBOX: ({ field, value, disabled, inputClassName, onChange }) => (
    <select
      className={inputClassName}
      value={typeof value === 'string' ? value : ''}
      disabled={disabled}
      onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(field.fieldId, event.target.value)}
    >
      <option value="">Seciniz</option>
      {(field.options ?? []).map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  RADIO: ({ field, value, disabled, onChange }) => (
    <div className="mt-2 space-y-2">
      {(field.options ?? []).map((option) => (
        <label
          key={option.value}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
            disabled ? 'border-gray-300 bg-gray-100 text-slate-500' : 'border-slate-300 bg-white text-slate-700'
          }`}
        >
          <input
            type="radio"
            name={`field-${field.fieldId}`}
            value={option.value}
            disabled={disabled}
            checked={value === option.value}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange(field.fieldId, event.target.value)
            }
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  ),
  CHECKBOX: ({ field, value, disabled, onChange }) => (
    <label
      className={`mt-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
        disabled ? 'border-gray-300 bg-gray-100 text-slate-500' : 'border-slate-300 bg-white text-slate-700'
      }`}
    >
      <input
        type="checkbox"
        disabled={disabled}
        checked={Boolean(value)}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(field.fieldId, event.target.checked)
        }
      />
      <span>Secildi</span>
    </label>
  ),
  FILE: ({ field, value, disabled, onChange }) => (
    <div className="mt-2 space-y-2">
      <input
        type="file"
        className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:font-medium hover:file:bg-slate-300 disabled:cursor-not-allowed"
        disabled={disabled}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const fileName = event.target.files?.[0]?.name ?? ''
          onChange(field.fieldId, fileName)
        }}
      />
      {typeof value === 'string' && value ? (
        <p className="text-xs text-slate-500">Secilen dosya: {value}</p>
      ) : null}
    </div>
  ),
}

export default function TaskFieldRenderer({ field, value, onChange }: TaskFieldRendererProps) {
  const disabled = !field.editable
  const typeLabel: Record<TaskField['type'], string> = {
    TEXT: 'Text',
    DATE: 'Date',
    RADIO: 'Radio',
    CHECKBOX: 'Checkbox',
    FILE: 'File',
    COMBOBOX: 'Combobox',
  }
  const containerClassName = field.editable
    ? 'border-cyan-300 bg-cyan-50/60'
    : 'border-slate-400 bg-slate-200'
  const inputClassName = `mt-2 w-full rounded-xl border px-3 py-2 text-sm text-slate-700 outline-none transition ${
    field.editable
      ? 'border-cyan-300 bg-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100'
      : 'border-slate-400 bg-slate-300 text-slate-700 cursor-not-allowed'
  }`

  const renderField = fieldRendererMap[field.type]

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
      {renderField ? (
        renderField({ field, value, disabled, inputClassName, onChange })
      ) : (
        <p className="mt-2 text-sm text-amber-700">Desteklenmeyen alan tipi: {field.type}</p>
      )}
    </div>
  )
}
