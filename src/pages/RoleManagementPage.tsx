import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import RoleAssignModal from '../components/RoleAssignModal'
import UserRoleCard from '../components/UserRoleCard'
import {
  Search,
  RefreshCw,
  Shield,
  ShieldAlert,
  Users,
  CheckCircle2
} from 'lucide-react'
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
      setErrorMessage(resolveErrorMessage(error, 'Kullanıcı rol listesi alınamadı.'))
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
      setErrorMessage('Rol ataması için kullanıcı ve rol seçmelisiniz.')
      return
    }

    setActionLoading(true)
    setErrorMessage(null)
    try {
      await assignRoleToUser(selectedUser, selectedRole)
      await loadUsersRoles()
      await refreshSelectedUserRoles(selectedUser)
      setSuccessMessage('Rol başarıyla eklendi.')
      setAssignModalOpen(false)
      setSelectedRole(null)
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error, 'Rol ekleme işlemi başarısız oldu.'))
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
      setSuccessMessage('Rol başarıyla kaldırıldı.')
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error, 'Rol kaldırma işlemi başarısız oldu.'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateRole = async (kullaniciId: number, eskiRolId: number, yeniRolId: number) => {
    if (eskiRolId === yeniRolId) {
      setErrorMessage('Aynı rol ile güncelleme yapılamaz.')
      return
    }

    setActionLoading(true)
    setErrorMessage(null)
    try {
      await updateUserRole(kullaniciId, eskiRolId, yeniRolId)
      await loadUsersRoles()
      await refreshSelectedUserRoles(kullaniciId)
      setSuccessMessage('Rol başarıyla güncellendi.')
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error, 'Rol güncelleme işlemi başarısız oldu.'))
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
    <div className="space-y-6">
      {/* Top Banner Card */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-[0_20px_45px_rgba(2,6,23,0.35)] dark:border-slate-900">
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-cyan-500/10 blur-3xl"></div>
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <span className="inline-flex rounded-md bg-blue-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
              Admin Workspace
            </span>
            <h1 className="mt-2.5 text-2xl font-extrabold tracking-tight">Rol Yönetimi Paneli</h1>
            <p className="mt-1 text-sm text-slate-350">Kullanıcılara roller atayabilir, yetkilerini güncelleyebilir veya kaldırabilirsiniz.</p>
          </div>
          <div className="flex gap-4 shrink-0">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-450">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Toplam Kullanıcı</p>
                <p className="text-xl font-black">{usersCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-450">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Atamalar</p>
                <p className="text-xl font-black">{totalRoleAssignments}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-450">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-450">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {successMessage}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[2.15fr_1fr]">
        {/* Left Side: Users List */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="border-b border-slate-200 p-5 dark:border-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Kullanıcı Listesi</h2>
              <button
                type="button"
                onClick={loadUsersRoles}
                disabled={loading || actionLoading}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition active:scale-[0.99] disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Yenileniyor...' : 'Yenile'}
              </button>
            </div>
            
            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px]">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Kullanıcı ara (ad veya ID)..."
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:focus:bg-slate-950"
                />
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
              <select
                value={roleFilterId}
                onChange={(event) => setRoleFilterId(event.target.value === 'all' ? 'all' : Number(event.target.value))}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:focus:bg-slate-950"
              >
                <option value="all">Tüm Roller</option>
                {roleOptions.map((role) => (
                  <option key={role.id} value={role.id}>{role.name} (ID: {role.id})</option>
                ))}
              </select>
            </div>
            <p className="mt-2.5 text-xs font-semibold text-slate-400">Gösterilen: {filteredUsers.length} / {usersRoles.length}</p>
          </div>

          <div className="p-5 max-h-[calc(100vh-360px)] overflow-y-auto pr-2">
            {loading ? (
              <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/50 p-12 text-center text-sm font-medium text-slate-450 dark:border-slate-900 dark:bg-slate-900/10">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mr-2"></div>
                Rol verileri yükleniyor...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-250 bg-slate-50/30 p-12 text-center text-sm font-medium text-slate-400 dark:border-slate-850 dark:bg-slate-900/10">
                Filtreye uygun kullanıcı bulunamadı.
              </div>
            ) : (
              <div className="space-y-4">
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

        {/* Right Side: Role Descriptions */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="h-4.5 w-4.5 text-blue-600" />
              Rol Tanımları
            </h3>
            <p className="mt-1 text-xs text-slate-400 font-semibold">Sistemdeki aktif rol yetkileri</p>

            <div className="mt-4 space-y-3">
              {roleOptions.map((role) => {
                const isNoRole = role.name === 'ROL YOK';
                return (
                  <div key={role.id} className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-200 hover:shadow-sm ${
                    isNoRole 
                      ? 'border-slate-200 bg-slate-55 bg-slate-50/50 dark:border-slate-900 dark:bg-slate-900/10' 
                      : 'border-blue-100 bg-blue-50/10 dark:border-blue-900/10 dark:bg-blue-950/5'
                  }`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${isNoRole ? 'bg-slate-400' : 'bg-blue-550 bg-blue-550'}`}></div>
                    <div className="pl-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Shield className={`h-4 w-4 ${isNoRole ? 'text-slate-400' : 'text-blue-600'}`} />
                          <span className={`text-xs font-bold ${isNoRole ? 'text-slate-600 dark:text-slate-300' : 'text-blue-700 dark:text-blue-400'}`}>{role.name}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">ID: {role.id ?? '-'}</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {isNoRole 
                          ? 'Sistemde herhangi bir role sahip olmayan kullanıcılar için varsayılan durumdur.' 
                          : `Bu role atanmış kullanıcılar sistemde ${role.name.toLowerCase()} yetkileri ile işlem gerçekleştirebilir.`
                        }
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/20">
            <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Hızlı Bilgi</h4>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
              Rol ataması güncellendiğinde değişiklik kullanıcının bir sonraki oturumunda (sistem girişi yapıldığında) etkin olur.
            </p>
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
