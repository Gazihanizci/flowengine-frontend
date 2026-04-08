import axios from 'axios'

export interface MeResponseItem {
  kullaniciId?: number
  rolAdi: string
  adSoyad: string
  rolId: number
}

export interface UserRoleItem {
  kullaniciId: number
  adSoyad: string
  email: string
  rolId: number
  rolAdi: string
}

export interface RoleItem {
  id: number
  rolAdi: string
}

export interface UserItem {
  id: number
  adSoyad: string
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

export async function fetchUserRoles() {
  const { data } = await userApi.get<UserRoleItem[]>('/api/kullanici-rolleri')
  return data
}

export async function fetchRoles() {
  const { data } = await userApi.get<RoleItem[]>('/api/roles')
  return data
}

export async function fetchUsers() {
  const { data } = await userApi.get<UserItem[]>('/api/users')
  return data
}
