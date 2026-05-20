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
  Activity, 
  Sparkles, 
  Filter, 
  CheckSquare, 
  Bell, 
  Share2, 
  FileText, 
  Compass, 
  AlertTriangle, 
  Info,
  Clock
} from 'lucide-react'

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return fallback
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
  const [activeStepId, setActiveStepId] = useState<number | null>(null)
  const [flowStartLoading, setFlowStartLoading] = useState(false)
  const [flowStartError, setFlowStartError] = useState<string | null>(null)
  const [flowStartSuccess, setFlowStartSuccess] = useState<string | null>(null)
  const [flowSearchTerm, setFlowSearchTerm] = useState('')
  const [flowQuickFilter, setFlowQuickFilter] = useState<'ALL' | 'SHORT' | 'LONG'>('ALL')

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
    const loadUserData = async () => {
      try {
        setTasksLoading(true)
        setNotificationsLoading(true)
        const [tasksData, notificationsData] = await Promise.all([
          fetchMyTasks().catch(() => [] as WorkflowTask[]),
          fetchNotifications().catch(() => [] as NotificationItem[])
        ])
        if (mounted) {
          setTasks(Array.isArray(tasksData) ? tasksData : [])
          setNotifications(Array.isArray(notificationsData) ? notificationsData : [])
        }
      } catch {
        // fail silently
      } finally {
        if (mounted) {
          setTasksLoading(false)
          setNotificationsLoading(false)
        }
      }
    }

    loadUserData()

    return () => {
      mounted = false
    }
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin || selectedFlowId === null) return

    const loadDetail = async () => {
      setFlowDetail(null)
      try {
        const data = await fetchFlowDetail(selectedFlowId)
        setFlowDetail(data)
        setActiveStepId(data.steps[0]?.stepId ?? null)
      } catch {
        // keep layout visible even if detail fetch fails
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
    return flows.filter((flow) => {
      const baseMatch =
        !normalizedSearch ||
        flow.akisAdi.toLocaleLowerCase('tr-TR').includes(normalizedSearch) ||
        String(flow.akisId).includes(normalizedSearch) ||
        (flow.aciklama ?? '').toLocaleLowerCase('tr-TR').includes(normalizedSearch)

      if (!baseMatch) return false
      if (flowQuickFilter === 'SHORT') return flow.akisAdi.trim().length <= 12
      if (flowQuickFilter === 'LONG') return flow.akisAdi.trim().length > 12
      return true
    })
  }, [flows, flowQuickFilter, flowSearchTerm])

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
          <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Tasks Card */}
            <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-200 dark:border-slate-800 dark:bg-slate-900">
              <div className="absolute top-0 right-0 h-24 w-24 bg-blue-500/5 rounded-bl-full group-hover:scale-110 transition-transform duration-200" />
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
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
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
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

            {/* Quick Flow Start Panel */}
            <article className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-b from-blue-50/50 to-white p-6 shadow-sm dark:border-blue-900/30 dark:from-blue-950/10 dark:to-slate-900 lg:col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                <Play className="h-3.5 w-3.5 fill-blue-600 dark:fill-blue-400" />
                <span>Hızlı Başlat</span>
              </div>
              <h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">Akış Başlat</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Yetkiniz dahilindeki iş süreçlerini listeden seçerek anında başlatabilirsiniz.
              </p>

              <div className="mt-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase" htmlFor="flow-select-user">
                    İş Akışı Seçin
                  </label>
                  <select
                    id="flow-select-user"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 transition dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                    value={selectedFlowId ?? ''}
                    onChange={(event) => setSelectedFlowId(Number(event.target.value))}
                    disabled={loading || flows.length === 0}
                  >
                    {flows.length === 0 ? <option value="">Akış bulunamadı</option> : null}
                    {flows.map((flow) => (
                      <option key={flow.akisId} value={flow.akisId}>
                        #{flow.akisId} - {flow.akisAdi}
                      </option>
                    ))}
                  </select>
                </div>

                {error ? <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p> : null}
                {flowStartError ? <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{flowStartError}</p> : null}
                {flowStartSuccess ? <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{flowStartSuccess}</p> : null}

                <button
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/10 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] transition disabled:opacity-50"
                  type="button"
                  onClick={handleStartFlow}
                  disabled={!selectedFlowId || flowStartLoading || loading}
                >
                  {flowStartLoading ? 'Süreç Başlatılıyor...' : 'Süreci Başlat'}
                </button>
              </div>
            </article>
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Filtrele:</span>
              <div className="flex gap-1.5 ml-2">
                {(['ALL', 'SHORT', 'LONG'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFlowQuickFilter(key)}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                      flowQuickFilter === key 
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/10' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {key === 'ALL' ? 'Tümü' : key === 'SHORT' ? 'Kısa Ad' : 'Uzun Ad'}
                  </button>
                ))}
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
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Akış Listesi</h2>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {filteredFlows.length} Aktif Kayıt
              </span>
            </div>
            
            <div className="max-h-[580px] space-y-2.5 overflow-y-auto p-4">
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
              {!loading && !error && filteredFlows.map((flow) => (
                <button
                  key={flow.akisId}
                  type="button"
                  onClick={() => setSelectedFlowId(flow.akisId)}
                  className={`w-full rounded-xl border p-4 text-left transition duration-200 flex items-center justify-between gap-4 group ${
                    selectedFlowId === flow.akisId 
                      ? 'border-blue-500 bg-blue-50/40 shadow-sm dark:border-blue-500 dark:bg-blue-950/20' 
                      : 'border-slate-100 bg-white hover:border-slate-350 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <p className="truncate text-base font-bold text-slate-800 group-hover:text-blue-600 dark:text-slate-200 dark:group-hover:text-blue-400 transition">{flow.akisAdi}</p>
                      <span className="shrink-0 text-[10px] font-bold text-slate-400">#{flow.akisId}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{flow.aciklama || 'Açıklama bulunmuyor.'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                      flow.akisAdi.length > 12 
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' 
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                    }`}>
                      {flow.akisAdi.length > 12 ? 'Taslak' : 'Aktif'}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                  </div>
                </button>
              ))}
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
              <h3 className="mt-3 text-2xl font-extrabold text-slate-800 dark:text-white leading-tight">{selectedFlow?.akisAdi ?? 'Akış seçiniz'}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{selectedFlow?.aciklama || 'Seçilen akışın açıklaması burada görünür.'}</p>
              
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 text-center dark:border-slate-800 dark:bg-slate-800/40">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">Adım Sayısı</p>
                  <p className="mt-1 text-2xl font-black text-blue-600 dark:text-blue-400">{flowDetail?.steps.length ?? 0}</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 text-center dark:border-slate-800 dark:bg-slate-800/40">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-slate-500">Toplam Alan</p>
                  <p className="mt-1 text-2xl font-black text-blue-600 dark:text-blue-400">{totalFieldCount}</p>
                </div>
              </div>

              {/* Interactive Steps Timeline */}
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-450 border-b border-slate-100 pb-2 dark:border-slate-800">Sürecin Adımları</p>
                
                <div className="mt-4 relative pl-6 border-l border-slate-200 dark:border-slate-800 space-y-4">
                  {flowDetail?.steps && flowDetail.steps.length > 0 ? (
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
                                ? 'border-blue-200 bg-blue-50/30 text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/10 dark:text-blue-400' 
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


