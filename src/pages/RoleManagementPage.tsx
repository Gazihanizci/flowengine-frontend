import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import RoleAssignModal from '../components/RoleAssignModal'
import UserRoleCard from '../components/UserRoleCard'
import {
  assignRoleToUser,
  fetchAllUserRoleMappings,
  fetchRoleOptions,
  fetchRolesByUserId,
  removeRoleFromUser,
  updateUserRole,
} from '../services/roleManagementApi'
import type { RoleOption, UserRoleSummary } from '../types/roleManagement'

function resolveErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const apiMessage = error.response?.data?.message
    if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) return apiMessage
    if (error.response?.status) return `${fallback} (HTTP ${error.response.status})`
  }
  return fallback
}

export default function RoleManagementPage() {
  const [usersRoles, setUsersRoles] = useState<UserRoleSummary[]>([])
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([])
  const [selectedUser, setSelectedUser] = useState<number | null>(null)
  const [selectedRole, setSelectedRole] = useState<number | null>(null)
  const [searchText, setSearchText] = useState('')
  const [roleFilterId, setRoleFilterId] = useState<number | 'all'>('all')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [assignModalOpen, setAssignModalOpen] = useState(false)

  const selectedUserData = useMemo(() => {
    if (selectedUser === null) return null
    return usersRoles.find((user) => user.kullaniciId === selectedUser) ?? null
  }, [usersRoles, selectedUser])

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase()
    return usersRoles.filter((user) => {
      const matchesText =
        normalizedSearch.length === 0 ||
        user.adSoyad.toLowerCase().includes(normalizedSearch) ||
        String(user.kullaniciId).includes(normalizedSearch)
      const matchesRole = roleFilterId === 'all' || user.roller.some((role) => role.rolId === roleFilterId)
      return matchesText && matchesRole
    })
  }, [usersRoles, searchText, roleFilterId])

  const usersCount = usersRoles.length
  const totalRoleAssignments = usersRoles.reduce((sum, user) => sum + user.roller.length, 0)

  const loadUsersRoles = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const [data, roles] = await Promise.all([fetchAllUserRoleMappings(), fetchRoleOptions()])
      setUsersRoles(data)
      setRoleOptions(roles)
      if (data.length > 0 && selectedUser === null) setSelectedUser(data[0].kullaniciId)
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error, 'Kullanici rol listesi alinamadi.'))
    } finally {
      setLoading(false)
    }
  }

  const refreshSelectedUserRoles = async (kullaniciId: number) => {
    const roles = await fetchRolesByUserId(kullaniciId)
    setUsersRoles((prev) =>
      prev.map((user) => (user.kullaniciId === kullaniciId ? { ...user, roller: roles } : user)),
    )
    return roles
  }

  useEffect(() => {
    loadUsersRoles()
  }, [])

  useEffect(() => {
    if (!successMessage) return
    const timer = window.setTimeout(() => setSuccessMessage(null), 2500)
    return () => window.clearTimeout(timer)
  }, [successMessage])

  const handleSelectUser = async (userId: number) => {
    setSelectedUser(userId)
    setErrorMessage(null)
    try {
      await refreshSelectedUserRoles(userId)
    } catch {
      // no-op
    }
  }

  const handleAssignRole = async () => {
    if (selectedUser === null || selectedRole === null) {
      setErrorMessage('Rol atamasi icin kullanici ve rol secmelisiniz.')
      return
    }

    setActionLoading(true)
    setErrorMessage(null)
    try {
      await assignRoleToUser(selectedUser, selectedRole)
      await loadUsersRoles()
      await refreshSelectedUserRoles(selectedUser)
      setSuccessMessage('Rol basariyla eklendi.')
      setAssignModalOpen(false)
      setSelectedRole(null)
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error, 'Rol ekleme islemi basarisiz oldu.'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemoveRole = async (kullaniciId: number, rolId: number) => {
    setActionLoading(true)
    setErrorMessage(null)
    try {
      await removeRoleFromUser(kullaniciId, rolId)
      await loadUsersRoles()
      await refreshSelectedUserRoles(kullaniciId)
      setSuccessMessage('Rol basariyla kaldirildi.')
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error, 'Rol kaldirma islemi basarisiz oldu.'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateRole = async (kullaniciId: number, eskiRolId: number, yeniRolId: number) => {
    if (eskiRolId === yeniRolId) {
      setErrorMessage('Ayni rol ile guncelleme yapilamaz.')
      return
    }

    setActionLoading(true)
    setErrorMessage(null)
    try {
      await updateUserRole(kullaniciId, eskiRolId, yeniRolId)
      await loadUsersRoles()
      await refreshSelectedUserRoles(kullaniciId)
      setSuccessMessage('Rol basariyla guncellendi.')
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error, 'Rol guncelleme islemi basarisiz oldu.'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleOpenAssignModal = (userId: number) => {
    setSelectedUser(userId)
    setSelectedRole(roleOptions[0]?.id ?? null)
    setAssignModalOpen(true)
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-[0_20px_45px_rgba(2,6,23,0.35)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="inline-flex rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]">Admin Workspace</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">Rol Yönetimi Paneli</h1>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-300">Toplam Kullanici</p>
              <p className="text-xl font-semibold">{usersCount}</p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-2">
              <p className="text-xs uppercase tracking-wide text-slate-300">Atamalar</p>
              <p className="text-xl font-semibold">{totalRoleAssignments}</p>
            </div>
          </div>
        </div>
      </section>

      {errorMessage ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{errorMessage}</div> : null}
      {successMessage ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{successMessage}</div> : null}

      <section className="grid gap-4 xl:grid-cols-[2.15fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-900">Kullanici Listesi</h2>
              <button
                type="button"
                onClick={loadUsersRoles}
                disabled={loading || actionLoading}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {loading ? 'Yenileniyor...' : 'Yenile'}
              </button>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_220px]">
              <input
                type="text"
                placeholder="Kullanici ara (ad veya ID)..."
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <select
                value={roleFilterId}
                onChange={(event) => setRoleFilterId(event.target.value === 'all' ? 'all' : Number(event.target.value))}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="all">Tum Roller</option>
                {roleOptions.map((role) => (
                  <option key={role.id} value={role.id}>{role.name} (ID: {role.id})</option>
                ))}
              </select>
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500">Gosterilen: {filteredUsers.length} / {usersRoles.length}</p>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">Rol verileri yukleniyor...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">Filtreye uygun kullanici bulunamadi.</div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user) => (
                  <UserRoleCard
                    key={user.kullaniciId}
                    user={user}
                    roleOptions={roleOptions}
                    loading={actionLoading}
                    selectedUser={selectedUser}
                    onSelectUser={handleSelectUser}
                    onOpenAssignModal={handleOpenAssignModal}
                    onRemoveRole={handleRemoveRole}
                    onUpdateRole={handleUpdateRole}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-2xl font-semibold text-slate-900">Rol Tanimlari</h3>
          <p className="mt-1 text-sm text-slate-500">Sistemdeki aktif rol yetkileri</p>

          <div className="mt-4 space-y-4">
            {roleOptions.slice(0, 6).map((role) => (
              <div key={role.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md bg-blue-100 px-2 py-1 text-sm font-semibold text-blue-700">{role.name}</span>
                  <span className="text-xs font-medium text-slate-500">ID: {role.id}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">Bu role atanmis kullanicilar sistemde ilgili yetkiler ile islem yapabilir.</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-900">Hizli Bilgi</p>
            <p className="mt-1 text-sm text-slate-600">Rol atamasi guncellendiginde degisiklik kullanicinin bir sonraki oturumunda etkin olur.</p>
          </div>

        </aside>
      </section>

      <RoleAssignModal
        open={assignModalOpen}
        user={selectedUserData}
        roleOptions={roleOptions}
        selectedRole={selectedRole}
        loading={actionLoading}
        onClose={() => {
          setAssignModalOpen(false)
          setSelectedRole(null)
        }}
        onSelectRole={(roleId) => setSelectedRole(roleId)}
        onAssign={handleAssignRole}
      />
    </div>
  )
}

