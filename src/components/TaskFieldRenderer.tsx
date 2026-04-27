import type { ChangeEvent, ReactElement } from 'react'
import FileInput from './FileInput'
import FormField from './FormField'
import { downloadFileUrl, isPhotoField, viewPhotoUrl } from '../services/fileApi'
import type { TaskField, TaskFormValue } from '../types/task'

interface TaskFieldRendererProps {
  field: TaskField
  value: TaskFormValue
  fileName?: string
  onChange: (fieldId: number, value: TaskFormValue) => void
  onFileChange?: (fieldId: number, file: File | null) => void
  onTriggerAction?: (actionId: number) => void
}

type RendererProps = {
  field: TaskField
  value: TaskFormValue
  fileName?: string
  disabled: boolean
  inputClassName: string
  onChange: (fieldId: number, value: TaskFormValue) => void
  onFileChange?: (fieldId: number, file: File | null) => void
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
  TEXTAREA: ({ field, value, disabled, inputClassName, onChange }) => (
    <textarea
      className={inputClassName}
      rows={4}
      value={typeof value === 'string' ? value : ''}
      disabled={disabled}
      onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(field.fieldId, event.target.value)}
    />
  ),
  NUMBER: ({ field, value, disabled, inputClassName, onChange }) => (
    <input
      type="number"
      className={inputClassName}
      value={typeof value === 'number' ? value : typeof value === 'string' ? value : ''}
      disabled={disabled}
      onChange={(event: ChangeEvent<HTMLInputElement>) =>
        onChange(field.fieldId, event.target.value === '' ? '' : Number(event.target.value))
      }
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
            checked={String(value ?? '') === option.value}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(field.fieldId, event.target.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  ),
  CHECKBOX: ({ field, value, disabled, onChange }) => {
    const hasOptions = (field.options ?? []).length > 0
    const selectedValues = new Set(
      String(value ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    )

    if (!hasOptions) {
      return (
        <label
          className={`mt-2 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
            disabled ? 'border-gray-300 bg-gray-100 text-slate-500' : 'border-slate-300 bg-white text-slate-700'
          }`}
        >
          <input
            type="checkbox"
            disabled={disabled}
            checked={Boolean(value)}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(field.fieldId, event.target.checked)}
          />
          <span>Seçildi</span>
        </label>
      )
    }

    return (
      <div className="mt-2 space-y-2">
        {(field.options ?? []).map((option) => (
          <label
            key={option.value}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
              disabled ? 'border-gray-300 bg-gray-100 text-slate-500' : 'border-slate-300 bg-white text-slate-700'
            }`}
          >
            <input
              type="checkbox"
              disabled={disabled}
              checked={selectedValues.has(option.value)}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                const next = new Set(selectedValues)
                if (event.target.checked) {
                  next.add(option.value)
                } else {
                  next.delete(option.value)
                }
                onChange(field.fieldId, Array.from(next).join(','))
              }}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    )
  },
  FILE: ({ field, disabled, onFileChange, fileName }) => (
    <div className="mt-2 space-y-2">
      {field.fileId ? (
        isPhotoField(field) ? (
          <div className="space-y-2">
            <img
              src={viewPhotoUrl(field.fileId)}
              alt={String(field.value ?? fileName ?? `Fotograf #${field.fileId}`)}
              className="max-h-56 w-auto rounded-lg border border-slate-200 bg-slate-50 object-contain"
              loading="lazy"
            />
            <div className="flex items-center gap-3">
              <a
                href={viewPhotoUrl(field.fileId)}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-sm font-medium text-cyan-700 underline hover:text-cyan-900"
              >
                Fotoğrafı görüntüle
              </a>
              <a
                href={viewPhotoUrl(field.fileId)}
                download
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                İndir
              </a>
            </div>
          </div>
        ) : (
          <a
            href={downloadFileUrl(field.fileId)}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-sm font-medium text-cyan-700 underline hover:text-cyan-900"
          >
            {String(field.value ?? fileName ?? `Dosya #${field.fileId}`)}
          </a>
        )
      ) : (
        <p className="text-sm text-slate-500">Dosya yok</p>
      )}
      {!disabled ? (
        <FileInput
          disabled={disabled}
          fileName={fileName}
          accept={field.accept}
          onFileChange={(file) => onFileChange?.(field.fieldId, file)}
        />
      ) : null}
    </div>
  ),
  BUTTON: ({ field, value, disabled, onChange }) => (
    <div className="mt-2 space-y-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(field.fieldId, !Boolean(value))}
        className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
          disabled
            ? 'cursor-not-allowed border border-slate-400 bg-slate-300 text-slate-600'
            : 'bg-slate-800 text-white hover:bg-slate-900'
        }`}
      >
        {field.label || 'Buton'}
      </button>
      {!disabled ? <p className="text-xs text-slate-500">Durum: {Boolean(value) ? 'Tiklandi' : 'Beklemede'}</p> : null}
    </div>
  ),
}

function resolveActionId(field: TaskField): number | null {
  if (typeof field.actionId === 'number') {
    return field.actionId
  }

  if (typeof field.value === 'number') {
    return field.value
  }

  if (typeof field.value === 'string') {
    const parsed = Number(field.value)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  const firstOptionValue = field.options?.[0]?.value
  if (firstOptionValue !== undefined) {
    const parsed = Number(firstOptionValue)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  return null
}

export default function TaskFieldRenderer({
  field,
  value,
  fileName,
  onChange,
  onFileChange,
  onTriggerAction,
}: TaskFieldRendererProps) {
  const disabled = !field.editable
  const inputClassName = `mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${
    field.editable
      ? 'border-slate-300 bg-white text-slate-800 focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
      : 'border-slate-300 bg-slate-100 text-slate-600 cursor-not-allowed'
  }`

  const renderField = fieldRendererMap[field.type]
  const buttonActionId = field.type === 'BUTTON' ? resolveActionId(field) : null
  const shouldUseActionButton = field.type === 'BUTTON' && buttonActionId !== null && Boolean(onTriggerAction)

  return (
    <FormField field={field}>
      {shouldUseActionButton ? (
        <div className="mt-2 space-y-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onTriggerAction?.(buttonActionId)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              disabled
                ? 'cursor-not-allowed border border-slate-400 bg-slate-300 text-slate-600'
                : 'bg-slate-800 text-white hover:bg-slate-900'
            }`}
          >
            {field.label || 'Aksiyon'}
          </button>
          <p className="text-xs text-slate-500">Aksiyon ID: {buttonActionId}</p>
        </div>
      ) : renderField ? (
        renderField({ field, value, fileName, disabled, inputClassName, onChange, onFileChange })
      ) : (
        <p className="mt-2 text-sm text-amber-700">Desteklenmeyen alan tipi: {field.type}</p>
      )}
    </FormField>
  )
}
