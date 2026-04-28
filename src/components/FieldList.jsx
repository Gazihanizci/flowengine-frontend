export default function FieldList({ fields, onEditField }) {
  return (
    <section className="panel">
      <h2>Alanlar</h2>

      {!fields.length ? (
        <p className="hint">Bu adımda alan bulunmuyor.</p>
      ) : (
        <div className="flow-edit-field-list">
          {fields.map((field) => (
            <button
              type="button"
              key={field.fieldId}
              className="flow-edit-field-card"
              onClick={() => onEditField(field)}
            >
              <div>
                <strong>{field.label || 'İsimsiz Alan'}</strong>
                <p className="hint">{field.type}</p>
              </div>
              <span className={`flow-edit-badge ${field.editable ? 'editable' : 'readonly'}`}>
                {field.editable ? 'Düzenlenebilir' : 'Salt okunur'}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
