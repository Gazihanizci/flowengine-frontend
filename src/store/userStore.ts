import { create } from 'zustand'
import type { MeResponseItem } from '../services/userApi'

interface UserStore {
  user: MeResponseItem | null
  isLoaded: boolean
  setUser: (user: MeResponseItem | null) => void
  setLoaded: (value: boolean) => void
  clearUser: () => void
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  isLoaded: false,
  setUser: (user) => set({ user, isLoaded: true }),
  setLoaded: (value) => set({ isLoaded: value }),
  clearUser: () => set({ user: null, isLoaded: false }),
}))
