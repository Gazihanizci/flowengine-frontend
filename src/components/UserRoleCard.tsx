import { useMemo, useState } from 'react'
import type { AssignedRole, RoleOption, UserRoleSummary } from '../types/roleManagement'

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

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm transition ${
        selectedUser === user.kullaniciId
          ? 'border-cyan-300 bg-cyan-50/50'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kullanici</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{user.adSoyad}</h3>
          <p className="mt-1 text-sm text-slate-500">ID: {user.kullaniciId}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              onSelectUser(user.kullaniciId)
              onOpenAssignModal(user.kullaniciId)
            }}
            disabled={loading}
            className="rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-300"
          >
            Rol Ekle
          </button>
          <button
            type="button"
            onClick={() => onSelectUser(user.kullaniciId)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Sec
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {user.roller.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-500">
            Bu kullaniciya atanmis rol yok.
          </p>
        ) : (
          user.roller.map((role) => {
            const nextRoleId = resolveNextRole(role)

            return (
              <div key={`${user.kullaniciId}-${role.rolId}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
                    {role.rolAdi || roleNameById.get(role.rolId) || `ROL-${role.rolId}`}
                  </span>
                  <span className="text-xs font-medium text-slate-500">Rol ID: {role.rolId}</span>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr,auto,auto]">
                  <select
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
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
                    className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                  >
                    Guncelle
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectUser(user.kullaniciId)
                      onRemoveRole(user.kullaniciId, role.rolId)
                    }}
                    disabled={loading}
                    className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
                  >
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
