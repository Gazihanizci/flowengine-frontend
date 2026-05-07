import { Search } from 'lucide-react'
import type { UserItem } from '../../../services/userApi'
import { PRIORITY_OPTIONS, STATUS_LABELS, STATUS_OPTIONS } from './constants'

export interface FilterState {
  search: string
  status: string
  priority: string
  assignedUserId: string
  currentOwnerId: string
  workflowStatus: string
  createdDate: string
}

export function IssueFilters({
  filters,
  users,
  onChange,
  onReset,
}: {
  filters: FilterState
  users: UserItem[]
  onChange: (next: FilterState) => void
  onReset: () => void
}) {
  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-12">
        <label className="relative lg:col-span-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Arama</p>
          <Search className="pointer-events-none absolute left-3 top-9 h-4 w-4 text-slate-400" />
          <input
            value={filters.search}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            placeholder="Issue başlığı veya ID..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm"
          />
        </label>

        <label className="lg:col-span-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Durum</p>
          <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={filters.status} onChange={(event) => onChange({ ...filters, status: event.target.value })}>
            <option value="">Tümü</option>
            {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{STATUS_LABELS[status] ?? status}</option>)}
          </select>
        </label>

        <label className="lg:col-span-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Öncelik</p>
          <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={filters.priority} onChange={(event) => onChange({ ...filters, priority: event.target.value })}>
            <option value="">Tümü</option>
            {PRIORITY_OPTIONS.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </select>
        </label>

        <label className="lg:col-span-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Sorumlu</p>
          <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" value={filters.currentOwnerId} onChange={(event) => onChange({ ...filters, currentOwnerId: event.target.value })}>
            <option value="">Herkes</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.adSoyad}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-4">
        <button className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-blue-700" onClick={onReset}>
          Filtreleri Temizle
        </button>
      </div>
    </div>
  )
}
