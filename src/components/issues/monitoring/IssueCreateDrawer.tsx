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
          <motion.button 
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose} 
          />
          <motion.aside
            className="fixed right-0 top-0 z-50 h-screen w-full border-l border-slate-200 bg-slate-50 dark:border-slate-850 dark:bg-slate-950 sm:w-[min(520px,100vw)] shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
          >
            <div className="flex h-full min-h-0 flex-col">
              {/* Drawer Header */}
              <div className="border-b border-slate-200 bg-white dark:border-slate-850 dark:bg-slate-900 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-pulse" />
                      <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Yeni Issue Oluştur</h3>
                    </div>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-505">Sistem üzerindeki aksaklıkları bildirin.</p>
                  </div>
                  <button 
                    type="button" 
                    className="rounded-xl border border-slate-200 bg-white p-2.5 hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-750 dark:hover:text-white" 
                    onClick={onClose}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Scrollable Form Content */}
              <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-28 pt-5 custom-scrollbar">
                <div className="space-y-5">
                  {/* Basic Info Section */}
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="space-y-4">
                      <div>
                        <span className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">BAŞLIK</span>
                        <input 
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-905" 
                          placeholder="Kısa ve açıklayıcı bir başlık girin..." 
                          value={title} 
                          onChange={(e) => setTitle(e.target.value)} 
                        />
                      </div>
                      <div>
                        <span className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">AÇIKLAMA</span>
                        <textarea 
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-905" 
                          placeholder="Issue detaylarını, karşılaşılan hataları ve adımları detaylandırın..." 
                          rows={4} 
                          value={description} 
                          onChange={(e) => setDescription(e.target.value)} 
                        />
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <span className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ÖNCELİK</span>
                          <select 
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-905" 
                            value={priority} 
                            onChange={(e) => setPriority(e.target.value)}
                          >
                            {PRIORITY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                          </select>
                        </div>
                        <div>
                          <span className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">WORKFLOW SEÇİMİ</span>
                          <div className="relative">
                            <input 
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-3.5 pr-10 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-905" 
                              placeholder="Workflow ara..." 
                              value={flowSearch} 
                              onChange={(e) => setFlowSearch(e.target.value)} 
                            />
                            <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Workflows List Section */}
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <p className="mb-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">WORKFLOW LİSTESİ</p>
                    <div className="max-h-40 space-y-2 overflow-auto pr-1 custom-scrollbar">
                      {filteredFlows.map((flow) => {
                        const isSelected = selectedFlow === flow.akisId;
                        return (
                          <button 
                            key={flow.akisId} 
                            type="button"
                            className={`w-full rounded-xl border p-3 text-left transition-all duration-150 ${
                              isSelected 
                                ? 'border-blue-500 bg-blue-50/40 text-blue-900 dark:border-blue-400 dark:bg-blue-950/20 dark:text-blue-100 shadow-sm shadow-blue-500/5' 
                                : 'border-slate-200 bg-white hover:border-slate-350 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700/80 dark:text-slate-300'
                            }`} 
                            onClick={() => setSelectedFlow(flow.akisId)}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <p className="text-sm font-bold">{flow.akisAdi}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{flow.aciklama || '-'}</p>
                              </div>
                              {isSelected && (
                                <div className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                              )}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </section>

                  {/* Assignments Section */}
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ATAMALAR</p>
                      <button
                        type="button"
                        onClick={() => {
                          setUserSearch('')
                          setShowAllUsersTable((prev) => !prev)
                        }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 transition dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {showAllUsersTable ? 'Tabloyu Gizle' : 'Hepsini Gör'}
                      </button>
                    </div>
                    <input 
                      className="mb-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-905" 
                      placeholder="Kullanıcı ara..." 
                      value={userSearch} 
                      onChange={(e) => setUserSearch(e.target.value)} 
                    />
                    {showAllUsersTable ? (
                      <div className="max-h-56 overflow-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm custom-scrollbar">
                        <table className="min-w-full text-left text-sm">
                          <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-550 dark:text-slate-405">
                            <tr>
                              <th className="px-4 py-2.5">Ad Soyad</th>
                              <th className="px-4 py-2.5">Rol</th>
                              <th className="px-4 py-2.5">E-posta</th>
                              <th className="px-4 py-2.5 text-center">Seç</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredUsers.map((user) => (
                              <tr key={`${user.kullaniciId}-${user.email}`} className="border-t border-slate-100 dark:border-slate-800/80 bg-white hover:bg-slate-50/50 dark:bg-slate-900 dark:hover:bg-slate-850 transition">
                                <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">{user.adSoyad}</td>
                                <td className="px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{user.rolAdi}</td>
                                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-450">{user.email}</td>
                                <td className="px-4 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={selectedUsers.includes(user.kullaniciId)}
                                    onChange={() => setSelectedUsers((prev) => prev.includes(user.kullaniciId) ? prev.filter((id) => id !== user.kullaniciId) : [...prev, user.kullaniciId])}
                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-offset-slate-900"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="max-h-44 space-y-2 overflow-auto pr-1 custom-scrollbar">
                        {filteredUsers.map((user) => {
                          const isChecked = selectedUsers.includes(user.kullaniciId);
                          const initials = user.adSoyad.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                          return (
                            <label 
                              key={`${user.kullaniciId}-${user.email}`} 
                              className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 transition-all duration-150 ${
                                isChecked 
                                  ? 'border-blue-500 bg-blue-50/40 dark:border-blue-400 dark:bg-blue-950/20 shadow-sm shadow-blue-500/5' 
                                  : 'border-slate-200 bg-white hover:border-slate-350 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700/80'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-[11px] font-bold text-white uppercase shadow-sm shrink-0">
                                  {initials}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{user.adSoyad}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">{user.rolAdi} · {user.email}</p>
                                </div>
                              </div>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => setSelectedUsers((prev) => prev.includes(user.kullaniciId) ? prev.filter((id) => id !== user.kullaniciId) : [...prev, user.kullaniciId])}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:focus:ring-offset-slate-900"
                              />
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </section>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="mt-auto border-t border-slate-200 bg-white dark:border-slate-850 dark:bg-slate-900 px-5 py-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
                <div className="flex items-center justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={onClose} 
                    className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-5 py-2.5 text-sm font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 transition"
                  >
                    Vazgeç
                  </button>
                  <button
                    disabled={!valid || submitting}
                    onClick={handleSubmit}
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/10 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 transition active:scale-[0.98]"
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
