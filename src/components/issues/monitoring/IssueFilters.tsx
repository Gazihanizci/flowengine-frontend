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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 dark:backdrop-blur-md">
      <div className="grid gap-4 lg:grid-cols-12">
        <label className="relative lg:col-span-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Arama</p>
          <Search className="pointer-events-none absolute left-3.5 top-[38px] h-4 w-4 text-slate-400" />
          <input
            value={filters.search}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            placeholder="Issue başlığı veya ID..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-905"
          />
        </label>

        <label className="lg:col-span-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Durum</p>
          <select 
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-905" 
            value={filters.status} 
            onChange={(event) => onChange({ ...filters, status: event.target.value })}
          >
            <option value="">Tümü</option>
            {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{STATUS_LABELS[status] ?? status}</option>)}
          </select>
        </label>

        <label className="lg:col-span-2">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Öncelik</p>
          <select 
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-905" 
            value={filters.priority} 
            onChange={(event) => onChange({ ...filters, priority: event.target.value })}
          >
            <option value="">Tümü</option>
            {PRIORITY_OPTIONS.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </select>
        </label>

        <label className="lg:col-span-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Sorumlu</p>
          <select 
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-905" 
            value={filters.currentOwnerId} 
            onChange={(event) => onChange({ ...filters, currentOwnerId: event.target.value })}
          >
            <option value="">Herkes</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.adSoyad}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-4">
        <button 
          className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-2 text-xs font-bold text-blue-600 dark:border-slate-800 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700 active:scale-[0.98] transition" 
          onClick={onReset}
        >
          Filtreleri Temizle
        </button>
      </div>
    </div>
  )
}
