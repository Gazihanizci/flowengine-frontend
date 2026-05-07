import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { FlowListItem } from '../../../services/flowApi'
import type { UserRoleItem } from '../../../services/userApi'
import { PRIORITY_OPTIONS } from './constants'

interface CreatePayload {
  title: string
  description: string
  priority: string
  akisId: number
  assignedUserIds: number[]
}

export function IssueCreateDrawer({
  open,
  users,
  workflows,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean
  users: UserRoleItem[]
  workflows: FlowListItem[]
  submitting: boolean
  onClose: () => void
  onSubmit: (payload: CreatePayload) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [flowSearch, setFlowSearch] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [showAllUsersTable, setShowAllUsersTable] = useState(false)
  const [selectedFlow, setSelectedFlow] = useState<number | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<number[]>([])

  const filteredFlows = useMemo(
    () => workflows.filter((flow) => `${flow.akisAdi} ${flow.aciklama}`.toLocaleLowerCase('tr-TR').includes(flowSearch.toLocaleLowerCase('tr-TR'))),
    [flowSearch, workflows],
  )
  const filteredUsers = useMemo(
    () => users.filter((user) => `${user.adSoyad} ${user.email} ${user.rolAdi}`.toLocaleLowerCase('tr-TR').includes(userSearch.toLocaleLowerCase('tr-TR'))),
    [userSearch, users],
  )

  const valid = title.trim().length >= 3 && description.trim().length > 0 && Boolean(selectedFlow) && selectedUsers.length > 0

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  const handleSubmit = () => {
    if (!valid || !selectedFlow) return
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      priority,
      akisId: selectedFlow,
      assignedUserIds: selectedUsers,
    })
  }

  const drawer = (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button className="fixed inset-0 z-40 bg-black/35" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            className="fixed right-0 top-0 z-50 h-screen w-full border-l border-slate-200 bg-slate-50 sm:w-[min(520px,100vw)]"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
          >
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-slate-200 bg-white px-4 py-3.5 sm:px-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      <h3 className="text-xl font-semibold text-slate-900">Yeni Issue Oluştur</h3>
                    </div>
                    <p className="text-xs text-slate-500">Sistem üzerindeki aksaklıkları bildirin.</p>
                  </div>
                  <button className="rounded-lg border border-slate-200 bg-white p-2" onClick={onClose}><X className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-24 pt-4 sm:px-5">
                <div className="space-y-4">
                  <section className="rounded-2xl border border-slate-200 bg-white p-3.5">
                    <div className="space-y-3">
                      <div>
                        <p className="mb-1 text-[11px] font-bold tracking-wide text-slate-500">BASLIK</p>
                        <input className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" placeholder="Kısa ve açıklayıcı bir başlık girin..." value={title} onChange={(e) => setTitle(e.target.value)} />
                      </div>
                      <div>
                        <p className="mb-1 text-[11px] font-bold tracking-wide text-slate-500">ACIKLAMA</p>
                        <textarea className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" placeholder="Issue detaylarını, karşılaşılan hataları ve adımları detaylandırın..." rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <p className="mb-1 text-[11px] font-bold tracking-wide text-slate-500">ONCELIK</p>
                          <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm" value={priority} onChange={(e) => setPriority(e.target.value)}>
                            {PRIORITY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                          </select>
                        </div>
                        <div>
                          <p className="mb-1 text-[11px] font-bold tracking-wide text-slate-500">WORKFLOW SECIMI</p>
                          <div className="relative">
                            <input className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-sm" placeholder="Workflow ara" value={flowSearch} onChange={(e) => setFlowSearch(e.target.value)} />
                            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-3.5">
                    <p className="mb-2 text-sm font-bold tracking-wide text-slate-700">WORKFLOW LISTESI</p>
                    <div className="max-h-40 space-y-2 overflow-auto pr-1">
                      {filteredFlows.map((flow) => (
                        <button key={flow.akisId} className={`w-full rounded-xl border p-2.5 text-left ${selectedFlow === flow.akisId ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white'}`} onClick={() => setSelectedFlow(flow.akisId)}>
                          <p className="text-sm font-medium">{flow.akisAdi}</p>
                          <p className="text-xs text-slate-500">{flow.aciklama || '-'}</p>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-3.5">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-bold tracking-wide text-slate-700">ATAMALAR</p>
                      <button
                        type="button"
                        onClick={() => {
                          setUserSearch('')
                          setShowAllUsersTable((prev) => !prev)
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        {showAllUsersTable ? 'Tabloyu Gizle' : 'Hepsini Gör'}
                      </button>
                    </div>
                    <input className="mb-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" placeholder="Kullanici ara" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
                    {showAllUsersTable ? (
                      <div className="max-h-56 overflow-auto rounded-xl border border-slate-200">
                        <table className="min-w-full text-left text-sm">
                          <thead className="sticky top-0 bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
                            <tr>
                              <th className="px-3 py-2">Ad Soyad</th>
                              <th className="px-3 py-2">Rol</th>
                              <th className="px-3 py-2">E-posta</th>
                              <th className="px-3 py-2 text-center">Sec</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredUsers.map((user) => (
                              <tr key={`${user.kullaniciId}-${user.email}`} className="border-t border-slate-200 bg-white">
                                <td className="px-3 py-2 font-medium text-slate-800">{user.adSoyad}</td>
                                <td className="px-3 py-2 text-slate-600">{user.rolAdi}</td>
                                <td className="px-3 py-2 text-slate-600">{user.email}</td>
                                <td className="px-3 py-2 text-center">
                                  <input
                                    type="checkbox"
                                    checked={selectedUsers.includes(user.kullaniciId)}
                                    onChange={() => setSelectedUsers((prev) => prev.includes(user.kullaniciId) ? prev.filter((id) => id !== user.kullaniciId) : [...prev, user.kullaniciId])}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="max-h-44 space-y-2 overflow-auto pr-1">
                        {filteredUsers.map((user) => (
                          <label key={`${user.kullaniciId}-${user.email}`} className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-2.5 ${selectedUsers.includes(user.kullaniciId) ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-white'}`}>
                            <div>
                              <p className="text-sm font-medium">{user.adSoyad}</p>
                              <p className="text-xs text-slate-500">{user.rolAdi} · {user.email}</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user.kullaniciId)}
                              onChange={() => setSelectedUsers((prev) => prev.includes(user.kullaniciId) ? prev.filter((id) => id !== user.kullaniciId) : [...prev, user.kullaniciId])}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                          </label>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </div>

              <div className="mt-auto border-t border-slate-200 bg-white px-4 pb-4 pt-3 sm:px-5" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                <div className="flex items-center justify-end gap-2">
                  <button type="button" onClick={onClose} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                    Vazgeç
                  </button>
                  <button
                    disabled={!valid || submitting}
                    onClick={handleSubmit}
                    className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? 'Oluşturuluyor...' : 'Issue Oluştur'}
                  </button>
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  )

  if (typeof document === 'undefined') return null
  return createPortal(drawer, document.body)
}
