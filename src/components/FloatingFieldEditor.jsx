import { useEffect, useMemo, useRef } from 'react'
import PermissionEditor from './PermissionEditor'
import OptionEditor from './OptionEditor'

function supportsOptions(fieldType) {
  const normalized = String(fieldType || '')
    .trim()
    .toUpperCase()
  return normalized === 'RADIO' || normalized === 'COMBOBOX'
}

export default function FloatingFieldEditor({
  open,
  position,
  field,
  saving,
  validationError,
  onPatch,
  onClose,
}) {
  const rootRef = useRef(null)
  const showOptions = useMemo(() => supportsOptions(field?.type), [field?.type])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        onClose()
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open || !field) {
    return null
  }

  return (
    <aside
      ref={rootRef}
      className="flow-live-floating-editor"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      <div className="flow-live-floating-head">
        <strong>Field Edit</strong>
        <button type="button" className="button secondary" onClick={onClose}>
          Kapat
        </button>
      </div>

      <label>
        Label
        <input
          className="input"
          value={field.label}
          onChange={(event) => onPatch({ label: event.target.value })}
        />
      </label>
      <label>
        Placeholder
        <input
          className="input"
          value={field.placeholder}
          onChange={(event) => onPatch({ placeholder: event.target.value })}
        />
      </label>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={field.required}
          onChange={(event) => onPatch({ required: event.target.checked })}
        />
        Required
      </label>

      <PermissionEditor
        compact
        permissions={field.permissions || []}
        onChange={(permissions) => onPatch({ permissions })}
        duplicateError={
          validationError === 'duplicate-permission' ? 'Aynı tip + refId tekrar edemez.' : ''
        }
      />

      {showOptions ? (
        <OptionEditor
          compact
          options={field.options || []}
          onChange={(options) => onPatch({ options })}
        />
      ) : null}

      {validationError === 'label-empty' ? <p className="error-text">label boş olamaz</p> : null}
      {saving ? <p className="hint">Kaydediliyor...</p> : null}
    </aside>
  )
}
