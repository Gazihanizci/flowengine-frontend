import type { RoleOption, UserRoleSummary } from '../types/roleManagement'

interface RoleAssignModalProps {
  open: boolean
  user: UserRoleSummary | null
  roleOptions: RoleOption[]
  selectedRole: number | null
  loading: boolean
  onClose: () => void
  onSelectRole: (roleId: number) => void
  onAssign: () => void
}

export default function RoleAssignModal({
  open,
  user,
  roleOptions,
  selectedRole,
  loading,
  onClose,
  onSelectRole,
  onAssign,
}: RoleAssignModalProps) {
  if (!open || !user) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Rol Atama</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">{user.adSoyad}</h3>
            <p className="mt-1 text-sm text-slate-500">Kullanici ID: {user.kullaniciId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            disabled={loading}
          >
            Kapat
          </button>
        </div>

        <div className="mt-5 space-y-2">
          <label htmlFor="assign-role-select" className="text-sm font-medium text-slate-700">
            Atanacak Rol
          </label>
          <select
            id="assign-role-select"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            value={selectedRole ?? ''}
            onChange={(event) => onSelectRole(Number(event.target.value))}
            disabled={loading}
          >
            <option value="" disabled>
              Rol seciniz
            </option>
            {roleOptions.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name} (ID: {role.id})
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed"
          >
            Vazgec
          </button>
          <button
            type="button"
            onClick={onAssign}
            disabled={loading || selectedRole === null}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-300"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Kaydediliyor...
              </>
            ) : (
              'Rol Ekle'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
