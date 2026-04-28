export default function OptionEditor({ options, onChange, compact = false }) {
  const prefix = compact ? 'flow-live' : 'flow-edit'

  function addOption() {
    onChange([
      ...options,
      {
        label: '',
        value: '',
      },
    ])
  }

  function removeOption(index) {
    onChange(options.filter((_, optionIndex) => optionIndex !== index))
  }

  function updateOption(index, key, value) {
    onChange(options.map((option, optionIndex) => (optionIndex === index ? { ...option, [key]: value } : option)))
  }

  return (
    <div className={`${prefix}-subsection`}>
      <h3>Seçenekler</h3>
      <div className={`${prefix}-option-list`}>
        {options.map((option, index) => (
          <div key={`${option.label}-${index}`} className={`${prefix}-option-row`}>
            <label>
              label
              <input
                className="input"
                value={option.label}
                onChange={(event) => updateOption(index, 'label', event.target.value)}
              />
            </label>
            <label>
              value
              <input
                className="input"
                value={option.value}
                onChange={(event) => updateOption(index, 'value', event.target.value)}
              />
            </label>
            <button type="button" className="button secondary" onClick={() => removeOption(index)}>
              Kaldır
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="button secondary" onClick={addOption}>
        Seçenek Ekle
      </button>
    </div>
  )
}
