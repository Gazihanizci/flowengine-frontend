import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { CreateIssuePayload, IssuePriority } from '../../types/issue'
import { fetchFlows, type FlowListItem } from '../../services/flowApi'
import { fetchUserRoles, type UserRoleItem } from '../../services/userApi'

interface IssueFormProps {
  onSubmit: (payload: CreateIssuePayload) => Promise<void>
  submitting?: boolean
}

const priorities: IssuePriority[] = ['LOW', 'MEDIUM', 'HIGH']

function IssueForm({ onSubmit, submitting = false }: IssueFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<IssuePriority>('MEDIUM')
  const [users, setUsers] = useState<UserRoleItem[]>([])
  const [flows, setFlows] = useState<FlowListItem[]>([])
  const [assignedUserId, setAssignedUserId] = useState<number | ''>('')
  const [akisId, setAkisId] = useState<number | ''>('')
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('')
  const [roleSearch, setRoleSearch] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [optionsError, setOptionsError] = useState('')

  useEffect(() => {
    let isMounted = true

    const loadOptions = async () => {
      setLoadingOptions(true)
      setOptionsError('')
      try {
        const [userData, flowData] = await Promise.all([fetchUserRoles(), fetchFlows()])
        if (!isMounted) return

        const uniqueUsers = Array.isArray(userData)
          ? userData.filter(
              (item, index, array) =>
                array.findIndex((candidate) => candidate.kullaniciId === item.kullaniciId) === index,
            )
          : []
        const flowList = Array.isArray(flowData) ? flowData : []

        setUsers(uniqueUsers)
        setFlows(flowList)
        setAssignedUserId('')
        setSelectedRoleId('')
        setAkisId(flowList[0]?.akisId ?? '')
      } catch (error) {
        if (!isMounted) return
        setOptionsError(error instanceof Error ? error.message : 'Kullanici ve akis listesi yuklenemedi.')
      } finally {
        if (!isMounted) return
        setLoadingOptions(false)
      }
    }

    void loadOptions()
    return () => {
      isMounted = false
    }
  }, [])

  const canSubmit = useMemo(
    () => Boolean(title.trim() && description.trim() && assignedUserId && akisId && !loadingOptions && !submitting),
    [akisId, assignedUserId, description, loadingOptions, submitting, title],
  )

  const normalizedRoleSearch = roleSearch.trim().toLocaleLowerCase('tr-TR')
  const roleOptions = useMemo(() => {
    const roleMap = new Map<number, string>()
    users.forEach((user) => {
      if (!roleMap.has(user.rolId)) {
        roleMap.set(user.rolId, user.rolAdi)
      }
    })
    return Array.from(roleMap.entries())
      .map(([rolId, rolAdi]) => ({ rolId, rolAdi }))
      .filter((role) => {
        if (!normalizedRoleSearch) return true
        const haystack = `${role.rolAdi} ${role.rolId}`.toLocaleLowerCase('tr-TR')
        return haystack.includes(normalizedRoleSearch)
      })
      .sort((a, b) => a.rolAdi.localeCompare(b.rolAdi, 'tr'))
  }, [normalizedRoleSearch, users])

  const normalizedUserSearch = userSearch.trim().toLocaleLowerCase('tr-TR')
  const filteredUsers = useMemo(() => {
    const roleScopedUsers = users.filter((user) =>
      selectedRoleId ? user.rolId === selectedRoleId : false,
    )
    if (!normalizedUserSearch) return roleScopedUsers
    return roleScopedUsers.filter((user) => {
      const haystack = `${user.adSoyad} ${user.email} ${user.rolAdi} ${user.kullaniciId}`.toLocaleLowerCase(
        'tr-TR',
      )
      return haystack.includes(normalizedUserSearch)
    })
  }, [normalizedUserSearch, selectedRoleId, users])

  const selectedUser = useMemo(
    () => users.find((user) => user.kullaniciId === assignedUserId) ?? null,
    [assignedUserId, users],
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!assignedUserId || !akisId) return

    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      assignedUserId,
      akisId,
    })
  }

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <div className="panel-header">
        <h2>Issue Olustur</h2>
      </div>
      <label className="form-label">
        Baslik
        <input
          className="input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          minLength={3}
        />
      </label>
      <label className="form-label">
        Aciklama
        <textarea
          className="input"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          required
          rows={5}
        />
      </label>
      <label className="form-label">
        Oncelik
        <select
          className="input"
          value={priority}
          onChange={(event) => setPriority(event.target.value as IssuePriority)}
        >
          {priorities.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <label className="form-label">
        Rol Secimi
        <div className="issue-user-picker">
          <input
            className="input"
            type="search"
            value={roleSearch}
            onChange={(event) => setRoleSearch(event.target.value)}
            placeholder={loadingOptions ? 'Roller yukleniyor...' : 'Rol adi veya ID ile ara'}
            disabled={loadingOptions || roleOptions.length === 0}
          />
          <div className="issue-user-results">
            {!loadingOptions && roleOptions.length === 0 ? <p className="hint">Rol bulunamadi.</p> : null}
            {roleOptions.map((role) => (
              <button
                key={role.rolId}
                type="button"
                className={`issue-user-row ${selectedRoleId === role.rolId ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedRoleId(role.rolId)
                  setAssignedUserId('')
                  setUserSearch('')
                }}
              >
                <strong>{role.rolAdi}</strong>
                <span>Rol ID: {role.rolId}</span>
              </button>
            ))}
          </div>
        </div>
      </label>

      <label className="form-label">
        Atanan Kullanici
        <div className="issue-user-picker">
          <input
            className="input"
            type="search"
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            placeholder={
              loadingOptions
                ? 'Kullanicilar yukleniyor...'
                : selectedRoleId
                  ? 'Ad, e-posta veya ID ile ara'
                  : 'Once rol seciniz'
            }
            disabled={loadingOptions || !selectedRoleId}
          />
          {selectedUser ? (
            <div className="selected-item">
              <span>
                Secilen: {selectedUser.adSoyad} ({selectedUser.email})
              </span>
              <button
                type="button"
                className="icon-button"
                onClick={() => setAssignedUserId('')}
              >
                Kaldir
              </button>
            </div>
          ) : null}
          <div className="issue-user-results">
            {!selectedRoleId ? (
              <p className="hint">Kullanici listesi icin once rol secin.</p>
            ) : null}
            {!loadingOptions && selectedRoleId && filteredUsers.length === 0 ? (
              <p className="hint">Bu role ait aramaya uygun kullanici bulunamadi.</p>
            ) : null}
            {filteredUsers.slice(0, 12).map((user) => (
              <button
                key={`${user.kullaniciId}-${user.email}`}
                type="button"
                className={`issue-user-row ${assignedUserId === user.kullaniciId ? 'selected' : ''}`}
                onClick={() => setAssignedUserId(user.kullaniciId)}
              >
                <strong>{user.adSoyad}</strong>
                <span>
                  {user.email} | {user.rolAdi} | ID: {user.kullaniciId}
                </span>
              </button>
            ))}
          </div>
        </div>
      </label>
      <label className="form-label">
        Akis
        <select
          className="input"
          value={akisId}
          onChange={(event) => setAkisId(event.target.value ? Number(event.target.value) : '')}
          disabled={loadingOptions || flows.length === 0}
        >
          <option value="">{loadingOptions ? 'Akislar yukleniyor...' : 'Akis seciniz'}</option>
          {flows.map((flow) => (
            <option key={flow.akisId} value={flow.akisId}>
              {flow.akisAdi} (ID: {flow.akisId})
            </option>
          ))}
        </select>
      </label>
      {optionsError ? <p className="error-text">{optionsError}</p> : null}
      <button className="button" type="submit" disabled={!canSubmit}>
        {submitting ? 'Olusturuluyor...' : 'Issue Olustur'}
      </button>
      {!canSubmit ? <p className="hint">Baslik, aciklama, kullanici ve akis secimi zorunludur.</p> : null}
    </form>
  )
}

export default IssueForm
