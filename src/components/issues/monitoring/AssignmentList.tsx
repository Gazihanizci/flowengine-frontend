import type { UserRoleItem } from '../../../services/userApi'

export function AssignmentList({
  users,
  selected,
  onToggle,
  onSave,
  saving,
}: {
  users: UserRoleItem[]
  selected: number[]
  onToggle: (id: number) => void
  onSave: () => void
  saving: boolean
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {selected.map((id) => {
          const user = users.find((item) => item.kullaniciId === id)
          return (
            <button key={id} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs" onClick={() => onToggle(id)}>
              {user?.adSoyad || id} ×
            </button>
          )
        })}
      </div>
      <div className="max-h-60 space-y-2 overflow-auto rounded-xl border border-slate-200 bg-white p-2">
        {users.map((user) => (
          <button key={`${user.kullaniciId}-${user.email}`} className={`w-full rounded-lg border p-2 text-left ${selected.includes(user.kullaniciId) ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white'}`} onClick={() => onToggle(user.kullaniciId)}>
            <p className="text-sm font-medium">{user.adSoyad}</p>
            <p className="text-xs text-slate-500">{user.rolAdi} · {user.email}</p>
          </button>
        ))}
      </div>
      <button onClick={onSave} disabled={saving} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {saving ? 'Kaydediliyor...' : 'Atamaları Kaydet'}
      </button>
    </div>
  )
}
