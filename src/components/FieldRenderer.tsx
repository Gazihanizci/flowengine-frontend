import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { uploadFile } from '../services/fileApi'
import type { WorkflowField, FormValue } from '../types/workflow'

interface FieldRendererProps {
  field: WorkflowField
  value: FormValue
  onChange: (fieldId: number, value: FormValue) => void
}

export default function FieldRenderer({
  field,
  value,
  onChange,
}: FieldRendererProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)

    try {
      const result = await uploadFile(file)
      onChange(field.id, String(result.fileId))
    } catch (err) {
      setUploadError('Dosya yükleme başarısız.')
      onChange(field.id, null)
    } finally {
      setUploading(false)
    }
  }

  const textValue = typeof value === 'string' || typeof value === 'number' ? value : ''
  const numberValue = typeof value === 'number' ? value : ''

  const renderField = () => {
    switch (field.type) {
      case 'TEXT':
        return (
          <input
            className="input"
            type="text"
            value={textValue}
            onChange={(e) => onChange(field.id, e.target.value)}
            placeholder={field.label}
          />
        )
      case 'NUMBER':
        return (
          <input
            className="input"
            type="number"
            value={numberValue}
            onChange={(e) =>
              onChange(
                field.id,
                e.target.value === '' ? null : Number(e.target.value),
              )
            }
            placeholder={field.label}
          />
        )
      case 'DATE':
        return (
          <input
            className="input"
            type="date"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(field.id, e.target.value)}
          />
        )
      case 'COMBOBOX':
        return (
          <select
            className="input"
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(field.id, e.target.value)}
          >
            <option value="">Seçiniz</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )
      case 'CHECKBOX':
        return (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => onChange(field.id, e.target.checked)}
            />
            <span>Onayla</span>
          </label>
        )
      case 'FILE':
        return (
          <div className="file-input">
            <input
              className="input"
              type="file"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {uploading && <p className="hint">Yükleniyor...</p>}
            {value && !uploading && (
              <p className="hint">Yüklendi. FileId: {value}</p>
            )}
            {uploadError && <p className="error-text">{uploadError}</p>}
          </div>
        )
      default:
        return <p>Desteklenmeyen alan tipi.</p>
    }
  }

  return (
    <div className="field">
      <div className="field-label">
        <span>{field.label}</span>
        {field.required && <span className="required">*</span>}
      </div>
      {renderField()}
    </div>
  )
}