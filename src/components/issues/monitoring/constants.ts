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
  TODO: 'bg-slate-100 text-slate-700 border-slate-300',
  IN_PROGRESS: 'bg-sky-100 text-sky-700 border-sky-300',
  REVIEW: 'bg-amber-100 text-amber-700 border-amber-300',
  DONE: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  REJECTED: 'bg-rose-100 text-rose-700 border-rose-300',
}

export const PRIORITY_COLOR_CLASS: Record<string, string> = {
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
  CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200',
}
