import axios from 'axios'

export type NotificationTip = 'FLOW_TASK' | 'FLOW_REQUEST' | 'SUBFLOW_REQUEST'

export interface NotificationItem {
  bildirimId: number
  kullaniciId: number
  baslik: string
  mesaj: string
  tip: NotificationTip
  okundu: boolean
  olusturmaTarihi: string
  referansSurecId: number | null
  referansAdimId: number | null
  referansIstekId: number | null
}

const notificationApi = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
})

function buildAuthHeaders() {
  const token = localStorage.getItem('auth_token')
  if (!token) return undefined

  return {
    Authorization: `Bearer ${token}`,
  }
}

export async function fetchNotifications() {
  const { data } = await notificationApi.get<NotificationItem[]>('/api/bildirimler/me', {
    headers: buildAuthHeaders(),
  })
  return data
}

export async function fetchUnreadNotificationCount() {
  const { data } = await notificationApi.get<number | { count?: number; okunmamisSayi?: number }>(
    '/api/bildirimler/me/okunmamis-sayi',
    {
      headers: buildAuthHeaders(),
    },
  )

  if (typeof data === 'number') return data
  if (typeof data?.okunmamisSayi === 'number') return data.okunmamisSayi
  if (typeof data?.count === 'number') return data.count
  return 0
}

export async function markNotificationAsRead(bildirimId: number) {
  await notificationApi.put(
    `/api/bildirim-islemleri/${bildirimId}/okundu`,
    undefined,
    { headers: buildAuthHeaders() },
  )
}

export async function approveFlowRequest(requestId: number) {
  await notificationApi.post(
    `/api/flow/requests/${requestId}/approve`,
    undefined,
    { headers: buildAuthHeaders() },
  )
}

export async function rejectFlowRequest(requestId: number) {
  await notificationApi.post(
    `/api/flow/requests/${requestId}/reject`,
    undefined,
    { headers: buildAuthHeaders() },
  )
}
