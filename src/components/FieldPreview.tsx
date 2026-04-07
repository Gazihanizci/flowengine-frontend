import type { FormField } from '../types/form'

interface FieldPreviewProps {
  field: FormField
}

export default function FieldPreview({ field }: FieldPreviewProps) {
  switch (field.type) {
    case 'TEXT':
      return (
        <input
          className="input preview-input"
          type="text"
          placeholder={field.placeholder || 'Metin'}
          disabled
        />
      )
    case 'TEXTAREA':
      return (
        <textarea
          className="input preview-input preview-textarea"
          placeholder={field.placeholder || 'Metin'}
          disabled
        />
      )
    case 'NUMBER':
      return (
        <input
          className="input preview-input"
          type="number"
          placeholder={field.placeholder || '0'}
          disabled
        />
      )
    case 'DATE':
      return <input className="input preview-input" type="date" disabled />
    case 'COMBOBOX':
      return (
        <select className="input preview-input" disabled>
          <option value="">Seçiniz</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
    case 'RADIO':
      return (
        <div className="preview-options">
          {(field.options ?? [{ label: 'Seçenek 1', value: '1' }]).map((option) => (
            <label key={option.value} className="checkbox preview-radio">
              <input type="radio" disabled /> {option.label}
            </label>
          ))}
        </div>
      )
    case 'CHECKBOX':
      return (
        <label className="checkbox">
          <input type="checkbox" disabled /> {field.label || 'Onay'}
        </label>
      )
    case 'FILE':
      return (
        <input
          className="input preview-input"
          type="file"
          accept={field.accept}
          multiple={Boolean(field.multiple)}
          disabled
        />
      )
    case 'BUTTON':
      return (
        <button className="button preview-button" type="button" disabled>
          {field.label || 'Buton'}
        </button>
      )
    default:
      return <p className="hint">Desteklenmeyen alan tipi.</p>
  }
}
