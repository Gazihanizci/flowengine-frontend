import axios from 'axios'

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  adSoyad: string
  email: string
  password: string
}

export interface LoginResponse {
  message: string
  success: boolean
  token: string
}

const authApi = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function login(payload: LoginPayload) {
  const { data } = await authApi.post<LoginResponse>('/api/auth/login', payload)
  return data
}

export async function register(payload: RegisterPayload) {
  const { data } = await authApi.post<LoginResponse>('/api/auth/register', payload)
  return data
}
