import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchFlowDetail, fetchFlows, startFlow } from '../services/flowApi'
import type { FlowDetailResponse, FlowListItem } from '../services/flowApi'
import { useUserStore } from '../store/userStore'
import { fetchMyTasks } from '../services/taskApi'
import type { WorkflowTask } from '../types/task'
import { fetchNotifications } from '../services/notificationApi'
import type { NotificationItem } from '../services/notificationApi'
import { 
  Play, 
  Plus, 
  Search, 
  Settings, 
  Layers, 
  ChevronRight, 
  ChevronLeft,
  Activity, 
  Sparkles, 
  CheckSquare, 
  Bell, 
  Share2, 
  FileText, 
  Compass, 
  AlertTriangle, 
  Info,
  Clock,
  LayoutGrid,
  List,
  Table,
  GalleryHorizontal
} from 'lucide-react'

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return fallback
}

function isActionableTask(task: WorkflowTask) {
  const hasEditableField = Array.isArray(task.form) && task.form.some((field) => field.editable)
  const hasAction = Array.isArray(task.actions) && task.actions.length > 0
  return hasEditableField || hasAction
}

function getFlowInitials(name: string) {
  if (!name) return 'AK'
  const parts = name.split(' ').filter(Boolean)
  if (parts.length === 0) return 'AK'
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function Dashboard() {
  const navigate = useNavigate()
  const user = useUserStore((state) => state.user)
  const isLoaded = useUserStore((state) => state.isLoaded)
  const isAdmin = user?.rolId === 4

  const [flows, setFlows] = useState<FlowListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFlowId, setSelectedFlowId] = useState<number | null>(null)
  const [flowDetail, setFlowDetail] = useState<FlowDetailResponse | null>(null)
  const [flowDetailLoading, setFlowDetailLoading] = useState(false)
  const [activeStepId, setActiveStepId] = useState<number | null>(null)
  const [flowStartLoading, setFlowStartLoading] = useState(false)
  const [flowStartError, setFlowStartError] = useState<string | null>(null)
  const [flowStartSuccess, setFlowStartSuccess] = useState<string | null>(null)
  const [flowSearchTerm, setFlowSearchTerm] = useState('')
  const [adminFlowSort, setAdminFlowSort] = useState<'ID_DESC' | 'ID_ASC' | 'ALPHA_ASC' | 'ALPHA_DESC'>('ID_DESC')
  const [adminFlowViewMode, setAdminFlowViewMode] = useState<'GRID' | 'LIST' | 'TABLE' | 'CAROUSEL'>('LIST')
  const [userFlowSearch, setUserFlowSearch] = useState('')
  const [userFlowSort, setUserFlowSort] = useState<'ALPHA_ASC' | 'ALPHA_DESC' | 'ID_ASC'>('ALPHA_ASC')
  const [userFlowViewMode, setUserFlowViewMode] = useState<'GRID' | 'LIST'>('GRID')
  const [userFlowLayoutMode, setUserFlowLayoutMode] = useState<'PAGINATED' | 'SCROLL'>('PAGINATED')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(6)

  // Reset page to 1 when search, sort, viewMode, or layoutMode changes
  useEffect(() => {
    setCurrentPage(1)
  }, [userFlowSearch, userFlowSort, userFlowViewMode, userFlowLayoutMode])

  // User specific lists
  const [tasks, setTasks] = useState<WorkflowTask[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [notificationsLoading, setNotificationsLoading] = useState(false)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchFlows()
        if (mounted) {
          setFlows(data)
          if (data.length > 0) {
            setSelectedFlowId((prev) => prev ?? data[0].akisId)
          }
        }
      } catch {
        if (mounted) {
          setError('Akış listesi alınamadı.')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (isAdmin) return

    let mounted = true
    const loadUserData = async (isInitial = false) => {
      try {
        if (isInitial) {
          setTasksLoading(true)
          setNotificationsLoading(true)
        }
        const [tasksData, notificationsData] = await Promise.all([
          fetchMyTasks().catch(() => [] as WorkflowTask[]),
          fetchNotifications().catch(() => [] as NotificationItem[])
        ])
        if (mounted) {
          const taskList = Array.isArray(tasksData) ? tasksData.filter(isActionableTask) : []
          
          // Group tasks by surecId to deduplicate active steps belonging to same flow
          const grouped: Record<number, WorkflowTask[]> = {}
          for (const task of taskList) {
            if (!grouped[task.surecId]) {
              grouped[task.surecId] = []
            }
            grouped[task.surecId].push(task)
          }

          const deduplicated: WorkflowTask[] = []
          for (const surecId in grouped) {
            const processTasks = grouped[surecId]
            if (processTasks.length === 1) {
              deduplicated.push(processTasks[0])
            } else {
              // Keep the step that comes first (lowest adimId)
              processTasks.sort((a, b) => a.adimId - b.adimId)
              deduplicated.push(processTasks[0])
            }
          }

          setTasks(deduplicated)
          setNotifications(Array.isArray(notificationsData) ? notificationsData : [])
        }
      } catch {
        // fail silently
      } finally {
        if (mounted && isInitial) {
          setTasksLoading(false)
          setNotificationsLoading(false)
        }
      }
    }

    // Initial load with loader
    loadUserData(true)

    // Background polling every 5 seconds
    const intervalId = setInterval(() => {
      loadUserData(false)
    }, 5000)

    return () => {
      mounted = false
      clearInterval(intervalId)
    }
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin || selectedFlowId === null) return

    const loadDetail = async () => {
      setFlowDetailLoading(true)
      try {
        const data = await fetchFlowDetail(selectedFlowId)
        setFlowDetail(data)
        setActiveStepId(data.steps[0]?.stepId ?? null)
      } catch {
        // keep layout visible even if detail fetch fails
      } finally {
        setFlowDetailLoading(false)
      }
    }

    loadDetail()
  }, [isAdmin, selectedFlowId])

  const selectedFlow = useMemo(
    () => flows.find((flow) => flow.akisId === selectedFlowId) ?? null,
    [flows, selectedFlowId],
  )

  const totalFieldCount = useMemo(
    () => flowDetail?.steps.reduce((sum, step) => sum + step.fields.length, 0) ?? 0,
    [flowDetail],
  )

  const filteredFlows = useMemo(() => {
    const normalizedSearch = flowSearchTerm.trim().toLocaleLowerCase('tr-TR')
    const filtered = flows.filter((flow) => {
      return (
        !normalizedSearch ||
        flow.akisAdi.toLocaleLowerCase('tr-TR').includes(normalizedSearch) ||
        String(flow.akisId).includes(normalizedSearch) ||
        (flow.aciklama ?? '').toLocaleLowerCase('tr-TR').includes(normalizedSearch)
      )
    })

    return [...filtered].sort((a, b) => {
      if (adminFlowSort === 'ALPHA_ASC') {
        return a.akisAdi.toLocaleLowerCase('tr-TR').localeCompare(b.akisAdi.toLocaleLowerCase('tr-TR'))
      }
      if (adminFlowSort === 'ALPHA_DESC') {
        return b.akisAdi.toLocaleLowerCase('tr-TR').localeCompare(a.akisAdi.toLocaleLowerCase('tr-TR'))
      }
      if (adminFlowSort === 'ID_ASC') {
        return a.akisId - b.akisId
      }
      // Default: ID_DESC
      return b.akisId - a.akisId
    })
  }, [flows, flowSearchTerm, adminFlowSort])

  // Filter and sort flows based on user search and sorting preferences
  const filteredAndSortedUserFlows = useMemo(() => {
    const term = userFlowSearch.toLocaleLowerCase('tr-TR').trim()
    
    // 1. Filter
    let result = flows
    if (term) {
      result = flows.filter(flow => 
        flow.akisAdi.toLocaleLowerCase('tr-TR').includes(term) ||
        String(flow.akisId).includes(term) ||
        (flow.aciklama ?? '').toLocaleLowerCase('tr-TR').includes(term)
      )
    }
    
    // 2. Sort
    return [...result].sort((a, b) => {
      if (userFlowSort === 'ALPHA_ASC') {
        return a.akisAdi.toLocaleLowerCase('tr-TR').localeCompare(b.akisAdi.toLocaleLowerCase('tr-TR'))
      }
      if (userFlowSort === 'ALPHA_DESC') {
        return b.akisAdi.toLocaleLowerCase('tr-TR').localeCompare(a.akisAdi.toLocaleLowerCase('tr-TR'))
      }
      // ID_ASC
      return a.akisId - b.akisId
    })
  }, [flows, userFlowSearch, userFlowSort])

  const paginatedUserFlows = useMemo(() => {
    if (userFlowLayoutMode === 'SCROLL') {
      return filteredAndSortedUserFlows
    }
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedUserFlows.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedUserFlows, currentPage, itemsPerPage, userFlowLayoutMode])

  const totalPages = useMemo(() => {
    return Math.ceil(filteredAndSortedUserFlows.length / itemsPerPage)
  }, [filteredAndSortedUserFlows, itemsPerPage])

  const handleStartFlowById = async (akisId: number, akisName: string) => {
    setSelectedFlowId(akisId)
    setFlowStartLoading(true)
    setFlowStartError(null)
    setFlowStartSuccess(null)

    try {
      const response = await startFlow({ akisId })
      setFlowStartSuccess(
        response?.mesaj || `Akış başlatıldı: ${akisName || `#${akisId}`}`,
      )
    } catch (error) {
      setFlowStartError(toErrorMessage(error, 'Akış başlatılamadı.'))
    } finally {
      setFlowStartLoading(false)
    }
  }

  const handleStartFlow = async () => {
    if (!selectedFlowId) return

    setFlowStartLoading(true)
    setFlowStartError(null)
    setFlowStartSuccess(null)

    try {
      const response = await startFlow({ akisId: selectedFlowId })
      setFlowStartSuccess(
        response?.mesaj || `Akış başlatıldı: ${selectedFlow?.akisAdi ?? `#${selectedFlowId}`}`,
      )
    } catch (error) {
      setFlowStartError(toErrorMessage(error, 'Akış başlatılamadı.'))
    } finally {
      setFlowStartLoading(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="dashboard flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
          <Activity className="h-10 w-10 animate-spin text-blue-500" />
          <p className="text-base font-semibold">Kullanıcı bilgileri yükleniyor...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    const unreadNotifCount = notifications.filter(n => !n.okundu).length;
    return (
      <div className="dashboard w-full">
        <div className="dashboard-shell space-y-6">
          {/* User Hero Banner */}
          <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50/50 p-8 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-850/50">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/5" />
            <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/5" />
            
            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-500 animate-pulse" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Operational Workspace</p>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">İş Akışı Kontrol Paneli</h1>
                <p className="text-slate-600 dark:text-slate-300 max-w-2xl text-sm">
                  Atanan görevlerinizi tamamlayın, bildirimlerinizi inceleyin ve yeni operasyonel süreçleri hızlıca başlatın.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 lg:self-end">
                <div className="rounded-2xl border border-slate-100 bg-white/80 px-4.5 py-2.5 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-800/80">
                  <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Bekleyen Görev</span>
                  <span className="mt-1 block text-lg font-black text-blue-600 dark:text-blue-400">{tasks.length}</span>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white/80 px-4.5 py-2.5 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-800/80">
                  <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Okunmamış Bildirim</span>
                  <span className="mt-1 block text-lg font-black text-indigo-600 dark:text-indigo-400">{unreadNotifCount}</span>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white/80 px-4.5 py-2.5 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-800/80">
                  <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">Toplam Akış</span>
                  <span className="mt-1 block text-lg font-black text-slate-800 dark:text-slate-100">{flows.length}</span>
                </div>
              </div>
            </div>
          </section>

          {/* User Quick Actions Grid */}
          <section className="grid gap-6 md:grid-cols-2">
            {/* Tasks Card */}
            <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200 dark:border-slate-800 dark:bg-slate-900">
              <div className="absolute top-0 right-0 h-24 w-24 bg-blue-500/5 rounded-bl-full group-hover:scale-110 transition-transform duration-200" />
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-955/50 dark:text-blue-400">
                <CheckSquare className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Görevlerim</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Size atanan ve işlem yapmanızı bekleyen onay formlarını, veri giriş alanlarını yönetin.
              </p>
              <div className="mt-6">
                <button 
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 active:scale-[0.98] transition dark:bg-slate-800 dark:hover:bg-slate-700" 
                  type="button" 
                  onClick={() => navigate('/tasks')}
                >
                  <span>Görevlere Git</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </article>

            {/* Notifications Card */}
            <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200 dark:border-slate-800 dark:bg-slate-900">
              <div className="absolute top-0 right-0 h-24 w-24 bg-indigo-500/5 rounded-bl-full group-hover:scale-110 transition-transform duration-200" />
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-955/50 dark:text-indigo-400">
                <Bell className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Bildirimler</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Süreçlerdeki son durum güncellemelerini, onay veya ret hareketlerini anlık olarak izleyin.
              </p>
              <div className="mt-6">
                <button 
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-955 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 active:scale-[0.98] transition dark:bg-slate-800 dark:hover:bg-slate-700" 
                  type="button" 
                  onClick={() => navigate('/notifications')}
                >
                  <span>Bildirimleri Aç</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </article>
          </section>

          {/* Startable Flows Grid Section */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 dark:backdrop-blur-md space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 fill-blue-500 text-blue-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Yeni Süreç Başlat</span>
                </div>
                <h2 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">Başlatılabilir İş Akışları</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Yetkiniz dahilindeki iş süreçlerini arayıp sıralayarak anında başlatabilirsiniz.</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-blue-100 bg-blue-50/20 px-3 py-1.5 text-xs font-bold text-blue-700 dark:border-blue-900/50 dark:bg-blue-955/20 dark:text-blue-400">
                <span>{filteredAndSortedUserFlows.length}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-500/80">Aktif Akış</span>
              </div>
            </div>

            {/* Filter and Search Toolbar */}
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
              {/* Left group: Search and Sort */}
              <div className="flex flex-col gap-3 md:flex-row md:items-center flex-1 max-w-4xl">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs font-semibold outline-none transition focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
                    type="search"
                    value={userFlowSearch}
                    placeholder="Akış adı veya açıklama ara..."
                    onChange={(e) => setUserFlowSearch(e.target.value)}
                  />
                </div>

                {/* Sort controls */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sırala:</span>
                  <div className="flex gap-1">
                    {(['ALPHA_ASC', 'ALPHA_DESC', 'ID_ASC'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setUserFlowSort(mode)}
                        className={`rounded-full px-3 py-1.5 text-[10px] font-bold transition ${
                          userFlowSort === mode
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10'
                            : 'bg-white border border-slate-200 text-slate-655 hover:bg-slate-50 dark:bg-slate-950 dark:border-slate-750 dark:text-slate-400 dark:hover:bg-slate-800'
                        }`}
                      >
                        {mode === 'ALPHA_ASC' ? 'A-Z' : mode === 'ALPHA_DESC' ? 'Z-A' : 'ID'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right group: Layout Preferences */}
              <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 xl:border-none xl:pt-0">
                {/* Layout Mode (Paginated vs Scroll) */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Düzen:</span>
                  <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-750 dark:bg-slate-950">
                    <button
                      type="button"
                      onClick={() => setUserFlowLayoutMode('PAGINATED')}
                      className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition ${
                        userFlowLayoutMode === 'PAGINATED'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      Sayfalı
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserFlowLayoutMode('SCROLL')}
                      className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition ${
                        userFlowLayoutMode === 'SCROLL'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      Kaydırılabilir
                    </button>
                  </div>
                </div>

                {/* Page Size Selector (Visible only if Paginated) */}
                {userFlowLayoutMode === 'PAGINATED' && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Limit:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 outline-none transition focus:border-blue-500 dark:border-slate-750 dark:bg-slate-950 dark:text-slate-250"
                    >
                      {[6, 12, 24].map((size) => (
                        <option key={size} value={size}>
                          {size} Adet
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* View Mode (Grid vs List) */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Görünüm:</span>
                  <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setUserFlowViewMode('GRID')}
                      title="Izgara Görünümü"
                      className={`rounded-md p-1.5 transition ${
                        userFlowViewMode === 'GRID'
                          ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400'
                          : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-350'
                      }`}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserFlowViewMode('LIST')}
                      title="Liste Görünümü"
                      className={`rounded-md p-1.5 transition ${
                        userFlowViewMode === 'LIST'
                          ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400'
                          : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-350'
                      }`}
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Error & Success States */}
            {flowStartError ? (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 dark:border-rose-900/30 dark:bg-rose-955/20 dark:text-rose-400">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">{flowStartError}</p>
              </div>
            ) : null}
            {flowStartSuccess ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-955/20 dark:text-emerald-400">
                <CheckSquare className="h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">{flowStartSuccess}</p>
              </div>
            ) : null}

            {/* Flows Rendering */}
            {filteredAndSortedUserFlows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center text-xs font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-900/10">
                Arama kriterine uygun iş akışı bulunamadı.
              </div>
            ) : (
              <div className={userFlowLayoutMode === 'SCROLL' ? "max-h-[500px] overflow-y-auto pr-1.5 custom-scrollbar" : ""}>
                {userFlowViewMode === 'GRID' ? (
                  /* Grid Layout */
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {paginatedUserFlows.map((flow) => {
                      const isLaunchingThis = flowStartLoading && selectedFlowId === flow.akisId;
                      return (
                        <div
                          key={flow.akisId}
                          className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/80 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950/40 dark:hover:bg-slate-950/70"
                        >
                          <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />
                          
                          <div>
                            {/* Header ID */}
                            <div className="flex items-center justify-between mb-3.5">
                              <span className="rounded-lg bg-slate-100 dark:bg-slate-900/80 px-2 py-0.5 text-[9px] font-bold text-slate-500 dark:text-slate-400">
                                #{flow.akisId}
                              </span>
                            </div>
                            {/* Name & Desc */}
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-650 text-xs font-bold text-white shadow-sm shadow-blue-500/10 dark:from-blue-600 dark:to-indigo-800 uppercase">
                                {getFlowInitials(flow.akisAdi)}
                              </div>
                              <h3 className="text-sm font-extrabold text-slate-800 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                                {flow.akisAdi}
                              </h3>
                            </div>
                            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {flow.aciklama || 'Bu iş süreci için açıklama girilmemiş.'}
                            </p>
                          </div>

                          {/* Action Button */}
                          <div className="mt-5">
                            <button
                              type="button"
                              disabled={flowStartLoading}
                              onClick={() => handleStartFlowById(flow.akisId, flow.akisAdi)}
                              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-500/10 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] transition disabled:opacity-50"
                            >
                              {isLaunchingThis ? (
                                <>
                                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                  <span>Başlatılıyor...</span>
                                </>
                              ) : (
                                <>
                                  <Play className="h-3 w-3 fill-white" />
                                  <span>Süreci Başlat</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* List Layout */
                  <div className="space-y-3">
                    {paginatedUserFlows.map((flow) => {
                      const isLaunchingThis = flowStartLoading && selectedFlowId === flow.akisId;
                      return (
                        <div
                          key={flow.akisId}
                          className="group relative flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:border-blue-500/80 hover:shadow-sm dark:border-slate-800 dark:bg-slate-950/40 dark:hover:bg-slate-950/70"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="rounded-lg bg-slate-100 dark:bg-slate-900/80 px-2 py-1 text-[9px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                              #{flow.akisId}
                            </span>
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-650 text-xs font-bold text-white shadow-sm shadow-blue-500/10 dark:from-blue-600 dark:to-indigo-800 uppercase">
                              {getFlowInitials(flow.akisAdi)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm font-extrabold text-slate-800 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                                {flow.akisAdi}
                              </h3>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                                {flow.aciklama || 'Bu iş süreci için açıklama girilmemiş.'}
                              </p>
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="shrink-0">
                            <button
                              type="button"
                              disabled={flowStartLoading}
                              onClick={() => handleStartFlowById(flow.akisId, flow.akisAdi)}
                              className="w-full md:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-500/10 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] transition disabled:opacity-50"
                            >
                              {isLaunchingThis ? (
                                <>
                                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                  <span>Başlatılıyor...</span>
                                </>
                              ) : (
                                <>
                                  <Play className="h-3 w-3 fill-white" />
                                  <span>Süreci Başlat</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Pagination Controls */}
            {userFlowLayoutMode === 'PAGINATED' && totalPages > 1 && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-2">
                {/* Count info */}
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 text-center sm:text-left">
                  Toplam <span className="text-slate-700 dark:text-slate-200 font-bold">{filteredAndSortedUserFlows.length}</span> akıştan{' '}
                  <span className="text-slate-700 dark:text-slate-200 font-bold">
                    {Math.min((currentPage - 1) * itemsPerPage + 1, filteredAndSortedUserFlows.length)}
                  </span>
                  -
                  <span className="text-slate-700 dark:text-slate-200 font-bold">
                    {Math.min(currentPage * itemsPerPage, filteredAndSortedUserFlows.length)}
                  </span>{' '}
                  arası gösteriliyor.
                </div>

                {/* Page Navigation */}
                <div className="flex items-center justify-center gap-1">
                  {/* Prev Button */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white dark:border-slate-750 dark:bg-slate-950 dark:text-slate-350 dark:hover:bg-slate-800 transition"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    const isFirstOrLast = page === 1 || page === totalPages;
                    const isNearCurrent = Math.abs(page - currentPage) <= 1;
                    
                    if (isFirstOrLast || isNearCurrent) {
                      return (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition ${
                            currentPage === page
                              ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10'
                              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-750 dark:bg-slate-950 dark:text-slate-350 dark:hover:bg-slate-800'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    }
                    
                    if (
                      (page === 2 && currentPage > 3) ||
                      (page === totalPages - 1 && currentPage < totalPages - 2)
                    ) {
                      return (
                        <span key={page} className="px-1 text-xs text-slate-400 dark:text-slate-500 font-bold select-none">
                          ...
                        </span>
                      );
                    }

                    return null;
                  })}

                  {/* Next Button */}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white dark:border-slate-750 dark:bg-slate-950 dark:text-slate-350 dark:hover:bg-slate-800 transition"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Recent Activity Section */}
          <section className="grid gap-6 lg:grid-cols-2">
            
            {/* Recent Tasks Card List */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col min-h-[300px]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-blue-500" />
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Son Atanan Görevler</h3>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                  {tasks.length} Bekleyen
                </span>
              </div>

              <div className="mt-4 flex-1 space-y-3 overflow-y-auto max-h-[320px]">
                {tasksLoading ? (
                  <div className="flex h-40 items-center justify-center text-slate-400">
                    <Activity className="h-6 w-6 animate-spin text-blue-500" />
                  </div>
                ) : tasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-450 dark:text-slate-500">
                    <CheckSquare className="h-8 w-8 opacity-30 mb-1" />
                    <p className="text-xs">Aktif atanmış göreviniz bulunmuyor.</p>
                  </div>
                ) : (
                  tasks.slice(0, 4).map((task) => (
                    <div 
                      key={task.taskId}
                      className="group flex items-center justify-between gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 dark:border-slate-800/60 dark:bg-slate-800/25 dark:hover:bg-slate-800/50 transition duration-150"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-800 dark:text-slate-200">{task.akisAdi || 'Belirtilmemiş Akış'}</p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          <span>Adım: {task.adimAdi}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => navigate(`/tasks/${task.taskId}`)}
                        className="shrink-0 flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        Formu Doldur
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Notifications Card List */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col min-h-[300px]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-indigo-500" />
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Son Bildirimler</h3>
                </div>
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                  {unreadNotifCount} Okunmamış
                </span>
              </div>

              <div className="mt-4 flex-1 space-y-3 overflow-y-auto max-h-[320px]">
                {notificationsLoading ? (
                  <div className="flex h-40 items-center justify-center text-slate-400">
                    <Activity className="h-6 w-6 animate-spin text-indigo-500" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-450 dark:text-slate-500">
                    <Bell className="h-8 w-8 opacity-30 mb-1" />
                    <p className="text-xs">Yeni bildirim bulunmuyor.</p>
                  </div>
                ) : (
                  notifications.slice(0, 4).map((notif) => (
                    <div 
                      key={notif.bildirimId}
                      className={`p-3 rounded-xl border transition duration-150 ${
                        notif.okundu 
                          ? 'border-slate-100 bg-slate-50/30 dark:border-slate-800/40 dark:bg-slate-800/10' 
                          : 'border-blue-100 bg-blue-50/20 dark:border-blue-900/10 dark:bg-blue-955/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-bold text-slate-800 dark:text-slate-200 truncate ${notif.okundu ? '' : 'text-blue-900 dark:text-blue-300 font-semibold'}`}>
                            {notif.baslik}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-455 line-clamp-2 leading-relaxed">
                            {notif.mesaj}
                          </p>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium mt-0.5">
                          {new Date(notif.olusturmaTarihi).toLocaleDateString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard w-full">
      <div className="dashboard-shell space-y-6">
        
        {/* Admin Header Banner */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50/50 p-8 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-850/50">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/5" />
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/5" />
          
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Operational Workspace</p>
              </div>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Akış Kontrol Paneli</h1>
              <p className="mt-2 text-base text-slate-600 dark:text-slate-300">Aktif iş akışlarını yönetin, süreç adımlarını analiz edin ve yeni operasyonlar başlatın.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98] transition dark:border-slate-700 dark:bg-slate-855 dark:text-slate-200 dark:hover:bg-slate-700"
                type="button"
                onClick={() => selectedFlowId && navigate(`/flow-edit/${selectedFlowId}`)}
                disabled={!selectedFlowId}
              >
                <Settings className="h-4 w-4" />
                Akışı Düzenle
              </button>
              <button 
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 active:scale-[0.98] transition" 
                type="button" 
                onClick={() => navigate('/create-flow')}
              >
                <Plus className="h-4 w-4" />
                Yeni Akış Oluştur
              </button>
            </div>
          </div>
        </section>

        {flowStartError ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-400">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{flowStartError}</p>
          </div>
        ) : null}
        
        {flowStartSuccess ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-400">
            <CheckSquare className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{flowStartSuccess}</p>
          </div>
        ) : null}

        {/* Filter and Search Section */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 dark:backdrop-blur-md">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Sırala:</span>
                <select
                  value={adminFlowSort}
                  onChange={(e) => setAdminFlowSort(e.target.value as any)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-750 outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:focus:bg-slate-900"
                >
                  <option value="ID_DESC">Akış ID (Yeniden Eskiye)</option>
                  <option value="ID_ASC">Akış ID (Eskiden Yeniye)</option>
                  <option value="ALPHA_ASC">Alfabetik (A-Z)</option>
                  <option value="ALPHA_DESC">Alfabetik (Z-A)</option>
                </select>
              </div>
            </div>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-900"
                type="search"
                value={flowSearchTerm}
                placeholder="Akış adı veya açıklama ile ara..."
                onChange={(event) => setFlowSearchTerm(event.target.value)}
              />
            </div>
          </div>
        </section>

        {/* List and Details Layout */}
        <section className="grid gap-6 xl:grid-cols-[1.6fr_1.1fr] items-start">
          {/* Flows List Panel */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 min-w-0 w-full overflow-hidden">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800/80 gap-3">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Akış Listesi</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {filteredFlows.length} Aktif Kayıt
                </span>
              </div>
              
              {/* View Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5">
                {(['GRID', 'LIST', 'TABLE', 'CAROUSEL'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setAdminFlowViewMode(mode)}
                    className={`rounded-md p-1.5 transition flex items-center justify-center ${
                      adminFlowViewMode === mode
                        ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-455'
                        : 'text-slate-450 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                    title={
                      mode === 'GRID' ? 'Izgara' :
                      mode === 'LIST' ? 'Liste' :
                      mode === 'TABLE' ? 'Tablo' :
                      'Yana Kaydır'
                    }
                  >
                    {mode === 'GRID' && <LayoutGrid className="h-4 w-4" />}
                    {mode === 'LIST' && <List className="h-4 w-4" />}
                    {mode === 'TABLE' && <Table className="h-4 w-4" />}
                    {mode === 'CAROUSEL' && <GalleryHorizontal className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-405">
                  <Activity className="h-8 w-8 animate-spin text-blue-550" />
                  <p className="mt-2 text-sm">Akışlar yükleniyor...</p>
                </div>
              ) : null}
              {error ? (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-400">
                  <AlertTriangle className="h-5 w-5 shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              ) : null}
              {!loading && !error && filteredFlows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
                  <Compass className="h-8 w-8 opacity-40 mb-2" />
                  <p className="text-sm">Aranan kriterlere uygun akış bulunamadı.</p>
                </div>
              ) : null}
              
              {!loading && !error && filteredFlows.length > 0 && (
                <>
                  {/* LIST view */}
                  {adminFlowViewMode === 'LIST' && (
                    <div className="space-y-2.5 max-h-[580px] overflow-y-auto p-4 custom-scrollbar">
                      {filteredFlows.map((flow) => (
                        <button
                          key={flow.akisId}
                          type="button"
                          onClick={() => setSelectedFlowId(flow.akisId)}
                          className={`w-full rounded-xl border p-4 text-left transition-all duration-300 ease-out flex items-center justify-between gap-4 group relative ${
                            selectedFlowId === flow.akisId 
                              ? 'border-blue-600 bg-gradient-to-r from-blue-50/30 to-indigo-50/10 dark:from-blue-955/15 dark:to-indigo-955/5 shadow-md shadow-blue-500/5 scale-[1.01] ring-2 ring-blue-500/10' 
                              : 'border-slate-100 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-750 hover:scale-[1.005]'
                          }`}
                        >
                          {selectedFlowId === flow.akisId && (
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 rounded-l-xl" />
                          )}
                          <div className="min-w-0 flex-1 flex items-center gap-3 pl-1">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-650 text-xs font-bold text-white shadow-sm shadow-blue-500/10 dark:from-blue-600 dark:to-indigo-800 uppercase">
                              {getFlowInitials(flow.akisAdi)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2.5">
                                <p className="truncate text-base font-bold text-slate-800 group-hover:text-blue-600 dark:text-slate-200 dark:group-hover:text-blue-400 transition">{flow.akisAdi}</p>
                                <span className="shrink-0 text-[10px] font-bold text-slate-400">#{flow.akisId}</span>
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{flow.aciklama || 'Açıklama bulunmuyor.'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* GRID view */}
                  {adminFlowViewMode === 'GRID' && (
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 max-h-[580px] overflow-y-auto p-4 custom-scrollbar">
                      {filteredFlows.map((flow) => (
                        <button
                          key={flow.akisId}
                          type="button"
                          onClick={() => setSelectedFlowId(flow.akisId)}
                          className={`rounded-2xl border p-4.5 text-left transition-all duration-300 ease-out flex flex-col justify-between gap-4 group relative ${
                            selectedFlowId === flow.akisId 
                              ? 'border-blue-600 bg-gradient-to-br from-blue-50/40 to-indigo-50/15 dark:from-blue-955/15 dark:to-indigo-955/5 shadow-lg shadow-blue-500/10 scale-[1.02] ring-2 ring-blue-500/20' 
                              : 'border-slate-100 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-750 hover:scale-[1.01] hover:shadow-md'
                          }`}
                        >
                          {selectedFlowId === flow.akisId && (
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 rounded-l-2xl" />
                          )}
                          <div className="pl-1.5 w-full">
                            <div className="flex items-center justify-between mb-3">
                              <span className="rounded-lg bg-slate-100 dark:bg-slate-900/80 px-2 py-0.5 text-[9px] font-bold text-slate-500 dark:text-slate-400">
                                #{flow.akisId}
                              </span>
                              {selectedFlowId === flow.akisId && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-600 dark:bg-blue-955 dark:text-blue-400 animate-pulse">
                                  Aktif
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-650 text-xs font-bold text-white shadow-sm shadow-blue-500/10 dark:from-blue-600 dark:to-indigo-800 uppercase">
                                {getFlowInitials(flow.akisAdi)}
                              </div>
                              <h3 className="text-sm font-extrabold text-slate-800 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                                {flow.akisAdi}
                              </h3>
                            </div>
                            <p className="mt-3.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {flow.aciklama || 'Bu iş süreci için açıklama girilmemiş.'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* TABLE view */}
                  {adminFlowViewMode === 'TABLE' && (
                    <div className="max-h-[580px] overflow-y-auto p-4 custom-scrollbar">
                      <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800/80">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/40 text-slate-450 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                              <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider">ID</th>
                              <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider">İkon</th>
                              <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider">Akış Adı</th>
                              <th className="py-3 px-4 text-[10px] font-bold uppercase tracking-wider">Açıklama</th>
                              <th className="py-3 px-4 text-right text-[10px] font-bold uppercase tracking-wider">Detay</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60 bg-white dark:bg-slate-900/10">
                            {filteredFlows.map((flow) => (
                              <tr
                                key={flow.akisId}
                                onClick={() => setSelectedFlowId(flow.akisId)}
                                className={`cursor-pointer transition-all duration-300 ${
                                  selectedFlowId === flow.akisId
                                    ? 'bg-blue-50/30 dark:bg-blue-955/15 font-bold'
                                    : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                                }`}
                              >
                                <td className={`py-3.5 px-4 text-xs font-bold transition-all duration-200 ${
                                  selectedFlowId === flow.akisId
                                    ? 'border-l-4 border-l-blue-600 pl-3 text-blue-600 dark:text-blue-400'
                                    : 'text-slate-500 dark:text-slate-400'
                                }`}>#{flow.akisId}</td>
                                <td className="py-3.5 px-4">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-655 text-[10px] font-black text-white shadow-sm dark:from-blue-600 dark:to-indigo-800 uppercase">
                                    {getFlowInitials(flow.akisAdi)}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-sm font-extrabold text-slate-800 dark:text-slate-200 max-w-[150px] truncate">{flow.akisAdi}</td>
                                <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate">{flow.aciklama || '-'}</td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 text-slate-400 hover:text-blue-500 hover:border-blue-500 transition">
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* CAROUSEL view */}
                  {adminFlowViewMode === 'CAROUSEL' && (
                    <div className="p-4 space-y-4">
                      <div className="relative group">
                        <div 
                          id="adminFlowCarousel"
                          className="flex gap-4 overflow-x-hidden scroll-smooth snap-x snap-mandatory"
                        >
                          {filteredFlows.map((flow) => (
                            <button
                              key={flow.akisId}
                              type="button"
                              onClick={() => setSelectedFlowId(flow.akisId)}
                              className={`w-[260px] shrink-0 snap-start rounded-2xl border p-5 text-left transition-all duration-300 ease-out flex flex-col justify-between min-h-[170px] group relative ${
                                selectedFlowId === flow.akisId 
                                  ? 'border-blue-600 bg-gradient-to-br from-blue-50/40 to-indigo-50/15 dark:from-blue-955/15 dark:to-indigo-955/5 shadow-lg shadow-blue-500/10 scale-[1.02] ring-2 ring-blue-500/20' 
                                  : 'border-slate-100 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-750 hover:scale-[1.01] hover:shadow-md'
                              }`}
                            >
                              {selectedFlowId === flow.akisId && (
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 rounded-l-2xl" />
                              )}
                              <div className="pl-1.5 w-full">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="rounded-lg bg-slate-100 dark:bg-slate-900/80 px-2 py-0.5 text-[9px] font-bold text-slate-500 dark:text-slate-400">
                                    #{flow.akisId}
                                  </span>
                                  {selectedFlowId === flow.akisId && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-600 dark:bg-blue-955 dark:text-blue-400 animate-pulse">
                                      Aktif
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-650 text-xs font-bold text-white shadow-sm dark:from-blue-600 dark:to-indigo-800 uppercase">
                                    {getFlowInitials(flow.akisAdi)}
                                  </div>
                                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                                    {flow.akisAdi}
                                  </h3>
                                </div>
                                <p className="mt-3.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                  {flow.aciklama || 'Bu iş süreci için açıklama girilmemiş.'}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById('adminFlowCarousel');
                            if (el) el.scrollLeft -= 280;
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 transition"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById('adminFlowCarousel');
                            if (el) el.scrollLeft += 280;
                          }}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 transition"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Details Column */}
          <div className="space-y-4">
            
            {/* Flow Details Card */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                <Info className="h-3.5 w-3.5" />
                <span>Detaylı Görünüm</span>
              </div>
              <h3 className="mt-3 text-2xl font-extrabold text-slate-800 dark:text-white leading-tight">{selectedFlow?.akisAdi}</h3>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 text-center dark:border-slate-800 dark:bg-slate-800/40">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">Adım Sayısı</p>
                  {flowDetailLoading ? (
                    <div className="mx-auto mt-2 h-7 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  ) : (
                    <p className="mt-1 text-2xl font-black text-blue-600 dark:text-blue-400">{flowDetail?.steps.length ?? 0}</p>
                  )}
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 text-center dark:border-slate-800 dark:bg-slate-800/40">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">Toplam Alan</p>
                  {flowDetailLoading ? (
                    <div className="mx-auto mt-2 h-7 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  ) : (
                    <p className="mt-1 text-2xl font-black text-blue-600 dark:text-blue-400">{totalFieldCount}</p>
                  )}
                </div>
              </div>

              {/* Interactive Steps Timeline */}
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-450 border-b border-slate-100 pb-2 dark:border-slate-800">Sürecin Adımları</p>
                
                <div className="max-h-[320px] min-h-[240px] overflow-y-auto pr-1.5 custom-scrollbar mt-4">
                  <div className={`relative pl-6 border-l border-slate-200 dark:border-slate-800 space-y-4 transition-all duration-300 ${flowDetailLoading ? 'opacity-60 pointer-events-none' : ''}`}>
                    {flowDetailLoading ? (
                      <div className="space-y-4 animate-pulse">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="relative pl-6">
                            <span className="absolute -left-[31px] top-0 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-100 dark:border-slate-850 dark:bg-slate-900" />
                            <div className="w-full rounded-xl p-3 border border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40 space-y-2">
                              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : flowDetail?.steps && flowDetail.steps.length > 0 ? (
                      flowDetail.steps.map((step, index) => {
                        const isStepActive = activeStepId === step.stepId;
                        return (
                          <div key={step.stepId} className="relative group">
                            {/* Circle dot node on the timeline line */}
                            <span className={`absolute -left-[31px] top-0 flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold transition-all duration-200 ${
                              isStepActive 
                                ? 'border-blue-500 bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-110' 
                                : 'border-slate-200 bg-white text-slate-550 group-hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:group-hover:border-slate-600'
                            }`}>
                              {index + 1}
                            </span>
                            
                            <button
                              type="button"
                              onClick={() => setActiveStepId(step.stepId)}
                              className={`w-full text-left rounded-xl p-3 border transition duration-150 ${
                                isStepActive 
                                  ? 'border-blue-200 bg-blue-50/30 text-blue-700 dark:border-blue-900/30 dark:bg-blue-955/10 dark:text-blue-400' 
                                  : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-slate-200'
                              }`}
                            >
                              <p className="text-sm font-bold leading-tight">{step.stepName}</p>
                              <div className="mt-1 flex items-center gap-2 text-[10px] opacity-75 font-medium">
                                <span className="flex items-center gap-1"><Layers className="h-3 w-3" /> {step.fields.length} Alan</span>
                                {step.requiredApprovalCount ? (
                                  <>
                                    <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {step.requiredApprovalCount} Onay Gerekli</span>
                                  </>
                                ) : null}
                              </div>
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-400 italic">Bu akışa henüz bir adım eklenmemiş.</p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Actions Card */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <button
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3.5 text-base font-bold text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 active:scale-[0.99] transition disabled:opacity-50 disabled:pointer-events-none group"
                type="button"
                onClick={handleStartFlow}
                disabled={!selectedFlowId || flowStartLoading}
              >
                <Play className={`h-5 w-5 fill-white group-hover:scale-110 transition ${flowStartLoading ? 'animate-pulse' : ''}`} />
                {flowStartLoading ? 'Akış Başlatılıyor...' : 'Süreci Başlat'}
              </button>
              <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                <button 
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" 
                  type="button" 
                  onClick={() => selectedFlowId && navigate(`/preview/${selectedFlowId}`)} 
                  disabled={!selectedFlowId}
                >
                  <FileText className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  PDF Raporları
                </button>
                <button 
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700" 
                  type="button" 
                  onClick={() => selectedFlowId && navigate(`/flow-edit/${selectedFlowId}`)} 
                  disabled={!selectedFlowId}
                >
                  <Share2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  Paylaş / Düzenle
                </button>
              </div>
            </section>
          </div>
        </section>

      </div>
    </div>
  )
}


