const PERMISSION_TIPS = ['USER', 'ROLE']
const PERMISSION_TYPES = ['VIEW', 'EDIT', 'HIDDEN']

export default function PermissionEditor({ permissions, onChange, duplicateError, compact = false }) {
  const prefix = compact ? 'flow-live' : 'flow-edit'

  function addPermission() {
    onChange([
      ...permissions,
      {
        tip: 'USER',
        refId: 0,
        yetkiTipi: 'VIEW',
      },
    ])
  }

  function removePermission(index) {
    onChange(permissions.filter((_, permissionIndex) => permissionIndex !== index))
  }

  function updatePermission(index, key, value) {
    onChange(
      permissions.map((permission, permissionIndex) =>
        permissionIndex === index ? { ...permission, [key]: value } : permission,
      ),
    )
  }

  return (
    <div className={`${prefix}-subsection`}>
      <h3>İzinler</h3>
      <div className={`${prefix}-permission-list`}>
        {permissions.map((permission, index) => (
          <div key={`${permission.tip}-${permission.refId}-${index}`} className={`${prefix}-permission-row`}>
            <label>
              tip
              <select
                className="input"
                value={permission.tip}
                onChange={(event) => updatePermission(index, 'tip', event.target.value)}
              >
                {PERMISSION_TIPS.map((tip) => (
                  <option key={tip} value={tip}>
                    {tip}
                  </option>
                ))}
              </select>
            </label>
            <label>
              refId
              <input
                className="input"
                type="number"
                min={0}
                value={permission.refId}
                onChange={(event) => updatePermission(index, 'refId', Number(event.target.value))}
              />
            </label>
            <label>
              yetkiTipi
              <select
                className="input"
                value={permission.yetkiTipi}
                onChange={(event) => updatePermission(index, 'yetkiTipi', event.target.value)}
              >
                {PERMISSION_TYPES.map((yetkiTipi) => (
                  <option key={yetkiTipi} value={yetkiTipi}>
                    {yetkiTipi}
                  </option>
                ))}
              </select>
            </label>

            <button type="button" className="button secondary" onClick={() => removePermission(index)}>
              Kaldır
            </button>
          </div>
        ))}
      </div>

      {duplicateError ? <p className="error-text">{duplicateError}</p> : null}

      <button type="button" className="button secondary" onClick={addPermission}>
        İzin Ekle
      </button>
    </div>
  )
}
