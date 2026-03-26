import type { FlowFieldItem } from '../services/flowApi'

interface FlowFieldPreviewProps {
  field: FlowFieldItem
}

export default function FlowFieldPreview({ field }: FlowFieldPreviewProps) {
  const options = field.options?.length
    ? field.options
    : [{ label: 'Seçenek 1', value: '1' }]

  switch (field.type) {
    case 'TEXT':
      return (
        <input
          className="input"
          type="text"
          placeholder={field.placeholder || field.label}
          disabled
        />
      )
    case 'TEXTAREA':
      return (
        <textarea
          className="input preview-textarea"
          placeholder={field.placeholder || field.label}
          disabled
        />
      )
    case 'NUMBER':
      return (
        <input
          className="input"
          type="number"
          placeholder={field.placeholder || '0'}
          disabled
        />
      )
    case 'DATE':
      return <input className="input" type="date" disabled />
    case 'COMBOBOX':
      return (
        <select className="input" disabled>
          <option value="">Seçiniz</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
    case 'RADIO':
      return (
        <div className="preview-options">
          {options.map((option) => (
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
      return <input className="input" type="file" disabled />
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
