import type { RoleOption, UserRoleSummary } from '../types/roleManagement'
import { Shield, X } from 'lucide-react'

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
    <div className="fixed inset-0 z-55 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 transition-all duration-200">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Rol Tanımlama</p>
            <h3 className="mt-1.5 text-xl font-extrabold text-slate-900 dark:text-white">{user.adSoyad}</h3>
            <p className="mt-0.5 text-xs text-slate-400 font-medium">Kullanıcı ID: {user.kullaniciId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition disabled:opacity-50"
            disabled={loading}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-2">
          <label htmlFor="assign-role-select" className="text-xs font-bold text-slate-500 uppercase tracking-wide">
            Atanacak Rol
          </label>
          <div className="relative">
            <select
              id="assign-role-select"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:focus:bg-slate-950"
              value={selectedRole ?? ''}
              onChange={(event) => onSelectRole(Number(event.target.value))}
              disabled={loading}
            >
              <option value="" disabled>
                Rol seçiniz
              </option>
              {roleOptions.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name} (ID: {role.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-900 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onAssign}
            disabled={loading || selectedRole === null}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                Rolü Ekle
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
