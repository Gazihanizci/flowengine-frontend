import { useEffect, useMemo, useState } from 'react'
import { Settings, CheckSquare } from 'lucide-react'
import type {
  FormField,
  FieldOption,
  FieldPermission,
  FieldPermissionTip,
  FieldPermissionYetkiTipi,
} from '../types/form'
import { fetchUserRoles, type UserRoleItem } from '../services/userApi'

interface PropertiesPanelProps {
  field: FormField | null
  onUpdate: (updated: FormField) => void
  currentStepRequiredApprovalCount: number
  onUpdateStepRequiredApprovalCount: (count: number) => void

  // Flow & Step parameters for sidebar editing:
  flowName: string
  setFlowName: (name: string) => void
  aciklama: string
  setAciklama: (desc: string) => void
  stepName: string
  onUpdateStepName: (name: string) => void
  externalFlowEnabled: boolean
  externalFlowId: number | null
  waitForExternalFlowCompletion: boolean
  resumeParentAfterSubFlow: boolean
  cancelBehavior: 'PROPAGATE' | 'WAIT'
  onUpdateStepExternalFlow: (updates: Partial<any>) => void
  availableFlows: any[]
  loadingFlows: boolean
  flowLoadError: string | null
}

type SelectedRoleItem = {
  rolId: number
  rolAdi: string
}

type SelectedUserItem = {
  kullaniciId: number
  adSoyad: string
  email: string
}

