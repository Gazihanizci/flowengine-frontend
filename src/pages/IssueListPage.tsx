import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Plus, Layers, Activity, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { fetchFlows } from '../services/flowApi'
import { fetchUserRoles, fetchUsers } from '../services/userApi'
import {
  addIssueComment,
  assignIssueUsers,
  createIssue,
  fetchIssueActivities,
  fetchIssueById,
  fetchIssueComments,
  fetchIssueHistory,
  fetchMyIssues,
  updateIssueStatus,
} from '../services/issueApi'
import { useDebounce } from '../hooks/useDebounce'
import { IssueBoard } from '../components/issues/monitoring/IssueBoard'
import { normalizeIssueStatus } from '../components/issues/monitoring/constants'
import { IssueFilters, type FilterState } from '../components/issues/monitoring/IssueFilters'
import { IssueCreateDrawer } from '../components/issues/monitoring/IssueCreateDrawer'
import { IssueDetailDrawer, type DetailTab } from '../components/issues/monitoring/IssueDetailDrawer'
import type { Issue, IssueComment, IssueStatus } from '../types/issue'

const initialFilters: FilterState = {
  search: '',
  status: '',
  priority: '',
  assignedUserId: '',
  currentOwnerId: '',
  workflowStatus: '',
  createdDate: '',
}

function IssueListPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<DetailTab>('Genel Bakis')
  const [createOpen, setCreateOpen] = useState(false)
  const [assignmentSelection, setAssignmentSelection] = useState<number[]>([])
  const [toast, setToast] = useState<string>('')

  const debouncedSearch = useDebounce(filters.search.trim(), 400)

  const usersQuery = useQuery({ queryKey: ['users'], queryFn: fetchUsers })
  const userRolesQuery = useQuery({ queryKey: ['user-roles'], queryFn: fetchUserRoles })
  const flowsQuery = useQuery({ queryKey: ['flows'], queryFn: fetchFlows })

  const issuesQuery = useQuery({
    queryKey: ['issues', 'my', debouncedSearch, filters.status, filters.priority, filters.assignedUserId, filters.currentOwnerId, filters.workflowStatus, filters.createdDate],
    queryFn: () =>
      fetchMyIssues({
        search: debouncedSearch || undefined,
        status: filters.status ? [filters.status] : undefined,
        priority: filters.priority ? [filters.priority] : undefined,
        assignedUserId: filters.assignedUserId ? [Number(filters.assignedUserId)] : undefined,
        currentOwnerId: filters.currentOwnerId ? [Number(filters.currentOwnerId)] : undefined,
        workflowStatus: filters.workflowStatus ? [filters.workflowStatus] : undefined,
        createdDate: filters.createdDate || undefined,
      }),
  })

  const selectedIssueQuery = useQuery({
    queryKey: ['issue-detail', selectedIssueId],
    queryFn: () => fetchIssueById(String(selectedIssueId)),
    enabled: Boolean(selectedIssueId),
  })

  const activitiesQuery = useQuery({
    queryKey: ['issue-activities', selectedIssueId],
    queryFn: () => fetchIssueActivities(String(selectedIssueId)),
    enabled: Boolean(selectedIssueId),
  })

  const commentsQuery = useQuery({
    queryKey: ['issue-comments', selectedIssueId],
    queryFn: () => fetchIssueComments(String(selectedIssueId)),
    enabled: Boolean(selectedIssueId),
  })

  const historyQuery = useQuery({
    queryKey: ['issue-history', selectedIssueId],
    queryFn: () => fetchIssueHistory(String(selectedIssueId)),
    enabled: Boolean(selectedIssueId),
  })

  const createMutation = useMutation({
    mutationFn: createIssue,
    onSuccess: () => {
      setCreateOpen(false)
      setToast('Issue başarıyla oluşturuldu.')
      void queryClient.invalidateQueries({ queryKey: ['issues'] })
      window.setTimeout(() => setToast(''), 2500)
    },
  })

  const commentMutation = useMutation({
    mutationFn: (message: string) => addIssueComment(String(selectedIssueId), message),
    onMutate: async (message) => {
      await queryClient.cancelQueries({ queryKey: ['issue-comments', selectedIssueId] })
      const previous = queryClient.getQueryData<IssueComment[]>(['issue-comments', selectedIssueId])
      queryClient.setQueryData<IssueComment[]>(['issue-comments', selectedIssueId], (old = []) => [
        { id: Date.now(), message, createdAt: new Date().toISOString(), user: { id: 0, name: 'You' } },
        ...old,
      ])
      return { previous }
    },
    onError: (_error, _msg, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['issue-comments', selectedIssueId], ctx.previous)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['issue-comments', selectedIssueId] })
      void queryClient.invalidateQueries({ queryKey: ['issue-activities', selectedIssueId] })
    },
  })

  const assignMutation = useMutation({
    mutationFn: (userIds: number[]) =>
      assignIssueUsers(
        String(selectedIssueId),
        userIds
          .map((userId) => {
            const user = (userRolesQuery.data ?? []).find((item) => item.kullaniciId === userId)
            return user ? { userId, roleId: user.rolId } : null
          })
          .filter((item): item is { userId: number; roleId: number } => Boolean(item)),
      ),
    onSuccess: () => {
      setToast('Atamalar güncellendi.')
      void queryClient.invalidateQueries({ queryKey: ['issue-detail', selectedIssueId] })
      void queryClient.invalidateQueries({ queryKey: ['issue-activities', selectedIssueId] })
      void queryClient.invalidateQueries({ queryKey: ['issues'] })
      window.setTimeout(() => setToast(''), 2000)
    },
  })

  const statusMutation = useMutation({
    mutationFn: (status: IssueStatus) => updateIssueStatus(String(selectedIssueId), status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['issue-detail', selectedIssueId] })
      void queryClient.invalidateQueries({ queryKey: ['issues'] })
    },
  })

  const issues = issuesQuery.data ?? []
  const enrichedIssues = useMemo(() => {
    const users = usersQuery.data ?? []
    const userRoles = userRolesQuery.data ?? []
    const resolveUserName = (id?: number | null) => {
      if (typeof id !== 'number') return null
      const byUsers = users.find((item) => item.id === id)?.adSoyad
      if (byUsers) return byUsers
      const byRoles = userRoles.find((item) => item.kullaniciId === id)?.adSoyad
      if (byRoles) return byRoles
      return null
    }

    return issues.map((issue) => {
      const resolvedOwnerName =
        resolveUserName(issue.currentOwnerUserId ?? null) ??
        (issue.currentOwner?.name && !/^Kullanici\s+\d+$/i.test(issue.currentOwner.name)
          ? issue.currentOwner.name
          : null)

      const resolvedOwner =
        resolvedOwnerName
          ? { id: Number(issue.currentOwnerUserId ?? issue.currentOwner?.id ?? 0), name: resolvedOwnerName }
          : undefined

      const resolvedAssignedUsers =
        issue.assignedUsers && issue.assignedUsers.length
          ? issue.assignedUsers.map((user) => {
              const fixedName = resolveUserName(user.id) ?? user.name
              return { ...user, name: fixedName }
            })
          : (issue.assignedUserIds ?? [])
              .map((id) => {
                const name = resolveUserName(id)
                return name ? { id, name } : null
              })
              .filter((item): item is { id: number; name: string } => Boolean(item))

      return {
        ...issue,
        currentOwner: resolvedOwner ?? issue.currentOwner,
        assignedUserName:
          resolvedOwnerName ??
          (issue.assignedUserName && !/^Kullanici\s+\d+$/i.test(issue.assignedUserName)
            ? issue.assignedUserName
            : undefined),
        assignedUsers: resolvedAssignedUsers,
      }
    })
  }, [issues, userRolesQuery.data, usersQuery.data])

  const summary = useMemo(() => {
    const count = (status: string) =>
      issues.filter((item) => normalizeIssueStatus(String(item.status)) === status).length
    return {
      total: issues.length,
      inProgress: count('IN_PROGRESS'),
      waitingApproval: count('REVIEW'),
      done: count('DONE'),
      rejected: count('REJECTED'),
    }
  }, [issues])

  const selectedIssueFromList = useMemo(
    () => issues.find((item) => String(item.id) === String(selectedIssueId)),
    [issues, selectedIssueId],
  )

  const selectedIssue = useMemo<Issue | undefined>(() => {
    if (selectedIssueQuery.data && selectedIssueFromList) {
      return {
        ...selectedIssueFromList,
        ...selectedIssueQuery.data,
      }
    }
    return selectedIssueQuery.data ?? selectedIssueFromList
  }, [selectedIssueFromList, selectedIssueQuery.data])

  return (
    <div className="issue-page min-h-screen space-y-6 overflow-x-hidden bg-transparent px-3 pb-4 pt-4 md:px-4 md:pt-5 text-slate-900 dark:text-slate-100">
      {toast ? (
        <div className="fixed right-6 top-6 z-[60] rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-955/90 dark:border-emerald-900/50 px-4 py-2.5 text-sm font-bold text-emerald-700 dark:text-emerald-400 shadow-lg">
          {toast}
        </div>
      ) : null}

      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50/50 p-8 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-850/50">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/5" />
        <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/5" />
        
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Operational Workspace</p>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">İş Akışı Yönetimi</h1>
            <p className="text-slate-600 dark:text-slate-300 max-w-2xl text-sm leading-relaxed">
              Aktif issue taleplerini ve operasyonel akışları buradan yönetebilirsin.
            </p>
          </div>
          <button
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-blue-500/15 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] transition self-start sm:self-center shrink-0"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Issue</span>
          </button>
        </div>
      </section>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          { label: 'Toplam', value: summary.total, icon: Layers, border: 'border-l-4 border-l-blue-500', text: 'text-blue-600 dark:text-blue-400' },
          { label: 'Devam Eden', value: summary.inProgress, icon: Activity, border: 'border-l-4 border-l-sky-500', text: 'text-sky-600 dark:text-sky-400' },
          { label: 'Onay Bekleyen', value: summary.waitingApproval, icon: Clock, border: 'border-l-4 border-l-amber-500', text: 'text-amber-600 dark:text-amber-400' },
          { label: 'Tamamlanan', value: summary.done, icon: CheckCircle2, border: 'border-l-4 border-l-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Reddedilen', value: summary.rejected, icon: XCircle, border: 'border-l-4 border-l-rose-500', text: 'text-rose-600 dark:text-rose-400' },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div 
              key={item.label} 
              className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${item.border}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{item.label}</span>
                <Icon className={`h-4 w-4 shrink-0 ${item.text}`} />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-800 dark:text-slate-100">{item.value}</p>
            </div>
          )
        })}
      </div>

      <IssueFilters filters={filters} users={usersQuery.data ?? []} onChange={setFilters} onReset={() => setFilters(initialFilters)} />

      {issuesQuery.isLoading ? <div className="grid grid-cols-1 gap-3 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-200" />)}</div> : null}
      {issuesQuery.isError ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Issue listesi yüklenemedi.</div> : null}

      {!issuesQuery.isLoading && !issues.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-slate-400" />
          <p className="text-lg font-medium">Issue bulunamadı</p>
          <p className="text-sm text-slate-500">Filtreleri temizleyin veya yeni issue oluşturun.</p>
          <button className="mt-4 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => setCreateOpen(true)}>Issue Oluştur</button>
        </div>
      ) : null}

      {!!enrichedIssues.length ? <IssueBoard issues={enrichedIssues} onSelect={(issueId) => { setSelectedIssueId(issueId); setActiveTab('Genel Bakis'); setAssignmentSelection([]) }} /> : null}

      <IssueCreateDrawer
        open={createOpen}
        users={userRolesQuery.data ?? []}
        workflows={flowsQuery.data ?? []}
        submitting={createMutation.isPending}
        onClose={() => setCreateOpen(false)}
        onSubmit={(payload) =>
          createMutation.mutate({
            ...payload,
            assignments: payload.assignedUserIds
              .map((userId) => {
                const user = (userRolesQuery.data ?? []).find((item) => item.kullaniciId === userId)
                return user ? { userId, roleId: user.rolId } : null
              })
              .filter((item): item is { userId: number; roleId: number } => Boolean(item)),
          })
        }
      />

      <IssueDetailDrawer
        open={Boolean(selectedIssueId)}
        issue={selectedIssue}
        activities={activitiesQuery.data ?? []}
        comments={commentsQuery.data ?? []}
        history={historyQuery.data ?? []}
        activeTab={activeTab}
        users={userRolesQuery.data ?? []}
        workflows={flowsQuery.data ?? []}
        selectedUsers={assignmentSelection.length ? assignmentSelection : (selectedIssue?.assignedUsers ?? []).map((item) => item.id)}
        commentsSending={commentMutation.isPending}
        assignmentSaving={assignMutation.isPending}
        statusSaving={statusMutation.isPending}
        onClose={() => setSelectedIssueId(null)}
        onTabChange={setActiveTab}
        onSendComment={(message) => commentMutation.mutate(message)}
        onToggleAssignment={(id) => {
          setAssignmentSelection((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
        }}
        onSaveAssignments={() => assignMutation.mutate(assignmentSelection.length ? assignmentSelection : (selectedIssue?.assignedUsers ?? []).map((item) => item.id))}
        onStatusChange={(status) => statusMutation.mutate(status)}
      />
    </div>
  )
}

export default IssueListPage


