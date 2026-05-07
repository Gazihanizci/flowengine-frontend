import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  approveFlowRequest,
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationAsRead,
  rejectFlowRequest,
  type NotificationItem,
} from '../services/notificationApi'

type RequestActionState = 'idle' | 'approving' | 'rejecting' | 'approved' | 'rejected'

type TimelineType = 'approved' | 'rejected' | 'pending' | 'info'

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
  if (Number.isNaN(date.getTime())) return 'az once'
  const diffMs = Date.now() - date.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (diffMs < hour) return `${Math.max(1, Math.floor(diffMs / minute))} dk once`
  if (diffMs < day) return `${Math.floor(diffMs / hour)} sa once`
  return `${Math.floor(diffMs / day)} gun once`
}

function getTimelineType(item: NotificationItem, state: RequestActionState): TimelineType {
  if (state === 'approved') return 'approved'
  if (state === 'rejected') return 'rejected'
  if (item.tip === 'FLOW_REQUEST' || item.tip === 'SUBFLOW_REQUEST') return 'pending'
  return 'info'
}

function timelineBadge(type: TimelineType) {
  switch (type) {
    case 'approved':
      return { label: 'Onaylandi', cls: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200' }
    case 'rejected':
      return { label: 'Reddedildi', cls: 'bg-rose-100 text-rose-700 ring-1 ring-rose-200' }
    case 'pending':
      return { label: 'Onay Bekliyor', cls: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200' }
    default:
      return { label: 'Bilgi', cls: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200' }
  }
}

export default function NotificationPanel() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [readingIds, setReadingIds] = useState<number[]>([])
  const [actionStateByNotificationId, setActionStateByNotificationId] = useState<Record<number, RequestActionState>>({})

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
        setError(status ? `Bildirimler yuklenemedi. (HTTP ${status})` : 'Bildirimler yuklenemedi.')
      } else {
        setError('Bildirimler yuklenemedi.')
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
      setError('Bildirim okundu olarak isaretlenemedi.')
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
      setError('Tum bildirimler okundu olarak isaretlenemedi.')
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

      await markAsReadAndSync(notification)
    } catch {
      setActionStateByNotificationId((prev) => ({
        ...prev,
        [notification.bildirimId]: 'idle',
      }))
      setError(action === 'approve' ? 'Onay islemi basarisiz.' : 'Reddetme islemi basarisiz.')
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-4xl font-semibold text-slate-900">Bildirimler</h2>
        <p className="mt-2 max-w-3xl text-lg text-slate-600">
          Onay sureclerinizi, sistem uyari ve aksiyonlarinizi tek panelde yonetin. Oncelikli talepleri soldan,
          tum akisi sag panelden takip edebilirsiniz.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold tracking-wide text-slate-500">TOPLAM BILDIRIM</p>
          <p className="mt-2 text-4xl font-bold text-slate-900">{notifications.length}</p>
        </article>
        <article className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 shadow-sm">
          <p className="text-sm font-semibold tracking-wide text-blue-700">OKUNMAYAN</p>
          <p className="mt-2 text-4xl font-bold text-blue-700">{unreadCount}</p>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm">
          <p className="text-sm font-semibold tracking-wide text-amber-700">BEKLEYEN ONAY</p>
          <p className="mt-2 text-4xl font-bold text-amber-700">{approvalPendingCount}</p>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
          <p className="text-sm font-semibold tracking-wide text-emerald-700">SON ISLEMLER</p>
          <p className="mt-2 text-4xl font-bold text-emerald-700">{processedCount}</p>
        </article>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-semibold text-slate-900">Okunmayan Bildirimler</h3>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">{unreadCount} Yeni</span>
              <button
                type="button"
                onClick={handleMarkAllUnreadAsRead}
                disabled={unreadNotifications.length === 0 || readingIds.length > 0}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Hepsini Okundu Isaretle
              </button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">Yukleniyor...</div>
          ) : null}

          {!loading && unreadNotifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              Okunmayan bildirim bulunmuyor.
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
                  <article key={notification.bildirimId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-2xl font-semibold text-slate-900">{notification.baslik}</h4>
                        <p className="mt-1 text-slate-700">{notification.mesaj}</p>
                      </div>
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {fromNow(notification.olusturmaTarihi)}
                      </span>
                    </div>

                    <p className="mt-3 text-xs text-slate-500">{formatDate(notification.olusturmaTarihi)}</p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                            className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {requestActionState === 'approving'
                              ? 'Onaylaniyor...'
                              : requestActionState === 'approved'
                                ? 'Onaylandi'
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
                            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
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
                          className="rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isReading ? 'Isleniyor...' : 'Okundu Isaretle'}
                        </button>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-xl font-semibold text-slate-900">Bildirim Paneli</h3>
            <button
              type="button"
              onClick={loadNotifications}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Yenile
            </button>
          </div>

          <div className="max-h-[840px] space-y-2 overflow-y-auto pr-1">
            {recentNotifications.map((notification) => {
              const actionState = actionStateByNotificationId[notification.bildirimId] ?? 'idle'
              const badge = timelineBadge(getTimelineType(notification, actionState))
              return (
                <article
                  key={notification.bildirimId}
                  className="rounded-xl border border-slate-200 p-3 transition hover:border-slate-300"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>{badge.label}</span>
                    <span className="text-xs font-semibold text-slate-500">{formatDate(notification.olusturmaTarihi)}</span>
                  </div>
                  <p className="mt-2 text-base font-semibold text-slate-900">{notification.baslik}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{notification.mesaj}</p>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </section>
  )
}
