export const STATUS_OPTIONS = [
  'TODO',
  'IN_PROGRESS',
  'REVIEW',
  'DONE',
  'REJECTED',
] as const

export type CanonicalIssueStatus = (typeof STATUS_OPTIONS)[number]

export const STATUS_ALIASES: Record<string, CanonicalIssueStatus> = {
  TODO: 'TODO',
  OPEN: 'TODO',
  NEW: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  STARTED: 'IN_PROGRESS',
  WAITING_APPROVAL: 'REVIEW',
  WAITING_EXTERNAL: 'REVIEW',
  REVIEW: 'REVIEW',
  BLOCKED: 'REVIEW',
  DONE: 'DONE',
  RESOLVED: 'DONE',
  COMPLETED: 'DONE',
  CLOSED: 'DONE',
  REJECTED: 'REJECTED',
  CANCELED: 'REJECTED',
  CANCELLED: 'REJECTED',
}

export function normalizeIssueStatus(status?: string | null): CanonicalIssueStatus {
  const key = String(status ?? '').toUpperCase().trim()
  return STATUS_ALIASES[key] ?? 'TODO'
}

export const STATUS_LABELS: Record<string, string> = {
  TODO: 'Yapilacak',
  IN_PROGRESS: 'Devam Ediyor',
  REVIEW: 'Onay Bekliyor',
  DONE: 'Tamamlandi',
  REJECTED: 'Reddedildi',
}

export const STATUS_ID_MAP: Record<string, number> = {
  TODO: 1,
  IN_PROGRESS: 2,
  REVIEW: 3,
  DONE: 4,
  REJECTED: 5,
}

export const STATUS_ID_FALLBACKS: Record<string, number[]> = {
  TODO: [1],
  IN_PROGRESS: [2],
  REVIEW: [3],
  DONE: [4],
  REJECTED: [5],
}

export const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const

export const STATUS_COLOR_CLASS: Record<string, string> = {
  TODO: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/40',
  REVIEW: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/40',
  DONE: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/40',
}

export const PRIORITY_COLOR_CLASS: Record<string, string> = {
  LOW: 'bg-emerald-50/50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/40',
  MEDIUM: 'bg-amber-50/50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/40',
  HIGH: 'bg-orange-50/50 text-orange-700 border-orange-100 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/40',
  CRITICAL: 'bg-rose-50/50 text-rose-700 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40',
}
