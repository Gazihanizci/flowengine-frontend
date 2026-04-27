import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchUserRoles, type UserRoleItem } from '../services/userApi'
import { useFlowStore } from '../store/flowStore'

export default function CreateFlow() {
  const navigate = useNavigate()
  const setFlowName = useFlowStore((state) => state.setFlowName)
  const setAciklama = useFlowStore((state) => state.setAciklama)
  const setStoreStarterRoleIds = useFlowStore((state) => state.setStarterRoleIds)
  const setStoreStarterUserIds = useFlowStore((state) => state.setStarterUserIds)
  const initializeSteps = useFlowStore((state) => state.initializeSteps)

  const [flowName, setFlowNameInput] = useState('')
  const [aciklama, setAciklamaInput] = useState('')
  const [stepCount, setStepCount] = useState(1)
  const [formError, setFormError] = useState<string | null>(null)
  const [userRoles, setUserRoles] = useState<UserRoleItem[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [rolesError, setRolesError] = useState<string | null>(null)
  const [selectedRoleId, setSelectedRoleId] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')
  const [starterRoleIds, setLocalStarterRoleIds] = useState<number[]>([])
  const [starterUserIds, setLocalStarterUserIds] = useState<number[]>([])

  useEffect(() => {
    let isMounted = true

    setRolesLoading(true)
    setRolesError(null)

    fetchUserRoles()
      .then((data) => {
        if (!isMounted) return
        setUserRoles(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!isMounted) return
        setRolesError('Kullanici rolleri alınamadı.')
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

  const selectedRoleItems = useMemo(
    () => roleOptions.filter((role) => starterRoleIds.includes(role.rolId)),
    [roleOptions, starterRoleIds],
  )

  const filteredUsers = useMemo(
    () => userRoles.filter((item) => selectedRoleId && String(item.rolId) === selectedRoleId),
    [userRoles, selectedRoleId],
  )

  const selectedUserItems = useMemo(
    () => userRoles.filter((item) => starterUserIds.includes(item.kullaniciId)),
    [userRoles, starterUserIds],
  )

  const handleAddRole = () => {
    if (!selectedRoleId) return
    const roleId = Number(selectedRoleId)
    if (!Number.isFinite(roleId) || starterRoleIds.includes(roleId)) return
    setLocalStarterRoleIds((prev) => [...prev, roleId])
  }

  const handleRemoveRole = (roleId: number) => {
    setLocalStarterRoleIds((prev) => prev.filter((id) => id !== roleId))
    setLocalStarterUserIds((prev) =>
      prev.filter((userId) => {
        const user = userRoles.find((item) => item.kullaniciId === userId)
        return user?.rolId !== roleId
      }),
    )
  }

  const handleAddUser = () => {
    if (!selectedUserId) return
    const userId = Number(selectedUserId)
    if (!Number.isFinite(userId) || starterUserIds.includes(userId)) return
    setLocalStarterUserIds((prev) => [...prev, userId])
    setSelectedUserId('')
  }

  const handleRemoveUser = (userId: number) => {
    setLocalStarterUserIds((prev) => prev.filter((id) => id !== userId))
  }

  const handleCreate = () => {
    if (!flowName.trim() || !aciklama.trim()) {
      setFormError('Akış adı ve açıklama boş bırakılamaz.')
      return
    }

    const count = Math.max(1, Number(stepCount))
    setFormError(null)
    setFlowName(flowName.trim())
    setAciklama(aciklama.trim())
    setStoreStarterRoleIds(starterRoleIds)
    setStoreStarterUserIds(starterUserIds)
    initializeSteps(count)
    navigate('/builder/1')
  }

  const hasAnyStarterPermission = starterRoleIds.length > 0 || starterUserIds.length > 0

  return (
    <div className="create-flow">
      <div className="w-full max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-[1fr,1.25fr]">
          <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-[0_20px_45px_rgba(2,6,23,0.35)]">
            <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-cyan-400/20 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-10 left-16 h-28 w-28 rounded-full bg-sky-400/25 blur-2xl" />

            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Flow Designer</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">Akış Oluştur</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Bu ekranda akış kimliğini tanımlarsın. Sonraki adımda her adım için form alanlarını ve
                geçiş davranışlarını detaylandırırsın.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/20 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-300">Durum</p>
                  <p className="mt-1 text-lg font-semibold">Taslak</p>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-300">Başlangıç Adımı</p>
                  <p className="mt-1 text-lg font-semibold">Adım 1</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_35px_rgba(15,23,42,0.08)]">
            <div className="mb-5 border-b border-slate-100 pb-4">
              <h2 className="text-2xl font-semibold text-slate-900">Akış Bilgileri</h2>
              <p className="mt-1 text-sm text-slate-500">Akış adı, açıklama ve adım sayısını belirleyin.</p>
            </div>

            <div className="grid gap-4">
              <label>
                <span>Akış Adı</span>
                <input
                  className="input"
                  value={flowName}
                  onChange={(event) => setFlowNameInput(event.target.value)}
                  placeholder="Orn: Dosya Gonderim"
                />
              </label>

              <label>
                <span>Açıklama</span>
                <textarea
                  className="input"
                  rows={4}
                  value={aciklama}
                  onChange={(event) => setAciklamaInput(event.target.value)}
                  placeholder="Akışın kapsamını ve iş amacını yazın"
                />
              </label>

              <label>
                <span>Adım Sayısı</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    onClick={() => setStepCount((prev) => Math.max(1, prev - 1))}
                  >
                    -
                  </button>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={stepCount}
                    onChange={(event) => setStepCount(Math.max(1, Number(event.target.value) || 1))}
                  />
                  <button
                    type="button"
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    onClick={() => setStepCount((prev) => prev + 1)}
                  >
                    +
                  </button>
                </div>
              </label>

              <div className="access-section">
                <h3>Flow Başlatma Yetkisi</h3>
                <div className="access-grid">
                  <label>
                    <span>Rol Seçimi</span>
                    <select
                      className="input"
                      value={selectedRoleId}
                      onChange={(event) => {
                        setSelectedRoleId(event.target.value)
                        setSelectedUserId('')
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
                    Rolu Ekle
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
                          Kaldir
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
                      value={selectedUserId}
                      onChange={(event) => setSelectedUserId(event.target.value)}
                      disabled={!selectedRoleId || rolesLoading}
                    >
                      <option value="">
                        {selectedRoleId ? 'Kullanıcı seciniz' : 'Önce rol seciniz'}
                      </option>
                      {filteredUsers.map((user) => (
                        <option key={`${user.kullaniciId}-${user.email}`} value={user.kullaniciId}>
                          {user.adSoyad} - {user.email}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={handleAddUser}
                    disabled={!selectedRoleId || !selectedUserId}
                  >
                    Kullanici Ekle
                  </button>
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
                          Kaldir
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {rolesLoading && <p className="hint">Roller yukleniyor...</p>}
                {rolesError && <p className="error-text">{rolesError}</p>}
                {!rolesLoading && !rolesError && selectedRoleId && filteredUsers.length === 0 && (
                  <p className="hint">Bu role ait kullanıcı bulunamadı.</p>
                )}
                {!hasAnyStarterPermission ? (
                  <p className="error-text">
                    Uyari: Akış başlatma yetkisi için henüz rol veya kullanıcı seçilmedi.
                  </p>
                ) : null}
                <p className="hint">
                  Burada secilen roller ve kullanicilar, flow baslatma yetkisi icin kaydedilir.
                </p>
              </div>
            </div>

            {formError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button className="button secondary" type="button" onClick={() => navigate('/')}>
                Vazgec
              </button>
              <button
                className="button primary"
                type="button"
                onClick={handleCreate}
                disabled={!flowName.trim()}
              >
                Tasarima Gec
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
