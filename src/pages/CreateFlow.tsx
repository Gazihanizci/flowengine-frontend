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
        setRolesError('Kullanici rolleri alinamadi.')
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
    return Array.from(map.entries()).map(([rolId, rolAdi]) => ({ rolId, rolAdi })).sort((a, b) => a.rolAdi.localeCompare(b.rolAdi))
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
      setFormError('Akis adi ve aciklama bos birakilamaz.')
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
    <div className="dashboard">
      <div className="dashboard-shell space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Is Akislari / Yeni Olustur</p>
          <h1 className="mt-1 text-5xl font-bold text-slate-900">Akis Olustur</h1>
          <p className="mt-2 text-lg text-slate-600">Sureclerinizi otomatize etmek icin yeni bir operasyonel akis tasarlayin.</p>
        </section>

        <div className="grid gap-4 xl:grid-cols-[1.7fr_0.8fr]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-5xl font-semibold text-blue-700">Workflow Yapilandirmasi</h2>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label>
                  <span className="mb-1 block text-sm font-semibold uppercase tracking-wide text-slate-600">Akis Adi</span>
                  <input
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg"
                    value={flowName}
                    onChange={(event) => setFlowNameInput(event.target.value)}
                    placeholder="Orn: Musteri Onay Sureci"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-sm font-semibold uppercase tracking-wide text-slate-600">Adim Sayisi</span>
                  <div className="flex items-center justify-between rounded-xl border border-slate-300 px-3 py-2.5">
                    <button type="button" className="text-2xl font-bold text-blue-700" onClick={() => setStepCount((prev) => Math.max(1, prev - 1))}>-</button>
                    <span className="text-4xl font-bold text-slate-900">{stepCount}</span>
                    <button type="button" className="text-2xl font-bold text-blue-700" onClick={() => setStepCount((prev) => prev + 1)}>+</button>
                  </div>
                </label>
              </div>

              <label className="mt-4 block">
                <span className="mb-1 block text-sm font-semibold uppercase tracking-wide text-slate-600">Aciklama</span>
                <textarea
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg"
                  rows={4}
                  value={aciklama}
                  onChange={(event) => setAciklamaInput(event.target.value)}
                  placeholder="Bu is akisinin amacini ve kapsamini detaylandirin..."
                />
              </label>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-5xl font-semibold text-blue-700">Flow Baslatma Yetkisi</h3>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Guvenli Erisim</span>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <label>
                  <span className="mb-1 block text-sm font-semibold uppercase tracking-wide text-slate-600">Rol Secimi</span>
                  <select
                    className="w-full rounded-xl border border-slate-300 px-3 py-3 text-lg"
                    value={selectedRoleId}
                    onChange={(event) => {
                      setSelectedRoleId(event.target.value)
                      setSelectedUserId('')
                    }}
                    disabled={rolesLoading}
                  >
                    <option value="">Rol seciniz</option>
                    {roleOptions.map((role) => (
                      <option key={role.rolId} value={role.rolId}>{role.rolAdi}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-1 block text-sm font-semibold uppercase tracking-wide text-slate-600">Kullanici Secimi</span>
                  <select
                    className="w-full rounded-xl border border-slate-300 px-3 py-3 text-lg"
                    value={selectedUserId}
                    onChange={(event) => setSelectedUserId(event.target.value)}
                    disabled={!selectedRoleId || rolesLoading}
                  >
                    <option value="">{selectedRoleId ? 'Tum Kullanicilar' : 'Once rol seciniz'}</option>
                    {filteredUsers.map((user) => (
                      <option key={`${user.kullaniciId}-${user.email}`} value={user.kullaniciId}>{user.adSoyad}</option>
                    ))}
                  </select>
                </label>

                <button className="mt-6 rounded-xl bg-blue-700 px-5 py-3 text-lg font-semibold text-white hover:bg-blue-800" type="button" onClick={() => { handleAddRole(); handleAddUser() }}>
                  + Ekle
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap gap-2">
                  {selectedRoleItems.map((role) => (
                    <button key={role.rolId} type="button" onClick={() => handleRemoveRole(role.rolId)} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm">
                      {role.rolAdi} x
                    </button>
                  ))}
                  {selectedUserItems.map((user) => (
                    <button key={`${user.kullaniciId}-${user.email}`} type="button" onClick={() => handleRemoveUser(user.kullaniciId)} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm">
                      {user.adSoyad} x
                    </button>
                  ))}
                </div>
              </div>

              {rolesLoading ? <p className="mt-2 text-sm text-slate-500">Roller yukleniyor...</p> : null}
              {rolesError ? <p className="mt-2 text-sm text-rose-700">{rolesError}</p> : null}
              {!hasAnyStarterPermission ? <p className="mt-2 text-sm text-rose-700">Uyari: Baslatma yetkisi icin en az bir rol veya kullanici secin.</p> : null}
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl bg-blue-700 p-5 text-white shadow-sm">
              <p className="inline-block rounded-md bg-white/20 px-2 py-1 text-xs font-semibold">Taslak Modu</p>
              <h3 className="mt-3 text-5xl font-semibold">Akis On Izleme</h3>
              <p className="mt-2 text-base text-blue-100">Yapilandirilan adimlar burada sematik olarak gosterilir.</p>
              <p className="mt-6 text-center text-2xl font-bold">{stepCount} ADIMLI SUREC</p>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <img src="/flow-preview.png" alt="Flow preview" className="h-44 w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
              <div className="p-4">
                <h4 className="text-4xl font-semibold text-slate-900">Sistem Entegrasyonu</h4>
                <p className="mt-2 text-base text-slate-600">Bu akis olusturuldugunda ERP ve CRM sistemleriyle otomatik olarak senkronize edilecektir.</p>
              </div>
            </section>

            <div className="grid grid-cols-2 gap-3">
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Beklenen Sure</p>
                <p className="mt-1 text-4xl font-bold text-blue-700">~24 Sa</p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kompleksite</p>
                <p className="mt-1 text-4xl font-bold text-blue-700">Dusuk</p>
              </article>
            </div>
          </aside>
        </div>

        {formError ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</div> : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">Tasarimi olusturdugunuzda duzenleme moduna gececeksiniz.</p>
            <div className="flex gap-2">
              <button className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-lg font-semibold text-slate-700" type="button" onClick={() => navigate('/')}>
                Iptal Et
              </button>
              <button className="rounded-xl bg-blue-700 px-5 py-2 text-lg font-semibold text-white hover:bg-blue-800" type="button" onClick={handleCreate} disabled={!flowName.trim()}>
                Tasarim Olustur
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
