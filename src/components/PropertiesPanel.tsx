import { useEffect, useMemo, useState } from 'react'
import type { FormField, FieldOption } from '../types/form'
import { fetchUserRoles, type UserRoleItem } from '../services/userApi'

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
  const [userRoles, setUserRoles] = useState<UserRoleItem[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [rolesError, setRolesError] = useState<string | null>(null)
  const [selectedRoleId, setSelectedRoleId] = useState('')

  const hasOptions = field?.type === 'COMBOBOX' || field?.type === 'RADIO'

  const options = useMemo(() => field?.options ?? [], [field?.options])

  useEffect(() => {
    let isMounted = true
    setRolesLoading(true)
    setRolesError(null)
    fetchUserRoles()
      .then((data) => {
        if (!isMounted) return
        setUserRoles(data)
      })
      .catch(() => {
        if (!isMounted) return
        setRolesError('Kullanıcı rolleri alınamadı.')
      })
      .finally(() => {
        if (!isMounted) return
        setRolesLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const roleOptions = useMemo(() => {
    const map = new Map<number, string>()
    userRoles.forEach((item) => {
      if (!map.has(item.rolId)) {
        map.set(item.rolId, item.rolAdi)
      }
    })

    return Array.from(map.entries())
      .map(([rolId, rolAdi]) => ({ rolId, rolAdi }))
      .sort((a, b) => a.rolAdi.localeCompare(b.rolAdi))
  }, [userRoles])

  useEffect(() => {
    setSelectedRoleId('')
  }, [field?.id])

  const filteredUsers = useMemo(
    () =>
      userRoles.filter(
        (item) => selectedRoleId && String(item.rolId) === selectedRoleId,
      ),
    [userRoles, selectedRoleId],
  )

  const selectedRoleItems = useMemo(() => {
    const ids = field?.roleIds ?? []
    return roleOptions.filter((role) => ids.includes(role.rolId))
  }, [field?.roleIds, roleOptions])

  const selectedUserItems = useMemo(() => {
    const ids = field?.userIds ?? []
    return userRoles.filter((item) => ids.includes(item.kullaniciId))
  }, [field?.userIds, userRoles])

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

  const handleAddRole = () => {
    if (!field || !selectedRoleId) return
    const roleId = Number(selectedRoleId)
    if (!Number.isFinite(roleId)) return
    const next = field.roleIds ?? []
    if (next.includes(roleId)) return
    onUpdate({
      ...field,
      roleIds: [...next, roleId],
    })
  }

  const handleRemoveRole = (roleId: number) => {
    if (!field) return
    onUpdate({
      ...field,
      roleIds: (field.roleIds ?? []).filter((id) => id !== roleId),
    })
  }

  const handleAddUser = (value: string) => {
    if (!field || !value) return
    const userId = Number(value)
    if (!Number.isFinite(userId)) return
    const next = field.userIds ?? []
    if (next.includes(userId)) return
    onUpdate({
      ...field,
      userIds: [...next, userId],
    })
  }

  const handleRemoveUser = (userId: number) => {
    if (!field) return
    onUpdate({
      ...field,
      userIds: (field.userIds ?? []).filter((id) => id !== userId),
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

        <div className="access-section">
          <h3>Yetkilendirme</h3>
          <div className="access-grid">
            <label>
              <span>Rol Seçimi</span>
              <select
                className="input"
                value={selectedRoleId}
                onChange={(event) => {
                  setSelectedRoleId(event.target.value)
                }}
                disabled={rolesLoading}
              >
                <option value="">Rol seçiniz</option>
                {roleOptions.map((role) => (
                  <option key={role.rolId} value={role.rolId}>
                    {role.rolAdi} (ID: {role.rolId})
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button secondary"
              type="button"
              onClick={handleAddRole}
              disabled={!selectedRoleId}
            >
              Rolü Ekle
            </button>
          </div>

          {selectedRoleItems.length > 0 && (
            <div className="selected-list">
              {selectedRoleItems.map((role) => (
                <div key={role.rolId} className="selected-item">
                  <span>{role.rolAdi}</span>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => handleRemoveRole(role.rolId)}
                  >
                    Kaldır
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="access-grid single">
            <label>
              <span>Kullanıcı Seçimi</span>
              <select
                className="input"
                value=""
                onChange={(event) => handleAddUser(event.target.value)}
                disabled={!selectedRoleId || rolesLoading}
              >
                <option value="">
                  {selectedRoleId ? 'Kullanıcı seçiniz' : 'Önce rol seçiniz'}
                </option>
                {filteredUsers.map((user) => (
                  <option key={`${user.kullaniciId}-${user.email}`} value={user.kullaniciId}>
                    {user.adSoyad} - {user.email}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {selectedUserItems.length > 0 && (
            <div className="selected-list">
              {selectedUserItems.map((user) => (
                <div key={`${user.kullaniciId}-${user.email}`} className="selected-item">
                  <span>
                    {user.adSoyad} ({user.email})
                  </span>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => handleRemoveUser(user.kullaniciId)}
                  >
                    Kaldır
                  </button>
                </div>
              ))}
            </div>
          )}

          {rolesLoading && <p className="hint">Roller yükleniyor...</p>}
          {rolesError && <p className="error-text">{rolesError}</p>}
          {!rolesLoading && !rolesError && selectedRoleId && filteredUsers.length === 0 && (
            <p className="hint">Bu role ait kullanıcı bulunamadı.</p>
          )}
        </div>

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

