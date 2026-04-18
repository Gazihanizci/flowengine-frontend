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

interface NotificationPanelProps {
  title?: string
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('tr-TR')
}

export default function NotificationPanel({
  title = 'Bildirimler',
}: NotificationPanelProps) {
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
    () => notifications.slice().sort((a, b) => new Date(b.olusturmaTarihi).getTime() - new Date(a.olusturmaTarihi).getTime()).slice(0, 20),
    [notifications],
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
      // keep UI optimistic even if unread count refresh fails
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

  const renderNotificationCard = (notification: NotificationItem) => {
    const isReading = readingIds.includes(notification.bildirimId)
    const requestActionState = actionStateByNotificationId[notification.bildirimId] ?? 'idle'
    const requestActionDone = requestActionState === 'approved' || requestActionState === 'rejected'
    const isPassive = notification.okundu || requestActionDone

    return (
      <article
        key={notification.bildirimId}
        className={`rounded-xl border p-3 transition ${
          notification.okundu ? 'border-slate-200 bg-slate-50' : 'border-cyan-200 bg-cyan-50/60'
        } ${isPassive ? 'opacity-60' : ''}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              {!notification.okundu ? (
                <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-cyan-600" />
              ) : null}
              <h4 className={`text-sm ${notification.okundu ? 'font-medium text-slate-800' : 'font-bold text-slate-900'}`}>
                {notification.baslik}
              </h4>
            </div>
            <p className="mt-1 text-sm text-slate-700">{notification.mesaj}</p>
          </div>
          <div className="flex items-center gap-2">
            <time className="shrink-0 text-xs text-slate-500">{formatDate(notification.olusturmaTarihi)}</time>
            {!notification.okundu ? (
              <button
                type="button"
                onClick={() => handleMarkAsRead(notification)}
                disabled={isReading}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isReading ? 'Isleniyor...' : 'Okundu'}
              </button>
            ) : null}
          </div>
        </div>

        {notification.tip === 'FLOW_REQUEST' || notification.tip === 'SUBFLOW_REQUEST' ? (
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                handleRequestAction(notification, 'approve')
              }}
              disabled={
                isPassive ||
                !notification.referansIstekId ||
                requestActionState === 'approving' ||
                requestActionState === 'rejecting' ||
                requestActionDone
              }
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {requestActionState === 'approving' ? 'Onaylaniyor...' : requestActionState === 'approved' ? 'Onaylandi' : 'Onayla'}
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                handleRequestAction(notification, 'reject')
              }}
              disabled={
                isPassive ||
                !notification.referansIstekId ||
                requestActionState === 'approving' ||
                requestActionState === 'rejecting' ||
                requestActionDone
              }
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {requestActionState === 'rejecting' ? 'Reddediliyor...' : requestActionState === 'rejected' ? 'Reddedildi' : 'Reddet'}
            </button>
            {isReading ? <span className="text-xs text-slate-500">Okundu isaretleniyor...</span> : null}
          </div>
        ) : isReading ? (
          <p className="mt-2 text-xs text-slate-500">Okundu isaretleniyor...</p>
        ) : null}
      </article>
    )
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
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">
            Toplam: {notifications.length} | Okunmamis: {unreadCount}
          </p>
        </div>
        <button
          type="button"
          onClick={loadNotifications}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Yenile
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
          Yukleniyor...
        </div>
      ) : null}

      {!loading && error ? <p className="mb-3 text-sm font-medium text-red-600">{error}</p> : null}

      {!loading && notifications.length === 0 ? (
        <p className="py-6 text-sm text-slate-500">No notifications</p>
      ) : null}

      {!loading && notifications.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
            <h4 className="mb-2 text-sm font-semibold text-slate-900">Okunmayan Bildirimler</h4>
            {unreadNotifications.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                Okunmayan bildirim yok.
              </p>
            ) : (
              <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
                {unreadNotifications.map((notification) => renderNotificationCard(notification))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <h4 className="mb-2 text-sm font-semibold text-slate-900">Son Bildirimler</h4>
            <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
                {recentNotifications.map((notification) => renderNotificationCard(notification))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
