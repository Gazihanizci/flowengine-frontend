import axios from 'axios'

export interface HistoryItem {
  surecId: number
  akisAdi: string
  adimAdi: string
  aksiyon: string
  formIcerik: string
  tarih: string
}

const historyApi = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

historyApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function fetchMyHistory() {
  const { data } = await historyApi.get<HistoryItem[]>('/history/my')
  return data
}
