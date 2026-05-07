import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Plus } from 'lucide-react'
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
    <div className="issue-page min-h-screen space-y-4 overflow-x-hidden bg-transparent px-3 pb-4 pt-4 md:px-4 md:pt-5 text-slate-900">
      {toast ? <div className="fixed right-6 top-6 z-[60] rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{toast}</div> : null}

      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Operational Workspace</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">İş Akışı Yönetimi</h1>
            <p className="mt-1 text-lg text-slate-600">Aktif issue taleplerini ve operasyonel akışları buradan yönetebilirsin.</p>
          </div>
          <button className="flex h-14 items-center justify-center gap-2 rounded-xl bg-blue-700 px-7 text-xl font-semibold text-white shadow-sm hover:bg-blue-800" onClick={() => setCreateOpen(true)}>
            <Plus className="h-5 w-5" /> Yeni Issue
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ['Toplam', summary.total],
          ['Devam Eden', summary.inProgress],
          ['Onay Bekleyen', summary.waitingApproval],
          ['Tamamlanan', summary.done],
          ['Reddedilen', summary.rejected],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-xl font-semibold">{value}</p>
          </div>
        ))}
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


