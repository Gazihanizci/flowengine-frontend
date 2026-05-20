import type { ChangeEvent, ReactElement } from 'react'
import FileInput from './FileInput'
import FormField from './FormField'
import { downloadFileUrl, isPhotoField, viewPhotoUrl } from '../services/fileApi'
import type { TaskField, TaskFormValue } from '../types/task'
import { ExternalLink, Download, FileText, Zap, Check, Image as ImageIcon } from 'lucide-react'

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
      <option value="">Seçiniz...</option>
      {(field.options ?? []).map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  RADIO: ({ field, value, disabled, onChange }) => (
    <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
      {(field.options ?? []).map((option) => {
        const isChecked = String(value ?? '') === option.value
        return (
          <label
            key={option.value}
            className={`flex items-center gap-3 rounded-xl border p-3.5 text-xs font-bold transition cursor-pointer select-none ${
              disabled
                ? 'border-slate-100 bg-slate-50/50 text-slate-400 cursor-not-allowed dark:border-slate-900 dark:bg-slate-900/10'
                : isChecked
                ? 'border-blue-500 bg-blue-50/10 text-blue-750 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-400'
                : 'border-slate-200 bg-white text-slate-750 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-350 dark:hover:bg-slate-900'
            }`}
          >
            <input
              type="radio"
              name={`field-${field.fieldId}`}
              value={option.value}
              disabled={disabled}
              checked={isChecked}
              onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(field.fieldId, event.target.value)}
              className="h-4.5 w-4.5 accent-blue-600 cursor-pointer disabled:cursor-not-allowed"
            />
            <span>{option.label}</span>
          </label>
        )
      })}
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
      const isChecked = Boolean(value)
      return (
        <label
          className={`mt-2.5 flex items-center gap-3 rounded-xl border p-3.5 text-xs font-bold transition cursor-pointer select-none ${
            disabled
              ? 'border-slate-100 bg-slate-50/50 text-slate-400 cursor-not-allowed dark:border-slate-900 dark:bg-slate-900/10'
              : isChecked
              ? 'border-blue-500 bg-blue-50/10 text-blue-750 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-400'
              : 'border-slate-200 bg-white text-slate-750 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-350 dark:hover:bg-slate-900'
          }`}
        >
          <input
            type="checkbox"
            disabled={disabled}
            checked={isChecked}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(field.fieldId, event.target.checked)}
            className="h-4.5 w-4.5 accent-blue-600 rounded cursor-pointer disabled:cursor-not-allowed"
          />
          <span>Seçildi</span>
        </label>
      )
    }

    return (
      <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
        {(field.options ?? []).map((option) => {
          const isChecked = selectedValues.has(option.value)
          return (
            <label
              key={option.value}
              className={`flex items-center gap-3 rounded-xl border p-3.5 text-xs font-bold transition cursor-pointer select-none ${
                disabled
                  ? 'border-slate-100 bg-slate-50/50 text-slate-400 cursor-not-allowed dark:border-slate-900 dark:bg-slate-900/10'
                  : isChecked
                  ? 'border-blue-500 bg-blue-50/10 text-blue-750 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-400'
                  : 'border-slate-200 bg-white text-slate-750 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-350 dark:hover:bg-slate-900'
              }`}
            >
              <input
                type="checkbox"
                disabled={disabled}
                checked={isChecked}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  const next = new Set(selectedValues)
                  if (event.target.checked) {
                    next.add(option.value)
                  } else {
                    next.delete(option.value)
                  }
                  onChange(field.fieldId, Array.from(next).join(','))
                }}
                className="h-4.5 w-4.5 accent-blue-600 rounded cursor-pointer disabled:cursor-not-allowed"
              />
              <span>{option.label}</span>
            </label>
          )
        })}
      </div>
    )
  },
  FILE: ({ field, disabled, onFileChange, fileName }) => (
    <div className="mt-2 space-y-3">
      {field.fileId ? (
        isPhotoField(field) ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-850 dark:bg-slate-900/20">
            <div className="relative group overflow-hidden max-w-sm rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800">
              <img
                src={viewPhotoUrl(field.fileId)}
                alt={String(field.value ?? fileName ?? `Fotograf #${field.fileId}`)}
                className="max-h-56 w-auto object-contain transition duration-200 group-hover:scale-[1.01]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="mt-3.5 flex items-center gap-3">
              <a
                href={viewPhotoUrl(field.fileId)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Fotoğrafı Görüntüle
              </a>
              <a
                href={viewPhotoUrl(field.fileId)}
                download
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm transition dark:border-slate-800 dark:bg-slate-900 dark:text-slate-350 dark:hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                İndir
              </a>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/40 p-4 dark:border-slate-850 dark:bg-slate-900/10">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {String(field.value ?? fileName ?? `Dosya #${field.fileId}`)}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">Dosya ID: {field.fileId}</p>
              </div>
            </div>
            <a
              href={downloadFileUrl(field.fileId)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-750 hover:bg-slate-50 shadow-sm transition dark:border-slate-800 dark:bg-slate-900 dark:text-slate-350 dark:hover:bg-slate-800"
            >
              <Download className="h-3.5 w-3.5" />
              Dosyayı İndir
            </a>
          </div>
        )
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-3.5 py-3 text-xs font-medium text-slate-400 dark:border-slate-800 dark:bg-slate-900/10">
          <FileText className="h-4 w-4 text-slate-350" />
          Yüklenmiş herhangi bir dosya bulunmamaktadır.
        </div>
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
    <div className="mt-2.5 space-y-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(field.fieldId, !Boolean(value))}
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold shadow-sm transition ${
          disabled
            ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
            : 'bg-slate-900 text-white hover:bg-slate-950 dark:bg-slate-900 dark:hover:bg-slate-850'
        }`}
      >
        <Zap className="h-3.5 w-3.5 text-amber-500" />
        {field.label || 'Butonu Tetikle'}
      </button>
      {!disabled ? (
        <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
          <Check className={`h-3.5 w-3.5 ${Boolean(value) ? 'text-emerald-500' : 'text-slate-300'}`} />
          Durum: {Boolean(value) ? 'Tıklandı' : 'Beklemede'}
        </p>
      ) : null}
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
  const inputClassName = `mt-2.5 w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition duration-150 ${
    field.editable
      ? 'border-slate-200 bg-slate-50 text-slate-850 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-blue-500 dark:focus:bg-slate-950 dark:focus:ring-blue-500/10'
      : 'border-slate-150 bg-slate-50 text-slate-500 cursor-not-allowed dark:border-slate-900 dark:bg-slate-900/40 dark:text-slate-400'
  }`

  const renderField = fieldRendererMap[field.type]
  const buttonActionId = field.type === 'BUTTON' ? resolveActionId(field) : null
  const shouldUseActionButton = field.type === 'BUTTON' && buttonActionId !== null && Boolean(onTriggerAction)

  return (
    <FormField field={field}>
      {shouldUseActionButton ? (
        <div className="mt-2.5 space-y-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onTriggerAction?.(buttonActionId)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold shadow-sm transition ${
              disabled
                ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                : 'bg-slate-900 text-white hover:bg-slate-950 dark:bg-slate-900 dark:hover:bg-slate-850'
            }`}
          >
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            {field.label || 'Aksiyon'}
          </button>
          <p className="text-[10px] text-slate-400 font-bold">Aksiyon ID: {buttonActionId}</p>
        </div>
      ) : renderField ? (
        renderField({ field, value, fileName, disabled, inputClassName, onChange, onFileChange })
      ) : (
        <p className="mt-2.5 text-sm text-amber-700">Desteklenmeyen alan tipi: {field.type}</p>
      )}
    </FormField>
  )
}