export default function PropertiesPanel({
  field,
  onUpdate,
  currentStepRequiredApprovalCount,
  onUpdateStepRequiredApprovalCount,
  flowName,
  setFlowName,
  aciklama,
  setAciklama,
  stepName,
  onUpdateStepName,
  externalFlowEnabled,
  externalFlowId,
  waitForExternalFlowCompletion,
  resumeParentAfterSubFlow,
  cancelBehavior,
  onUpdateStepExternalFlow,
  availableFlows,
  loadingFlows,
  flowLoadError,
}: PropertiesPanelProps) {
  const [optionLabel, setOptionLabel] = useState('')
  const [optionValue, setOptionValue] = useState('')
  const [userRoles, setUserRoles] = useState<UserRoleItem[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [rolesError, setRolesError] = useState<string | null>(null)
  const [selectedRoleId, setSelectedRoleId] = useState('')

  // Active Tab state: 'field' or 'flow'
  const [activeTab, setActiveTab] = useState<'field' | 'flow'>('flow')

  // Auto-switch tab to 'field' when a field is selected
  useEffect(() => {
    if (field) {
      setActiveTab('field')
    } else {
      setActiveTab('flow')
    }
  }, [field?.id])

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

  const permissions = useMemo(() => field?.permissions ?? [], [field?.permissions])

  const selectedRoleItems = useMemo<SelectedRoleItem[]>(() => {
    const roleIds = Array.from(
      new Set(
        permissions
          .filter((permission) => permission.tip === 'ROLE')
          .map((permission) => permission.refId),
      ),
    )
    return roleIds.map((rolId) => {
      const knownRole = roleOptions.find((role) => role.rolId === rolId)
      return {
        rolId,
        rolAdi: knownRole?.rolAdi ?? `ROL-${rolId}`,
      }
    })
  }, [permissions, roleOptions])

  const selectedUserItems = useMemo<SelectedUserItem[]>(() => {
    const userIds = Array.from(
      new Set(
        permissions
          .filter((permission) => permission.tip === 'USER')
          .map((permission) => permission.refId),
      ),
    )
    return userIds.map((kullaniciId) => {
      const knownUser = userRoles.find((item) => item.kullaniciId === kullaniciId)
      return {
        kullaniciId,
        adSoyad: knownUser?.adSoyad ?? `Kullanici-${kullaniciId}`,
        email: knownUser?.email ?? '-',
      }
    })
  }, [permissions, userRoles])

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

  const hasPermission = (
    tip: FieldPermissionTip,
    refId: number,
    yetkiTipi: FieldPermissionYetkiTipi,
  ) => {
    return permissions.some(
      (permission) =>
        permission.tip === tip &&
        permission.refId === refId &&
        permission.yetkiTipi === yetkiTipi,
    )
  }

  const addPermission = (
    list: FieldPermission[],
    tip: FieldPermissionTip,
    refId: number,
    yetkiTipi: FieldPermissionYetkiTipi,
  ) => {
    if (
      list.some(
        (permission) =>
          permission.tip === tip &&
          permission.refId === refId &&
          permission.yetkiTipi === yetkiTipi,
      )
    ) {
      return list
    }

    return [...list, { tip, refId, yetkiTipi }]
  }

  const removePermission = (
    list: FieldPermission[],
    tip: FieldPermissionTip,
    refId: number,
    yetkiTipi: FieldPermissionYetkiTipi,
  ) => {
    return list.filter(
      (permission) =>
        !(
          permission.tip === tip &&
          permission.refId === refId &&
          permission.yetkiTipi === yetkiTipi
        ),
    )
  }

  const handlePermissionToggle = (
    tip: FieldPermissionTip,
    refId: number,
    yetkiTipi: FieldPermissionYetkiTipi,
    checked: boolean,
  ) => {
    if (!field) return
    const base = field.permissions ?? []
    const next = checked
      ? addPermission(base, tip, refId, yetkiTipi)
      : removePermission(base, tip, refId, yetkiTipi)

    onUpdate({
      ...field,
      permissions: next,
    })
  }

  const handleAddRole = () => {
    if (!field || !selectedRoleId) return
    const roleId = Number(selectedRoleId)
    if (!Number.isFinite(roleId)) return
    if (permissions.some((permission) => permission.tip === 'ROLE' && permission.refId === roleId)) {
      return
    }
    onUpdate({
      ...field,
      permissions: [...permissions, { tip: 'ROLE', refId: roleId, yetkiTipi: 'EDIT' }],
    })
  }

  const handleRemoveRole = (roleId: number) => {
    if (!field) return
    onUpdate({
      ...field,
      permissions: permissions.filter(
        (permission) => !(permission.tip === 'ROLE' && permission.refId === roleId),
      ),
    })
  }

  const handleAddUser = (value: string) => {
    if (!field || !value) return
    const userId = Number(value)
    if (!Number.isFinite(userId)) return
    if (permissions.some((permission) => permission.tip === 'USER' && permission.refId === userId)) {
      return
    }
    onUpdate({
      ...field,
      permissions: [...permissions, { tip: 'USER', refId: userId, yetkiTipi: 'EDIT' }],
    })
  }

  const handleRemoveUser = (userId: number) => {
    if (!field) return
    onUpdate({
      ...field,
      permissions: permissions.filter(
        (permission) => !(permission.tip === 'USER' && permission.refId === userId),
      ),
    })
  }

  // Render Step & Flow Settings
  const renderFlowStepSettings = () => {
    return (
      <div className="properties space-y-4">
        {/* Akış Ayarları Section */}
        <div className="border-b border-slate-150 dark:border-slate-800 pb-3">
          <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-300 mb-2">Akış Genel Ayarları</h3>
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Akış Adı</span>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                value={flowName}
                onChange={(event) => setFlowName(event.target.value)}
                placeholder="Akış adını girin"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Açıklama</span>
              <textarea
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 resize-none"
                rows={2}
                value={aciklama ?? ''}
                onChange={(event) => setAciklama(event.target.value)}
                placeholder="Akış açıklamasını yazın"
              />
            </label>
          </div>
        </div>

        {/* Adım Ayarları Section */}
        <div>
          <h3 className="text-[13px] font-bold text-slate-800 dark:text-slate-300 mb-2">Bu Adımın Ayarları</h3>
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Adım Adı</span>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                value={stepName}
                onChange={(event) => onUpdateStepName(event.target.value)}
                placeholder="Adım adını girin"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11.5px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Gerekli Onay Sayısı</span>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                type="number"
                min={1}
                value={currentStepRequiredApprovalCount}
                onChange={(event) => onUpdateStepRequiredApprovalCount(Number(event.target.value) || 1)}
              />
            </label>

            {/* Dış Akış Entegrasyonu */}
            <div className="rounded-xl border border-slate-150 bg-slate-50 p-2.5 dark:border-slate-800 dark:bg-slate-950/20">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={externalFlowEnabled}
                  onChange={(event) =>
                    onUpdateStepExternalFlow({
                      externalFlowEnabled: event.target.checked,
                    })
                  }
                />
                <span className="text-[12px] font-bold text-slate-700 dark:text-slate-400">Adım Sonrası Dış Akış</span>
              </label>

              {externalFlowEnabled && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Başlatılacak Dış Akış</span>
                    <select
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[12.5px] outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                      value={externalFlowId ?? ''}
                      onChange={(event) =>
                        onUpdateStepExternalFlow({
                          externalFlowEnabled: true,
                          externalFlowId: event.target.value ? Number(event.target.value) : null,
                        })
                      }
                      disabled={loadingFlows}
                    >
                      <option value="">{loadingFlows ? 'Yükleniyor...' : 'Akış seçin'}</option>
                      {availableFlows.map((flow) => (
                        <option key={flow.akisId} value={flow.akisId}>
                          {flow.akisAdi} (ID: {flow.akisId})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-slate-350 text-blue-600"
                      checked={waitForExternalFlowCompletion}
                      onChange={(event) =>
                        onUpdateStepExternalFlow({
                          waitForExternalFlowCompletion: event.target.checked,
                        })
                      }
                    />
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Alt akış bitmeden bekle</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-slate-350 text-blue-600"
                      checked={resumeParentAfterSubFlow}
                      onChange={(event) =>
                        onUpdateStepExternalFlow({
                          resumeParentAfterSubFlow: event.target.checked,
                        })
                      }
                    />
                    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Ana akış devam etsin</span>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">İptal Davranışı</span>
                    <select
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[12.5px] outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                      value={cancelBehavior}
                      onChange={(event) =>
                        onUpdateStepExternalFlow({
                          cancelBehavior: event.target.value,
                        })
                      }
                    >
                      <option value="PROPAGATE">Alt akış reddedilirse iptal olsun</option>
                      <option value="WAIT">Beklemede kalsın</option>
                    </select>
                  </label>
                  {flowLoadError && <p className="text-[11px] font-bold text-rose-500">{flowLoadError}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <aside className="panel">
      {/* Settings Panel Header Tabs */}
      <div className="border-b border-slate-150 dark:border-slate-800 mb-3 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
            <Settings className="h-3.5 w-3.5" />
          </div>
          <h2 className="text-[13.5px] font-extrabold text-slate-900 dark:text-white">Yapılandırma Paneli</h2>
        </div>

        {field && (
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-[11.5px] font-bold">
            <button
              className={`flex-1 py-1 rounded-md transition ${activeTab === 'field' ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400' : 'text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-slate-250'}`}
              type="button"
              onClick={() => setActiveTab('field')}
            >
              Alan Ayarları
            </button>
            <button
              className={`flex-1 py-1 rounded-md transition ${activeTab === 'flow' ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400' : 'text-slate-500 hover:text-slate-850 dark:text-slate-400 dark:hover:text-slate-250'}`}
              type="button"
              onClick={() => setActiveTab('flow')}
            >
              Akış / Adım Ayarları
            </button>
          </div>
        )}
      </div>

      {/* Render current active tab content */}
      {activeTab === 'flow' ? (
        renderFlowStepSettings()
      ) : field ? (
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

          {['TEXT', 'TEXTAREA', 'NUMBER'].includes(field.type) && (
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

          {field.type === 'FILE' && (
            <>
              <label>
                <span>Kabul Edilen Formatlar</span>
                <input
                  className="input"
                  value={field.accept ?? ''}
                  onChange={(event) =>
                    onUpdate({
                      ...field,
                      accept: event.target.value,
                    })
                  }
                  placeholder="Örnek: image/*,.png,.jpg,.pdf"
                />
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={Boolean(field.multiple)}
                  onChange={(event) =>
                    onUpdate({
                      ...field,
                      multiple: event.target.checked,
                    })
                  }
                />
                <span>Çoklu dosya seçimine izin ver</span>
              </label>
            </>
          )}

          <div className="access-section">
            <h3 className="flex items-center gap-1 text-[12.5px] font-bold text-slate-800 dark:text-slate-250 mb-2 mt-1">
              <CheckSquare className="h-3 w-3 text-blue-500" />
              Yetkilendirme
            </h3>
            <div className="access-grid gap-2">
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
                className="button secondary w-full py-1 text-xs"
                type="button"
                onClick={handleAddRole}
                disabled={!selectedRoleId}
              >
                Rolü Ekle
              </button>
            </div>

            {selectedRoleItems.length > 0 && (
              <div className="selected-list mt-3 space-y-1.5">
                {selectedRoleItems.map((role) => (
                  <div key={role.rolId} className="selected-item permission-item p-2 rounded-lg border border-slate-150 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/20">
                    <div className="permission-item-main flex-1">
                      <span className="text-[11.5px] font-extrabold text-slate-800 dark:text-slate-350">{role.rolAdi} (ID: {role.rolId})</span>
                      <div className="permission-toggles flex gap-3 mt-1.5">
                        <label className="checkbox flex items-center gap-1 text-[10.5px]">
                          <input
                            type="checkbox"
                            className="h-3 w-3"
                            checked={hasPermission('ROLE', role.rolId, 'VIEW')}
                            onChange={(event) =>
                              handlePermissionToggle('ROLE', role.rolId, 'VIEW', event.target.checked)
                            }
                          />
                          <span>VIEW</span>
                        </label>
                        <label className="checkbox flex items-center gap-1 text-[10.5px]">
                          <input
                            type="checkbox"
                            className="h-3 w-3"
                            checked={hasPermission('ROLE', role.rolId, 'EDIT')}
                            onChange={(event) =>
                              handlePermissionToggle('ROLE', role.rolId, 'EDIT', event.target.checked)
                            }
                          />
                          <span>EDIT</span>
                        </label>
                      </div>
                    </div>
                    <button
                      className="text-[11px] text-red-500 hover:text-red-700 font-bold ml-2 shrink-0 transition"
                      type="button"
                      onClick={() => handleRemoveRole(role.rolId)}
                    >
                      Kaldır
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="access-grid single mt-3">
              <label>
                <span>Kullanıcı Seçimi</span>
                <select
                  className="input"
                  value=""
                  onChange={(event) => handleAddUser(event.target.value)}
                  disabled={!selectedRoleId || rolesLoading}
                >
                  <option value="">Kullanıcı seçiniz</option>
                  {filteredUsers.map((user) => (
                    <option key={user.kullaniciId} value={user.kullaniciId}>
                      {user.adSoyad} ({user.email})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {rolesError && <p className="text-xs font-bold text-rose-500 mt-1">{rolesError}</p>}

            {selectedUserItems.length > 0 && (
              <div className="selected-list mt-3 space-y-1.5">
                {selectedUserItems.map((user) => (
                  <div key={user.kullaniciId} className="selected-item permission-item p-2 rounded-lg border border-slate-150 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/20">
                    <div className="permission-item-main flex-1">
                      <span className="text-[11.5px] font-extrabold text-slate-800 dark:text-slate-350">{user.adSoyad}</span>
                      <p className="text-[10px] text-slate-450 dark:text-slate-500">{user.email}</p>
                      <div className="permission-toggles flex gap-3 mt-1.5">
                        <label className="checkbox flex items-center gap-1 text-[10.5px]">
                          <input
                            type="checkbox"
                            className="h-3 w-3"
                            checked={hasPermission('USER', user.kullaniciId, 'VIEW')}
                            onChange={(event) =>
                              handlePermissionToggle('USER', user.kullaniciId, 'VIEW', event.target.checked)
                            }
                          />
                          <span>VIEW</span>
                        </label>
                        <label className="checkbox flex items-center gap-1 text-[10.5px]">
                          <input
                            type="checkbox"
                            className="h-3 w-3"
                            checked={hasPermission('USER', user.kullaniciId, 'EDIT')}
                            onChange={(event) =>
                              handlePermissionToggle('USER', user.kullaniciId, 'EDIT', event.target.checked)
                            }
                          />
                          <span>EDIT</span>
                        </label>
                      </div>
                    </div>
                    <button
                      className="text-[11px] text-red-500 hover:text-red-700 font-bold ml-2 shrink-0 transition"
                      type="button"
                      onClick={() => handleRemoveUser(user.kullaniciId)}
                    >
                      Kaldır
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {hasOptions && (
            <div className="options-section mt-4 border-t border-slate-100 dark:border-slate-800 pt-3">
              <h3 className="text-[12.5px] font-bold text-slate-800 dark:text-slate-250 mb-2">Seçenek Yönetimi</h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <label>
                    <span>Seçenek Etiketi</span>
                    <input
                      className="input"
                      value={optionLabel}
                      onChange={(event) => setOptionLabel(event.target.value)}
                      placeholder="Evet"
                    />
                  </label>
                  <label>
                    <span>Seçenek Değeri</span>
                    <input
                      className="input"
                      value={optionValue}
                      onChange={(event) => setOptionValue(event.target.value)}
                      placeholder="yes"
                    />
                  </label>
                </div>
                <button
                  className="button secondary w-full py-1 text-xs"
                  type="button"
                  onClick={handleOptionAdd}
                >
                  Seçenek Ekle
                </button>
              </div>

              {options.length > 0 && (
                <div className="selected-list mt-3 space-y-1">
                  {options.map((option, index) => (
                    <div key={`${option.value}-${index}`} className="option-item flex items-center justify-between p-2 rounded-lg border border-slate-150 bg-white dark:border-slate-800 dark:bg-slate-900">
                      <div className="min-w-0">
                        <span className="block text-[11.5px] font-extrabold text-slate-800 dark:text-slate-350 truncate">{option.label}</span>
                        <span className="block text-[10px] text-slate-450 dark:text-slate-500">Değer: {option.value}</span>
                      </div>
                      <button
                        className="text-[11px] text-red-500 hover:text-red-700 font-bold ml-2 shrink-0 transition"
                        type="button"
                        onClick={() => handleOptionRemove(index)}
                      >
                        Kaldır
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </aside>
  )
}
