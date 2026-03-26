import { useMemo, useState } from 'react'
import type { FormField, FieldOption } from '../types/form'

interface PropertiesPanelProps {
  field: FormField | null
  onUpdate: (updated: FormField) => void
}

export default function PropertiesPanel({
  field,
  onUpdate,
}: PropertiesPanelProps) {
  const [optionLabel, setOptionLabel] = useState('')
  const [optionValue, setOptionValue] = useState('')

  const hasOptions = field?.type === 'COMBOBOX' || field?.type === 'RADIO'

  const options = useMemo(() => field?.options ?? [], [field?.options])

  const handleOptionAdd = () => {
    if (!field) return
    if (!optionLabel.trim() || !optionValue.trim()) return

    const newOption: FieldOption = {
      label: optionLabel.trim(),
      value: optionValue.trim(),
    }

    onUpdate({
      ...field,
      options: [...options, newOption],
    })

    setOptionLabel('')
    setOptionValue('')
  }

  const handleOptionRemove = (index: number) => {
    if (!field) return
    const next = options.filter((_, idx) => idx !== index)
    onUpdate({
      ...field,
      options: next,
    })
  }

  if (!field) {
    return (
      <aside className="panel">
        <h2>Özellikler</h2>
        <p className="panel-subtitle">Bir bileşen seçin.</p>
        <div className="empty-state">Seçim yapılmadı.</div>
      </aside>
    )
  }

  return (
    <aside className="panel">
      <h2>Özellikler</h2>
      <p className="panel-subtitle">Alan ayarlarını düzenleyin.</p>

      <div className="properties">
        <label>
          <span>Tür</span>
          <input className="input" value={field.type} readOnly />
        </label>

        <label>
          <span>Etiket</span>
          <input
            className="input"
            value={field.label}
            onChange={(event) =>
              onUpdate({
                ...field,
                label: event.target.value,
              })
            }
          />
        </label>

        {field.type !== 'CHECKBOX' && field.type !== 'BUTTON' && (
          <label>
            <span>Yer Tutucu</span>
            <input
              className="input"
              value={field.placeholder ?? ''}
              onChange={(event) =>
                onUpdate({
                  ...field,
                  placeholder: event.target.value,
                })
              }
            />
          </label>
        )}

        <label>
          <span>Rol ID</span>
          <input className="input" placeholder="" value="" readOnly />
        </label>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={Boolean(field.required)}
            onChange={(event) =>
              onUpdate({
                ...field,
                required: event.target.checked,
              })
            }
          />
          <span>Zorunlu</span>
        </label>
      </div>

      {hasOptions && (
        <div className="options">
          <h3>Seçenekler</h3>
          <div className="option-form">
            <input
              className="input"
              placeholder="Etiket"
              value={optionLabel}
              onChange={(event) => setOptionLabel(event.target.value)}
            />
            <input
              className="input"
              placeholder="Değer"
              value={optionValue}
              onChange={(event) => setOptionValue(event.target.value)}
            />
            <button className="button" type="button" onClick={handleOptionAdd}>
              Ekle
            </button>
          </div>
          {options.length === 0 ? (
            <p className="hint">Henüz seçenek yok.</p>
          ) : (
            <div className="option-list">
              {options.map((option, index) => (
                <div key={`${option.value}-${index}`} className="option-item">
                  <div>
                    <strong>{option.label}</strong>
                    <span>{option.value}</span>
                  </div>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => handleOptionRemove(index)}
                  >
                    Sil
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </aside>
  )
}