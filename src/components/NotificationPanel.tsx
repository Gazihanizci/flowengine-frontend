import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  Bell,
  BellRing,
  Check,
  X,
  Clock,
  Calendar,
  CheckCheck,
  AlertCircle,
  RefreshCw,
  Info
} from 'lucide-react'
import {
  approveFlowRequest,
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationAsRead,
  rejectFlowRequest,
  type NotificationItem,
} from '../services/notificationApi'

type RequestActionState = 'idle' | 'approving' | 'rejecting' | 'approved' | 'rejected'

type TimelineType = 'approved' | 'rejected' | 'pending' | 'processed' | 'info'

const REQUEST_ACTION_STORAGE_KEY = 'notification_request_actions_v1'

type StoredRequestAction = 'approved' | 'rejected'
type StoredRequestActionMap = Record<string, StoredRequestAction>

function loadStoredRequestActions(): StoredRequestActionMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(REQUEST_ACTION_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    const entries = Object.entries(parsed as Record<string, unknown>)
      .filter(([, value]) => value === 'approved' || value === 'rejected')
      .map(([key, value]) => [key, value as StoredRequestAction])
    return Object.fromEntries(entries)
  } catch {
    return {}
  }
}

function saveStoredRequestActions(map: StoredRequestActionMap) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(REQUEST_ACTION_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // ignore storage errors
  }
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fromNow(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'az önce'
  const diffMs = Date.now() - date.getTime()
  const minute = 60 * 1000
  const hour = 65 * minute
  const day = 24 * hour
  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))} dk önce`
  if (diffMs < day) return `${Math.floor(diffMs / hour)} sa önce`
  return `${Math.floor(diffMs / day)} gün önce`
}

function getTimelineType(item: NotificationItem, state: RequestActionState): TimelineType {
  if (state === 'approved') return 'approved'
  if (state === 'rejected') return 'rejected'
  if (item.tip === 'FLOW_REQUEST' || item.tip === 'SUBFLOW_REQUEST') {
    return item.okundu ? 'processed' : 'pending'
  }
  return 'info'
}

function timelineBadge(type: TimelineType) {
  switch (type) {
    case 'approved':
      return { label: 'Onaylandı', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-250 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50' }
    case 'rejected':
      return { label: 'Reddedildi', cls: 'bg-rose-50 text-rose-700 border border-rose-250 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50' }
    case 'pending':
      return { label: 'Bekliyor', cls: 'bg-amber-50 text-amber-700 border border-amber-250 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50' }
    case 'processed':
      return { label: 'İşlendi', cls: 'bg-sky-50 text-sky-700 border border-sky-250 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900/50' }
    default:
      return { label: 'Bilgi', cls: 'bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-900 dark:text-slate-450 dark:border-slate-800' }
  }
}

export default function NotificationPanel() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [readingIds, setReadingIds] = useState<number[]>([])
  const [actionStateByNotificationId, setActionStateByNotificationId] = useState<Record<number, RequestActionState>>({})
  const [storedRequestActionByRequestId, setStoredRequestActionByRequestId] = useState<StoredRequestActionMap>(() => loadStoredRequestActions())

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.okundu),
    [notifications],
  )

  const recentNotifications = useMemo(
    () => notifications
      .slice()
      .sort((a, b) => new Date(b.olusturmaTarihi).getTime() - new Date(a.olusturmaTarihi).getTime())
      .slice(0, 14),
    [notifications],
  )

  const approvalPendingCount = useMemo(
    () => unreadNotifications.filter((n) => n.tip === 'FLOW_REQUEST' || n.tip === 'SUBFLOW_REQUEST').length,
    [unreadNotifications],
  )

  const processedCount = useMemo(
    () => Object.values(actionStateByNotificationId).filter((state) => state === 'approved' || state === 'rejected').length,
    [actionStateByNotificationId],
  )

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [data, unread] = await Promise.all([
        fetchNotifications(),
        fetchUnreadNotificationCount(),
      ])
      setNotifications(Array.isArray(data) ? data : [])
      setUnreadCount(Math.max(0, Number(unread) || 0))
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        setError(status ? `Bildirimler yüklenemedi. (HTTP ${status})` : 'Bildirimler yüklenemedi.')
      } else {
        setError('Bildirimler yüklenemedi.')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const markAsReadAndSync = useCallback(async (notification: NotificationItem) => {
    if (notification.okundu) return

    await markNotificationAsRead(notification.bildirimId)
    setNotifications((prev) =>
      prev.map((item) =>
        item.bildirimId === notification.bildirimId
          ? { ...item, okundu: true }
          : item,
      ),
    )
    try {
      const unread = await fetchUnreadNotificationCount()
      setUnreadCount(Math.max(0, Number(unread) || 0))
    } catch {
      // optimistic UI
    }
  }, [])

  const handleMarkAsRead = async (notification: NotificationItem) => {
    const requestActionState = actionStateByNotificationId[notification.bildirimId] ?? 'idle'
    const requestActionDone = requestActionState === 'approved' || requestActionState === 'rejected'
    if (notification.okundu || requestActionDone || readingIds.includes(notification.bildirimId)) return

    setReadingIds((prev) => [...prev, notification.bildirimId])
    try {
      await markAsReadAndSync(notification)
    } catch {
      setError('Bildirim okundu olarak işaretlenemedi.')
    } finally {
      setReadingIds((prev) => prev.filter((id) => id !== notification.bildirimId))
    }
  }

  const handleMarkAllUnreadAsRead = async () => {
    if (unreadNotifications.length === 0) return

    try {
      setError(null)
      const unreadCopy = [...unreadNotifications]
      setReadingIds((prev) => [...prev, ...unreadCopy.map((item) => item.bildirimId)])
      await Promise.all(unreadCopy.map((item) => markNotificationAsRead(item.bildirimId)))
      setNotifications((prev) => prev.map((item) => (item.okundu ? item : { ...item, okundu: true })))
      setUnreadCount(0)
    } catch {
      setError('Tüm bildirimler okundu olarak işaretlenemedi.')
    } finally {
      setReadingIds([])
    }
  }

  const handleRequestAction = async (notification: NotificationItem, action: 'approve' | 'reject') => {
    const requestId = notification.referansIstekId
    const requestActionState = actionStateByNotificationId[notification.bildirimId] ?? 'idle'
    const requestActionDone = requestActionState === 'approved' || requestActionState === 'rejected'
    if (!requestId || notification.okundu || requestActionDone) return

    setActionStateByNotificationId((prev) => ({
      ...prev,
      [notification.bildirimId]: action === 'approve' ? 'approving' : 'rejecting',
    }))

    try {
      if (action === 'approve') {
        await approveFlowRequest(requestId)
      } else {
        await rejectFlowRequest(requestId)
      }

      setActionStateByNotificationId((prev) => ({
        ...prev,
        [notification.bildirimId]: action === 'approve' ? 'approved' : 'rejected',
      }))

      if (requestId) {
        const key = String(requestId)
        setStoredRequestActionByRequestId((prev) => {
          const next: StoredRequestActionMap = {
            ...prev,
            [key]: action === 'approve' ? 'approved' : 'rejected',
          }
          saveStoredRequestActions(next)
          return next
        })
      }

      await markAsReadAndSync(notification)
    } catch {
      setActionStateByNotificationId((prev) => ({
        ...prev,
        [notification.bildirimId]: 'idle',
      }))
      setError(action === 'approve' ? 'Onay işlemi başarısız.' : 'Reddetme işlemi başarısız.')
    }
  }

  return (
    <section className="space-y-6">
      {/* Hero Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-500/5 blur-3xl"></div>
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-indigo-500/5 blur-3xl"></div>
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <BellRing className="h-5 w-5 animate-pulse" />
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Bildirim Merkezi</h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              Onay süreçlerinizi, sistem uyarı ve aksiyonlarınızı tek panelde yönetin. Öncelikli talepleri soldan,
              tüm akışı sağ panelden takip edebilirsiniz.
            </p>
          </div>
          <button
            type="button"
            onClick={loadNotifications}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-60 shrink-0 self-start md:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Toplam Bildirim</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <Bell className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900 dark:text-white">{notifications.length}</p>
        </article>

        <article className="group relative overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/50 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-blue-900/20 dark:bg-blue-950/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Okunmayan</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
              <AlertCircle className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-blue-700 dark:text-blue-400">{unreadCount}</p>
        </article>

        <article className="group relative overflow-hidden rounded-2xl border border-amber-100 bg-amber-50/50 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-amber-900/20 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-650 dark:text-amber-400">Bekleyen Onay</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-450">
              <Clock className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-amber-700 dark:text-amber-400">{approvalPendingCount}</p>
        </article>

        <article className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md dark:border-emerald-900/20 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-650 dark:text-emerald-400">Son İşlemler</p>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
              <CheckCheck className="h-4.5 w-4.5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-extrabold text-emerald-700 dark:text-emerald-400">{processedCount}</p>
        </article>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-450">{error}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Okunmayan Bildirimler</h3>
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white shadow-sm shadow-blue-500/20">{unreadCount} Yeni</span>
            </div>
            <button
              type="button"
              onClick={handleMarkAllUnreadAsRead}
              disabled={unreadNotifications.length === 0 || readingIds.length > 0}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-350 dark:hover:bg-slate-800 shrink-0"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Hepsini Okundu İşaretle
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mr-2"></div>
              Yükleniyor...
            </div>
          ) : null}

          {!loading && unreadNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-250 bg-slate-50/50 p-12 text-center text-slate-400 dark:border-slate-800 dark:bg-slate-950/20">
              <BellRing className="h-9 w-9 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-xs font-semibold">Okunmayan bildirim bulunmuyor.</p>
            </div>
          ) : null}

          {!loading ? (
            <div className="space-y-4">
              {unreadNotifications.map((notification) => {
                const requestActionState = actionStateByNotificationId[notification.bildirimId] ?? 'idle'
                const requestActionDone = requestActionState === 'approved' || requestActionState === 'rejected'
                const isPassive = notification.okundu || requestActionDone
                const isReading = readingIds.includes(notification.bildirimId)
                const isRequest = notification.tip === 'FLOW_REQUEST' || notification.tip === 'SUBFLOW_REQUEST'

                return (
                  <article
                    key={notification.bildirimId}
                    className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-950"
                  >
                    {/* Visual left Indicator Strip */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isRequest ? 'bg-blue-600' : 'bg-slate-400'}`}></div>

                    <div className="pl-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <h4 className="text-[16px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {isRequest ? (
                              <Clock className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                            ) : (
                              <Info className="h-4.5 w-4.5 text-slate-500 shrink-0" />
                            )}
                            {notification.baslik}
                          </h4>
                          <p className="text-sm text-slate-650 dark:text-slate-300 font-medium break-words leading-relaxed">{notification.mesaj}</p>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-55 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-900 dark:text-slate-400 shrink-0">
                          {fromNow(notification.olusturmaTarihi)}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 dark:border-slate-900 pt-3">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(notification.olusturmaTarihi)}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-col sm:flex-row gap-3">
                        {isRequest ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleRequestAction(notification, 'approve')}
                              disabled={
                                isPassive ||
                                !notification.referansIstekId ||
                                requestActionState === 'approving' ||
                                requestActionState === 'rejecting' ||
                                requestActionDone
                              }
                              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Check className="h-4 w-4" />
                              {requestActionState === 'approving'
                                ? 'Onaylanıyor...'
                                : requestActionState === 'approved'
                                  ? 'Onaylandı'
                                  : 'Onayla'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRequestAction(notification, 'reject')}
                              disabled={
                                isPassive ||
                                !notification.referansIstekId ||
                                requestActionState === 'approving' ||
                                requestActionState === 'rejecting' ||
                                requestActionDone
                              }
                              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-250 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              <X className="h-4 w-4 text-rose-500" />
                              {requestActionState === 'rejecting'
                                ? 'Reddediliyor...'
                                : requestActionState === 'rejected'
                                  ? 'Reddedildi'
                                  : 'Reddet'}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleMarkAsRead(notification)}
                            disabled={isPassive || isReading}
                            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <CheckCheck className="h-4 w-4" />
                            {isReading ? 'İşleniyor...' : 'Okundu Olarak İşaretle'}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : null}
        </section>

        {/* Recent timeline on the right side */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-4 flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-900 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="h-4.5 w-4.5 text-slate-500" />
              Bildirim Geçmişi
            </h3>
            <span className="text-xs font-semibold text-slate-400">Son 14 Aktivite</span>
          </div>

          <div className="max-h-[750px] space-y-2.5 overflow-y-auto pr-1">
            {recentNotifications.map((notification) => {
              const localActionState = actionStateByNotificationId[notification.bildirimId] ?? 'idle'
              const storedAction =
                notification.referansIstekId != null
                  ? storedRequestActionByRequestId[String(notification.referansIstekId)]
                  : undefined
              const actionState: RequestActionState =
                localActionState !== 'idle'
                  ? localActionState
                  : storedAction === 'approved'
                    ? 'approved'
                    : storedAction === 'rejected'
                      ? 'rejected'
                      : 'idle'
              const badge = timelineBadge(getTimelineType(notification, actionState))
              return (
                <article
                  key={notification.bildirimId}
                  className="rounded-xl border border-slate-150 p-3.5 transition hover:border-slate-250 dark:border-slate-900 dark:hover:border-slate-800 dark:bg-slate-900/20"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
                    <span className="text-[11px] font-medium text-slate-450 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(notification.olusturmaTarihi)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-800 dark:text-white leading-snug">{notification.baslik}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-450 leading-relaxed">{notification.mesaj}</p>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </section>
  )
}
