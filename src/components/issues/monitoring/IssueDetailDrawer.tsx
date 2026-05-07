import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Issue, IssueHistoryItem } from '../../../types/issue'
import { STATUS_LABELS, STATUS_OPTIONS } from './constants'
import { IssueTimeline } from './IssueTimeline'
import { IssueComments } from './IssueComments'
import { WorkflowTracker } from './WorkflowTracker'
import { AssignmentList } from './AssignmentList'
import type { IssueActivity, IssueComment } from '../../../types/issue'
import type { UserRoleItem } from '../../../services/userApi'
import type { FlowListItem } from '../../../services/flowApi'

const TABS = ['Genel Bakis', 'Zaman Tuneli', 'Yorumlar', 'Workflow', 'Atamalar', 'Gecmis'] as const
export type DetailTab = (typeof TABS)[number]

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('tr-TR')
}

function DetailLine({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <p className="text-xs font-medium tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value || '-'}</p>
    </div>
  )
}

const STATUS_ORDER: Record<string, number> = Object.fromEntries(
  STATUS_OPTIONS.map((status, index) => [status, index]),
)

export function IssueDetailDrawer({
  open,
  issue,
  activities,
  comments,
  history,
  activeTab,
  users,
  workflows,
  selectedUsers,
  commentsSending,
  assignmentSaving,
  statusSaving,
  onClose,
  onTabChange,
  onSendComment,
  onToggleAssignment,
  onSaveAssignments,
  onStatusChange,
}: {
  open: boolean
  issue?: Issue
  activities: IssueActivity[]
  comments: IssueComment[]
  history: IssueHistoryItem[]
  activeTab: DetailTab
  users: UserRoleItem[]
  workflows: FlowListItem[]
  selectedUsers: number[]
  commentsSending: boolean
  assignmentSaving: boolean
  statusSaving: boolean
  onClose: () => void
  onTabChange: (tab: DetailTab) => void
  onSendComment: (message: string) => void
  onToggleAssignment: (id: number) => void
  onSaveAssignments: () => void
  onStatusChange: (status: string) => void
}) {
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  const resolveUserName = (userId?: number | null) => {
    if (!userId) return undefined
    const user = users.find((item) => item.kullaniciId === userId)
    return user?.adSoyad ?? `Kullanici ${userId}`
  }

  const currentOwnerName =
    issue?.currentOwner?.name ||
    issue?.assignedUserName ||
    resolveUserName(typeof issue?.currentOwnerUserId === 'number' ? issue.currentOwnerUserId : null)

  const creatorName =
    issue?.createdBy?.name ||
    resolveUserName(typeof issue?.createdById === 'number' ? issue.createdById : null)

  const flowInfo = (() => {
    const akisId = Number(issue?.akisId)
    if (!Number.isFinite(akisId)) return undefined
    const flow = workflows.find((item) => item.akisId === akisId)
    if (!flow) return `ID: ${akisId}`
    return `${flow.akisAdi} (ID: ${akisId})`
  })()

  const resolvedComments = comments.map((item) => {
    if (item.user?.name) return item
    const fallbackName = resolveUserName(item.userId)
    if (!fallbackName) return item
    return {
      ...item,
      user: {
        id: item.userId ?? 0,
        name: fallbackName,
      },
    }
  })

  const currentStatusOrder = STATUS_ORDER[String(issue?.status)] ?? 0

  const drawer = (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-40 bg-black/35" />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 22, stiffness: 240 }}
            className="fixed right-0 top-0 z-50 h-screen w-full border-l border-slate-200 bg-slate-50 md:w-[720px]"
          >
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-slate-200 bg-white/85 px-4 py-4 backdrop-blur sm:px-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium tracking-wide text-slate-500">Issue #{issue?.id || '-'}</p>
                    <h3 className="text-xl font-semibold text-slate-900">{issue?.title || 'Yukleniyor...'}</h3>
                  </div>
                  <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white p-2"><X className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 pt-4 sm:px-5">
                <div className="mb-4 flex flex-wrap gap-2">
                  {TABS.map((tab) => (
                    <button key={tab} onClick={() => onTabChange(tab)} className={`rounded-full px-3 py-1.5 text-sm ${activeTab === tab ? 'bg-sky-500 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{tab}</button>
                  ))}
                </div>

                {activeTab === 'Genel Bakis' && issue ? (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <DetailLine label="Issue basligi" value={issue.title} />
                    <DetailLine label="Durum" value={STATUS_LABELS[issue.status] ?? issue.status} />
                    <DetailLine label="Oncelik" value={issue.priority} />
                    <DetailLine label="Mevcut sorumlu" value={currentOwnerName} />
                    <DetailLine label="Olusturan" value={creatorName} />
                    <DetailLine label="Olusturulma tarihi" value={formatDate(issue.createdAt)} />
                    <DetailLine label="Baslangic tarihi" value={formatDate(issue.startedAt)} />
                    <DetailLine label="Tamamlanma tarihi" value={formatDate(issue.completedAt)} />
                    <DetailLine label="Akis" value={flowInfo} />
                    <DetailLine label="Surec id" value={String(issue.surecId || issue.workflow?.workflowId || '-')} />
                    <DetailLine label="Mevcut workflow adimi" value={issue.workflow?.currentStep} />
                    <DetailLine label="Aktif workflow sorumlusu" value={issue.workflow?.activeOwner?.name} />
                    <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-3.5">
                      <p className="text-xs font-medium tracking-wide text-slate-500">Aciklama</p>
                      <p className="mt-1 text-sm text-slate-900">{issue.description || '-'}</p>
                    </div>
                  </div>
                ) : null}

                {activeTab === 'Zaman Tuneli' ? <IssueTimeline activities={activities} /> : null}
                {activeTab === 'Yorumlar' ? <IssueComments comments={resolvedComments} onSend={onSendComment} sending={commentsSending} /> : null}
                {activeTab === 'Workflow' && issue ? <WorkflowTracker issue={issue} /> : null}
                {activeTab === 'Atamalar' ? <AssignmentList users={users} selected={selectedUsers} onToggle={onToggleAssignment} onSave={onSaveAssignments} saving={assignmentSaving} /> : null}

                {activeTab === 'Gecmis' ? (
                  <div className="space-y-2">
                    {history.map((item, index) => (
                      <div key={`${item.id || index}`} className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                        <p>{item.oldValue || '-'} {'->'} {item.newValue || '-'}</p>
                        <p className="text-xs text-slate-500">{item.changedByName || item.changedBy || '-'} | {formatDate(item.changedAt)}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {issue ? (
                <div className="mt-auto border-t border-slate-200 bg-white px-4 pb-4 pt-3 sm:px-5" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="mb-2 text-xs font-medium tracking-wide text-slate-500">Durum Degistir</p>
                    <div className="flex flex-wrap gap-2">
                      {STATUS_OPTIONS.map((status) => (
                        <button
                          key={status}
                          onClick={() => {
                            if (status === issue?.status) return
                            setPendingStatus(status)
                          }}
                          disabled={statusSaving || (STATUS_ORDER[status] ?? 0) < currentStatusOrder}
                          className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-700 disabled:opacity-50"
                        >
                          {STATUS_LABELS[status] ?? status}
                        </button>
                      ))}
                    </div>
                  </div>

                  {pendingStatus ? (
                    <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
                      <p className="text-sm text-slate-800">
                        Durumu <strong>{STATUS_LABELS[pendingStatus] ?? pendingStatus}</strong> olarak guncellemek istiyor musunuz?
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                          onClick={() => setPendingStatus(null)}
                        >
                          Vazgec
                        </button>
                        <button
                          type="button"
                          className="rounded-lg border border-blue-700 bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white"
                          onClick={() => {
                            onStatusChange(pendingStatus)
                            setPendingStatus(null)
                          }}
                        >
                          Evet, Guncelle
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )

  if (typeof document === 'undefined') return null
  return createPortal(drawer, document.body)
}
