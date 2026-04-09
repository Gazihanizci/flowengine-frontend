import axios from 'axios'
import type {
  AssignedRole,
  RoleOption,
  UserRoleMappingResponseItem,
  UserRoleSummary,
  UserRolesByIdResponseItem,
} from '../types/roleManagement'
import { fetchUserRoles } from './userApi'

const FALLBACK_ROLE_OPTIONS: RoleOption[] = []

const roleApi = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
})

roleApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function resolveRoleName(roleId: number, roleName?: string) {
  if (roleName && roleName.trim().length > 0) {
    return roleName
  }

  return FALLBACK_ROLE_OPTIONS.find((role) => role.id === roleId)?.name ?? `Rol_${roleId}`
}

function normalizeRolesByUserResponse(data: unknown): AssignedRole[] {
  if (!Array.isArray(data)) {
    return []
  }

  return data
    .map((item) => item as UserRolesByIdResponseItem)
    .map((item) => {
      const roleId = item.rolId ?? item.id
      if (typeof roleId !== 'number') {
        return null
      }

      return {
        rolId: roleId,
        rolAdi: resolveRoleName(roleId, item.rolAdi ?? item.name),
      }
    })
    .filter((item): item is AssignedRole => item !== null)
}

function normalizeUserRoleMappings(items: UserRoleMappingResponseItem[]): UserRoleSummary[] {
  const map = new Map<number, UserRoleSummary>()

  items.forEach((item) => {
    if (typeof item.kullaniciId !== 'number') {
      return
    }

    const existing = map.get(item.kullaniciId)
    const roleId = item.rolId

    if (!existing) {
      map.set(item.kullaniciId, {
        kullaniciId: item.kullaniciId,
        adSoyad: item.adSoyad?.trim() || `Kullanici #${item.kullaniciId}`,
        roller:
          typeof roleId === 'number'
            ? [{ rolId: roleId, rolAdi: resolveRoleName(roleId, item.rolAdi) }]
            : [],
      })
      return
    }

    if (typeof roleId !== 'number') {
      return
    }

    const alreadyExists = existing.roller.some((role) => role.rolId === roleId)
    if (!alreadyExists) {
      existing.roller.push({
        rolId: roleId,
        rolAdi: resolveRoleName(roleId, item.rolAdi),
      })
    }
  })

  return Array.from(map.values()).sort((a, b) => a.kullaniciId - b.kullaniciId)
}

export async function fetchAllUserRoleMappings() {
  const { data } = await roleApi.get<UserRoleMappingResponseItem[]>('/api/kullanici-rolleri')
  return normalizeUserRoleMappings(Array.isArray(data) ? data : [])
}

export async function fetchRoleOptions() {
  const data = await fetchUserRoles()
  const map = new Map<number, string>()

  data.forEach((item) => {
    if (!map.has(item.rolId)) {
      map.set(item.rolId, item.rolAdi)
    }
  })

  return Array.from(map.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function fetchRolesByUserId(kullaniciId: number) {
  const { data } = await roleApi.get<unknown>(`/api/rol-atama/${kullaniciId}`)
  return normalizeRolesByUserResponse(data)
}

export async function assignRoleToUser(kullaniciId: number, rolId: number) {
  const { data } = await roleApi.post('/api/rol-atama/assign', null, {
    params: { kullaniciId, rolId },
  })
  return data
}

export async function removeRoleFromUser(kullaniciId: number, rolId: number) {
  const { data } = await roleApi.delete('/api/rol-atama/remove', {
    params: { kullaniciId, rolId },
  })
  return data
}

export async function updateUserRole(kullaniciId: number, eskiRolId: number, yeniRolId: number) {
  const { data } = await roleApi.put('/api/rol-atama/update', null, {
    params: { kullaniciId, eskiRolId, yeniRolId },
  })
  return data
}
