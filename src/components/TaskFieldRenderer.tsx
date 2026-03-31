import type { TaskField, TaskFormData } from '../types/task'

interface TaskFieldRendererProps {
  field: TaskField
  value: TaskFormData[number]
  onChange: (fieldId: number, value: TaskFormData[number]) => void
}

export default function TaskFieldRenderer({
  field,
  value,
  onChange,
}: TaskFieldRendererProps) {
  const disabled = !field.editable
  const baseClass =
    'mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100'

  if (field.type === 'TEXT') {
    return (
      <input
        type="text"
        className={baseClass}
        value={typeof value === 'string' ? value : ''}
        disabled={disabled}
        onChange={(event) => onChange(field.fieldId, event.target.value)}
      />
    )
  }

  if (field.type === 'DATE') {
    return (
      <input
        type="date"
        className={baseClass}
        value={typeof value === 'string' ? value : ''}
        disabled={disabled}
        onChange={(event) => onChange(field.fieldId, event.target.value)}
      />
    )
  }

  if (field.type === 'RADIO') {
    return (
      <div className="mt-2 space-y-2">
        {(field.options ?? []).map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name={`field-${field.fieldId}`}
              value={option.value}
              disabled={disabled}
              checked={value === option.value}
              onChange={(event) => onChange(field.fieldId, event.target.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    )
  }

  if (field.type === 'CHECKBOX') {
    return (
      <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          disabled={disabled}
          checked={Boolean(value)}
          onChange={(event) => onChange(field.fieldId, event.target.checked)}
        />
        <span>Secildi</span>
      </label>
    )
  }

  if (field.type === 'FILE') {
    return (
      <div className="mt-2 space-y-2">
        <input
          type="file"
          className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:font-medium hover:file:bg-slate-300"
          disabled={disabled}
          onChange={(event) => {
            const fileName = event.target.files?.[0]?.name ?? ''
            onChange(field.fieldId, fileName)
          }}
        />
        {typeof value === 'string' && value && (
          <p className="text-xs text-slate-500">Secilen dosya: {value}</p>
        )}
      </div>
    )
  }

  return <p className="mt-2 text-sm text-amber-600">Desteklenmeyen alan tipi: {field.type}</p>
}
