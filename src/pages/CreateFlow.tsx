import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Plus,
  Minus,
  Shield,
  Zap,
  Layers,
  Clock,
  ArrowRight
} from 'lucide-react'
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
  const [stepCount, setStepCount] = useState(3)
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
      if (!map.has(item.rolId)) map.set(item.rolId, item.rolAdi)
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
    <div className="dashboard create-flow-page">
      <div className="dashboard-shell space-y-3.5">
        {/* Compact Hero Banner */}
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50/50 p-4 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-850/50 animate-fade-in">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-400/5 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 dark:bg-blue-500">
              <Sparkles className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">İş Akışları / Yeni Oluştur</p>
              <h1 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">Akış Oluştur</h1>
            </div>
          </div>
        </section>

        <div className="grid gap-3.5 xl:grid-cols-[1.70fr_0.8fr]">
          <div className="space-y-3.5">
            {/* Workflow Configuration Card */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800/80 pb-2 mb-3.5">
                Workflow Yapılandırması
              </h2>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-500">Akış Adı</span>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40 px-3 py-1.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:text-slate-100 dark:focus:bg-slate-905"
                    value={flowName}
                    onChange={(event) => setFlowNameInput(event.target.value)}
                    placeholder="Örn: Müşteri Onay Süreci"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-500">Adım Sayısı</span>
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40 px-2 py-1 text-sm">
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-750 transition active:scale-90"
                      onClick={() => setStepCount((prev) => Math.max(1, prev - 1))}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">{stepCount}</span>
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-750 transition active:scale-90"
                      onClick={() => setStepCount((prev) => prev + 1)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </label>
              </div>

              <label className="mt-3 block">
                <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-500">Açıklama</span>
                <textarea
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40 px-3 py-1.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:text-slate-100 dark:focus:bg-slate-905"
                  rows={2.5}
                  value={aciklama}
                  onChange={(event) => setAciklamaInput(event.target.value)}
                  placeholder="Bu iş akışının amacını ve kapsamını detaylandırın..."
                />
              </label>
            </section>

            {/* Starter Authorization Card */}
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Flow Başlatma Yetkisi</h3>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Güvenli Erişim
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-500">Rol Seçimi</span>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40 px-3 py-1.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:text-slate-100 dark:focus:bg-slate-905"
                    value={selectedRoleId}
                    onChange={(event) => {
                      setSelectedRoleId(event.target.value)
                      setSelectedUserId('')
                    }}
                    disabled={rolesLoading}
                  >
                    <option value="">Rol seçiniz</option>
                    {roleOptions.map((role) => (
                      <option key={role.rolId} value={role.rolId}>{role.rolAdi}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-500">Kullanıcı Seçimi</span>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/40 px-3 py-1.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:text-slate-100 dark:focus:bg-slate-905"
                    value={selectedUserId}
                    onChange={(event) => setSelectedUserId(event.target.value)}
                    disabled={!selectedRoleId || rolesLoading}
                  >
                    <option value="">{selectedRoleId ? 'Tüm Kullanıcılar' : 'Önce rol seçiniz'}</option>
                    {filteredUsers.map((user) => (
                      <option key={`${user.kullaniciId}-${user.email}`} value={user.kullaniciId}>{user.adSoyad}</option>
                    ))}
                  </select>
                </label>

                <button
                  className="mt-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 text-sm font-bold shadow-sm shadow-blue-500/10 transition active:scale-95 flex items-center justify-center gap-1"
                  type="button"
                  onClick={() => {
                    handleAddRole()
                    handleAddUser()
                  }}
                >
                  <Plus className="h-4 w-4" /> Ekle
                </button>
              </div>

              {/* Selected Permission Chips */}
              <div className="mt-3 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 p-2.5 min-h-[44px] flex items-center">
                {selectedRoleItems.length === 0 && selectedUserItems.length === 0 ? (
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold pl-1">Atanmış rol veya kullanıcı bulunmamaktadır.</span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedRoleItems.map((role) => (
                      <button
                        key={role.rolId}
                        type="button"
                        onClick={() => handleRemoveRole(role.rolId)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 hover:border-red-200 hover:text-red-500 dark:hover:border-red-950/50 dark:hover:text-red-400 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-350 shadow-sm transition"
                      >
                        Rol: {role.rolAdi} <span className="text-[10px] text-slate-400">×</span>
                      </button>
                    ))}
                    {selectedUserItems.map((user) => (
                      <button
                        key={`${user.kullaniciId}-${user.email}`}
                        type="button"
                        onClick={() => handleRemoveUser(user.kullaniciId)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 hover:border-red-200 hover:text-red-500 dark:hover:border-red-950/50 dark:hover:text-red-400 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-355 shadow-sm transition"
                      >
                        Kullanıcı: {user.adSoyad} <span className="text-[10px] text-slate-400">×</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {rolesLoading ? <p className="mt-2 text-xs font-bold text-slate-450">Roller yükleniyor...</p> : null}
              {rolesError ? <p className="mt-2 text-xs font-bold text-rose-600">{rolesError}</p> : null}
              {!hasAnyStarterPermission ? (
                <p className="mt-2 text-xs font-bold text-rose-500">
                  Uyarı: Başlatma yetkisi için en az bir rol veya kullanıcı seçin.
                </p>
              ) : null}
            </section>
          </div>

          {/* Right Sidebar Widgets */}
          <aside className="space-y-3.5">
            {/* Compact Preview Card */}
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-4 text-white shadow-sm shadow-blue-500/10">
              <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-white/5 blur-xl" />
              <div className="flex items-center justify-between gap-2">
                <span className="inline-block rounded bg-white/15 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide">Taslak Modu</span>
                <Layers className="h-4 w-4 text-blue-150" />
              </div>
              <h3 className="mt-2.5 text-sm font-bold">Akış Ön İzleme</h3>
              <p className="mt-0.5 text-[11px] text-blue-100/90 leading-relaxed font-medium">Yapılandırılan adımlar şematik olarak gösterilir.</p>

              <div className="mt-3.5 flex items-center justify-center gap-2 rounded-xl bg-white/10 backdrop-blur-sm py-2 px-3">
                <Zap className="h-3.5 w-3.5 text-yellow-300 animate-pulse" />
                <span className="text-xs font-extrabold uppercase tracking-wider">{stepCount} ADIMLI SÜREÇ</span>
              </div>
            </section>

            {/* Compact System Integration Card */}
            <section className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Sistem Entegrasyonu</h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-450 dark:text-slate-500 font-medium">
                    Bu akış oluşturulduğunda ERP ve CRM sistemleriyle otomatik olarak senkronize edilecektir.
                  </p>
                </div>
              </div>
            </section>

            {/* Metrics cards grid */}
            <div className="grid grid-cols-2 gap-3">
              <article className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 shrink-0">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500">Beklenen Süre</p>
                  <p className="text-xs font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">~24 Sa</p>
                </div>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Layers className="h-3.5 w-3.5" />
                </div>
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500">Kompleksite</p>
                  <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">Düşük</p>
                </div>
              </article>
            </div>
          </aside>
        </div>

        {formError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700">
            {formError}
          </div>
        ) : null}

        {/* Action Footer */}
        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Tasarımı oluşturduğunuzda düzenleme moduna geçeceksiniz.
            </p>
            <div className="flex gap-2">
              <button
                className="rounded-xl border border-slate-250 bg-white px-4 py-1.5 text-xs font-bold text-slate-650 hover:bg-slate-50 hover:border-slate-350 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 transition active:scale-95"
                type="button"
                onClick={() => navigate('/')}
              >
                İptal Et
              </button>
              <button
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 text-xs font-bold shadow-sm shadow-blue-500/10 transition active:scale-95 flex items-center gap-1"
                type="button"
                onClick={handleCreate}
                disabled={!flowName.trim()}
              >
                Tasarım Oluştur <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
