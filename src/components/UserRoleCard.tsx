import { useMemo, useState } from 'react'
import type { AssignedRole, RoleOption, UserRoleSummary } from '../types/roleManagement'
import { UserPlus, UserCheck, Trash2, Edit2 } from 'lucide-react'

interface UserRoleCardProps {
  user: UserRoleSummary
  roleOptions: RoleOption[]
  loading: boolean
  selectedUser: number | null
  onSelectUser: (userId: number) => void
  onOpenAssignModal: (userId: number) => void
  onRemoveRole: (userId: number, roleId: number) => void
  onUpdateRole: (userId: number, oldRoleId: number, newRoleId: number) => void
}

export default function UserRoleCard({
  user,
  roleOptions,
  loading,
  selectedUser,
  onSelectUser,
  onOpenAssignModal,
  onRemoveRole,
  onUpdateRole,
}: UserRoleCardProps) {
  const [nextRoleByCurrentRole, setNextRoleByCurrentRole] = useState<Record<number, number>>({})

  const roleNameById = useMemo(() => {
    return new Map<number, string>(roleOptions.map((role) => [role.id, role.name]))
  }, [roleOptions])

  const resolveNextRole = (role: AssignedRole) => {
    return nextRoleByCurrentRole[role.rolId] ?? roleOptions.find((option) => option.id !== role.rolId)?.id ?? role.rolId
  }

  const isSelected = selectedUser === user.kullaniciId

  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm transition-all duration-200 ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/10 bg-blue-50/10 dark:border-blue-900 dark:bg-slate-900/60'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Kullanıcı</p>
          <h3 className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">{user.adSoyad}</h3>
          <p className="mt-0.5 text-xs text-slate-400 font-medium">ID: {user.kullaniciId}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              onSelectUser(user.kullaniciId)
              onOpenAssignModal(user.kullaniciId)
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition duration-150 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Rol Ekle
          </button>
          <button
            type="button"
            onClick={() => onSelectUser(user.kullaniciId)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold shadow-sm transition duration-150 ${
              isSelected
                ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <UserCheck className={`h-3.5 w-3.5 ${isSelected ? 'text-blue-600 dark:text-blue-450' : 'text-slate-400'}`} />
            Seç
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {user.roller.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-medium text-slate-450 dark:border-slate-800 dark:bg-slate-900/20">
            Bu kullanıcıya atanmış herhangi bir rol bulunmuyor.
          </p>
        ) : (
          user.roller.map((role) => {
            const nextRoleId = resolveNextRole(role)
            const isNoRole = role.rolAdi === 'ROL YOK' || role.rolId === 0;

            return (
              <div key={`${user.kullaniciId}-${role.rolId}`} className="relative overflow-hidden rounded-xl border border-slate-150 bg-slate-50/30 p-3.5 dark:border-slate-900 dark:bg-slate-900/20">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${isNoRole ? 'bg-slate-400' : 'bg-blue-500'}`}></div>
                <div className="pl-1.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      isNoRole 
                        ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' 
                        : 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                    }`}>
                      {role.rolAdi || roleNameById.get(role.rolId) || `ROL-${role.rolId}`}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">Rol ID: {role.rolId || '-'}</span>
                </div>

                <div className="mt-3.5 pl-1.5 grid gap-2 sm:grid-cols-[1fr,auto,auto]">
                  <select
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:focus:border-blue-500 dark:focus:ring-blue-550/10"
                    value={nextRoleId}
                    onChange={(event) => {
                      setNextRoleByCurrentRole((prev) => ({
                        ...prev,
                        [role.rolId]: Number(event.target.value),
                      }))
                    }}
                    disabled={loading}
                  >
                    {roleOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name} (ID: {option.id})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectUser(user.kullaniciId)
                      onUpdateRole(user.kullaniciId, role.rolId, nextRoleId)
                    }}
                    disabled={loading || nextRoleId === role.rolId}
                    className="inline-flex items-center justify-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Edit2 className="h-3 w-3" />
                    Güncelle
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectUser(user.kullaniciId)
                      onRemoveRole(user.kullaniciId, role.rolId)
                    }}
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 shadow-sm hover:bg-rose-100 hover:text-rose-700 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/60"
                  >
                    <Trash2 className="h-3 w-3" />
                    Sil
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </article>
  )
}
