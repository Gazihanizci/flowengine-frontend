export default function FieldCard({ field, selected, saving, onClick }) {
  return (
    <button
      type="button"
      className={`flow-live-field-card ${selected ? 'selected' : ''}`}
      onClick={onClick}
    >
      <div className="flow-live-field-main">
        <strong>{field.label || 'İsimsiz Alan'}</strong>
        <div className="flow-live-field-meta">
          <span className="flow-live-type-badge">{field.type}</span>
          <span className={`flow-live-edit-badge ${field.editable ? 'editable' : 'readonly'}`}>
            {field.editable ? 'Editable' : 'Readonly'}
          </span>
          {saving ? <span className="flow-live-saving-dot" /> : null}
        </div>
      </div>

      <span className="flow-live-edit-icon" aria-hidden>
        ✎
      </span>
    </button>
  )
}
