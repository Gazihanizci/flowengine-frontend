import axios from 'axios'

export interface MeResponseItem {
  rolAdi: string
  adSoyad: string
  rolId: number
}

const userApi = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function fetchMe(token: string) {
  const { data } = await userApi.get<MeResponseItem[]>('/api/kullanicilar/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return data
}
