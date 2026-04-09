export interface RoleOption {
  id: number
  name: string
}

export interface AssignedRole {
  rolId: number
  rolAdi: string
}

export interface UserRoleSummary {
  kullaniciId: number
  adSoyad: string
  roller: AssignedRole[]
}

export interface UserRoleMappingResponseItem {
  kullaniciId: number
  adSoyad?: string
  rolId: number
  rolAdi?: string
}

export interface UserRolesByIdResponseItem {
  rolId?: number
  id?: number
  rolAdi?: string
  name?: string
}
