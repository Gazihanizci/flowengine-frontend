import { useEffect, useMemo, useRef, useState } from 'react'
import PermissionEditor from './PermissionEditor'
import OptionEditor from './OptionEditor'

function normalizePermissions(permissions = []) {
  return permissions.map((permission) => ({
    tip: permission.tip || 'USER',
    refId: Number(permission.refId ?? 0),
    yetkiTipi: permission.yetkiTipi || 'VIEW',
  }))
}

function normalizeOptions(options = []) {
  return options.map((option) => ({
    label: option.label || '',
    value: option.value || '',
  }))
}

function hasDuplicatePermission(permissions) {
  const seen = new Set()
  for (const permission of permissions) {
    const key = `${permission.tip}:${permission.refId}`
    if (seen.has(key)) return true
    seen.add(key)
  }
  return false
}

function shouldShowOptions(type) {
  const normalized = String(type || '')
    .trim()
    .toUpperCase()
  return normalized === 'RADIO' || normalized === 'COMBOBOX'
}

export default function FieldEditModal({ open, field, loading, onClose, onSave }) {
  const [label, setLabel] = useState('')
  const [placeholder, setPlaceholder] = useState('')
  const [required, setRequired] = useState(false)
  const [permissions, setPermissions] = useState([])
  const [options, setOptions] = useState([])
  const [validationError, setValidationError] = useState('')
  const lastLoadedFieldIdRef = useRef(null)

  useEffect(() => {
    if (!open || !field) return
    if (lastLoadedFieldIdRef.current === field.fieldId) return

    setLabel(field.label || '')
    setPlaceholder(field.placeholder || '')
    setRequired(Boolean(field.required))
    setPermissions(normalizePermissions(field.permissions))
    setOptions(normalizeOptions(field.options))
    setValidationError('')
    lastLoadedFieldIdRef.current = field.fieldId
  }, [open, field])

  useEffect(() => {
    if (open) return
    lastLoadedFieldIdRef.current = null
  }, [open])

  const duplicatePermission = useMemo(() => hasDuplicatePermission(permissions), [permissions])

  if (!open || !field) {
    return null
  }

  function handleSave(event) {
    event.preventDefault()

    const trimmedLabel = label.trim()
    if (!trimmedLabel) {
      setValidationError('Etiket boş olamaz')
      return
    }

    if (duplicatePermission) {
      setValidationError('Yinelenen izin engellendi: aynı tip + refId tekrar edemez.')
      return
    }

    setValidationError('')
    onSave(field.fieldId, {
      label: trimmedLabel,
      placeholder: placeholder.trim(),
      required: Boolean(required),
      permissions,
      options: shouldShowOptions(field.type) ? options : [],
    })
  }

  return (
    <div className="flow-edit-modal-overlay" role="dialog" aria-modal="true">
      <div className="panel flow-edit-modal">
        <div className="flow-edit-modal-head">
          <h2>Alan Düzenleme</h2>
          <button type="button" className="button secondary" onClick={onClose} disabled={loading}>
            Kapat
          </button>
        </div>

        <form className="flow-edit-modal-form" onSubmit={handleSave}>
          <label>
            Etiket
            <input className="input" value={label} onChange={(event) => setLabel(event.target.value)} />
          </label>
          <label>
            Yer Tutucu
            <input className="input" value={placeholder} onChange={(event) => setPlaceholder(event.target.value)} />
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={required} onChange={(event) => setRequired(event.target.checked)} />
            Zorunlu
          </label>

          <PermissionEditor
            permissions={permissions}
            onChange={setPermissions}
            duplicateError={duplicatePermission ? 'Aynı tip + refId tekrar edemez.' : ''}
          />

          {shouldShowOptions(field.type) ? <OptionEditor options={options} onChange={setOptions} /> : null}

          {validationError ? <p className="error-text">{validationError}</p> : null}

          <button className="button" type="submit" disabled={loading}>
            {loading ? (
              <span className="flow-edit-loading-line">
                <span className="flow-edit-spinner" />
                Güncelleniyor...
              </span>
            ) : (
              'Alanı Güncelle'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
