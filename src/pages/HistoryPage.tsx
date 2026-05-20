import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Search } from 'lucide-react'
import { createPortal } from 'react-dom'
import { fetchMyHistory, type HistoryItem } from '../services/historyApi'

function parseHistoryDate(value: string): Date | null {
  const [datePart, timePart = '00:00'] = value.trim().split(' ')
  const [dayRaw, monthRaw, yearRaw] = datePart.split('.')
  const [hourRaw = '0', minuteRaw = '0'] = timePart.split(':')
  const day = Number(dayRaw)
  const month = Number(monthRaw)
  const year = Number(yearRaw)
  const hour = Number(hourRaw)
  const minute = Number(minuteRaw)
  if ([day, month, year, hour, minute].some((part) => Number.isNaN(part)) || year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) return null
  return new Date(year, month - 1, day, hour, minute, 0, 0)
}

function inDateRange(date: Date | null, startDate: string, endDate: string) {
  if (!date) return false
  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`)
    if (date < start) return false
  }
  if (endDate) {
    const end = new Date(`${endDate}T23:59:59`)
    if (date > end) return false
  }
  return true
}

const PAGE_SIZE = 10

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [flowFilter, setFlowFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [stepFilter, setStepFilter] = useState('')
  const [surecIdFilter, setSurecIdFilter] = useState('')
  const [contentFilter, setContentFilter] = useState('')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [page, setPage] = useState(1)

  const loadHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchMyHistory()
      setHistory(Array.isArray(data) ? data : [])
    } catch (requestError) {
      const message = axios.isAxiosError(requestError)
        ? requestError.response?.data?.message || requestError.message
        : requestError instanceof Error
          ? requestError.message
          : 'Islem gecmisi alinamadi.'
      setError(String(message))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    if (!selectedItem) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [selectedItem])

  const actionOptions = useMemo(
    () => Array.from(new Set(history.map((item) => item.aksiyon))).sort((a, b) => a.localeCompare(b, 'tr')),
    [history],
  )

  const filteredHistory = useMemo(() => {
    const flowQuery = flowFilter.trim().toLocaleLowerCase('tr-TR')
    const stepQuery = stepFilter.trim().toLocaleLowerCase('tr-TR')
    const contentQuery = contentFilter.trim().toLocaleLowerCase('tr-TR')
    const surecIdQuery = surecIdFilter.trim()

    return history.filter((item) => {
      if (flowQuery && !item.akisAdi.toLocaleLowerCase('tr-TR').includes(flowQuery)) return false
      if (actionFilter && item.aksiyon !== actionFilter) return false
      if (stepQuery && !item.adimAdi.toLocaleLowerCase('tr-TR').includes(stepQuery)) return false
      if (surecIdQuery && String(item.surecId) !== surecIdQuery) return false

      const formText = String(item.formIcerik ?? '').toLocaleLowerCase('tr-TR')
      const aciklamaText = String(item.aciklama ?? '').toLocaleLowerCase('tr-TR')
      if (contentQuery && !formText.includes(contentQuery) && !aciklamaText.includes(contentQuery)) return false

      return inDateRange(parseHistoryDate(item.tarih), startDateFilter, endDateFilter)
    })
  }, [history, flowFilter, actionFilter, stepFilter, surecIdFilter, contentFilter, startDateFilter, endDateFilter])

  useEffect(() => {
    setPage(1)
  }, [flowFilter, actionFilter, stepFilter, surecIdFilter, contentFilter, startDateFilter, endDateFilter])

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE))
  const pageItems = filteredHistory.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const rejectedCount = filteredHistory.filter((item) => item.aksiyon.toLocaleUpperCase('tr-TR').includes('RED')).length
  const approvedCount = filteredHistory.length - rejectedCount
  const detailLines = useMemo(() => {
    if (!selectedItem?.formIcerik) return []
    return selectedItem.formIcerik.split('|').map((part) => part.trim()).filter(Boolean)
  }, [selectedItem])

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50/50 p-8 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-850/50">
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/5" />
        <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/5" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Log & Geçmiş İzleme</p>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">İşlem Geçmişi</h1>
            <p className="text-slate-600 dark:text-slate-350 max-w-3xl text-sm leading-relaxed">
              Tüm iş akış süreçlerini, onay durumlarını, form detaylarını ve geçmiş logları filtreleyerek anlık olarak inceleyebilirsiniz.
            </p>
          </div>
        </div>
      </section>

      {/* Advanced Filtering Panel */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 dark:backdrop-blur-md">
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">Gelişmiş Filtreleme</p>
          <button
            type="button"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 transition dark:text-blue-400 dark:hover:text-blue-300"
            onClick={() => {
              setFlowFilter('')
              setActionFilter('')
              setStepFilter('')
              setSurecIdFilter('')
              setContentFilter('')
              setStartDateFilter('')
              setEndDateFilter('')
            }}
          >
            Filtreleri Temizle
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label>
            <span className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">İşlem Adı</span>
            <select 
              value={actionFilter} 
              onChange={(e) => setActionFilter(e.target.value)} 
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-905"
            >
              <option value="">Tüm işlemler</option>
              {actionOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Adım Adı</span>
            <input 
              value={stepFilter} 
              onChange={(e) => setStepFilter(e.target.value)} 
              placeholder="örn: Finans Onayı" 
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-905" 
            />
          </label>

          <label>
            <span className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Process ID</span>
            <input 
              value={surecIdFilter} 
              onChange={(e) => setSurecIdFilter(e.target.value)} 
              placeholder="PRC-000" 
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-905" 
            />
          </label>

          <label>
            <span className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tarih Aralığı</span>
            <input 
              type="date" 
              value={startDateFilter} 
              onChange={(e) => setStartDateFilter(e.target.value)} 
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-905" 
            />
          </label>

          <label className="xl:col-span-2">
            <span className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Akış Adı</span>
            <input 
              value={flowFilter} 
              onChange={(e) => setFlowFilter(e.target.value)} 
              placeholder="Akış adında ara" 
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-905" 
            />
          </label>

          <label className="xl:col-span-2">
            <span className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Açıklama / Not</span>
            <div className="relative">
              <input 
                value={contentFilter} 
                onChange={(e) => setContentFilter(e.target.value)} 
                placeholder="Not veya içerikte ara" 
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-3.5 pr-10 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-905" 
              />
              <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </label>
        </div>

        <div className="mt-5 flex justify-end">
          <button 
            type="button" 
            onClick={loadHistory} 
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/10 hover:shadow-lg active:scale-[0.98] transition"
          >
            <Search className="h-4 w-4" /> Kayıtları Sorgula
          </button>
        </div>
      </section>

      {/* Status Cards */}
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all duration-200 hover:shadow-md border-l-4 border-l-blue-500">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">TOPLAM İŞLEM</p>
          <p className="mt-2 text-3xl font-black text-slate-800 dark:text-slate-100">{filteredHistory.length.toLocaleString('tr-TR')}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-emerald-50/20 p-5 shadow-sm dark:border-slate-800 dark:bg-emerald-950/10 transition-all duration-200 hover:shadow-md border-l-4 border-l-emerald-500">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-455">ONAYLANAN</p>
          <p className="mt-2 text-3xl font-black text-emerald-700 dark:text-emerald-400">{approvedCount.toLocaleString('tr-TR')}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-rose-50/20 p-5 shadow-sm dark:border-slate-800 dark:bg-rose-950/10 transition-all duration-200 hover:shadow-md border-l-4 border-l-rose-500">
          <p className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-455">REDDEDİLEN</p>
          <p className="mt-2 text-3xl font-black text-rose-700 dark:text-rose-400">{rejectedCount.toLocaleString('tr-TR')}</p>
        </article>
      </section>

      {/* Records List Section */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Kayıtlar</h2>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Sıralama: En Yeni Önce</span>
        </div>

        {error ? <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50/50 p-4 text-xs font-semibold text-rose-650 dark:text-rose-400">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Yükleniyor...</p>
        ) : pageItems.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Kayıt bulunamadı.</p>
        ) : (
          <div className="space-y-3">
            {pageItems.map((item, index) => {
              const rejected = item.aksiyon.toLocaleUpperCase('tr-TR').includes('RED')
              return (
                <button
                  key={`${item.surecId}-${item.tarih}-${item.aksiyon}-${index}`}
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className="w-full rounded-2xl border border-slate-200 bg-white text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-blue-400/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700/80"
                >
                  <div className="grid gap-4 p-4 md:grid-cols-[1.4fr_1.8fr_220px] items-center">
                    <div className="border-slate-100 dark:border-slate-800 md:border-r md:pr-4">
                      <p className="text-xs font-bold text-blue-600 dark:text-blue-400">PRC-{item.surecId}</p>
                      <p className="mt-1 text-base font-extrabold text-slate-800 dark:text-slate-100 leading-snug">{item.akisAdi}</p>
                      <p className="mt-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500">Tip: Ofis Ekipmanı</p>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Aktif Adım</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">{item.adimAdi}</p>
                      <p className="mt-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Açıklama / Not</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{item.formIcerik || item.aciklama || '-'}</p>
                    </div>

                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 border-t border-slate-50 md:border-t-0 pt-3 md:pt-0">
                      <div className="flex flex-col md:items-end gap-1.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold border ${
                          rejected 
                            ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-200/50 dark:border-rose-900/40' 
                            : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/40'
                        }`}>
                          {rejected ? 'Reddedildi' : 'Onaylandı'}
                        </span>
                        <p className="text-xs font-semibold text-slate-450 dark:text-slate-500 mt-0.5">{item.tarih}</p>
                      </div>
                      <span className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-655 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-350 dark:hover:bg-slate-750 transition">
                        Detay
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Pagination Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-4 text-xs font-bold text-slate-400 dark:text-slate-505">
          <p>
            Toplam {filteredHistory.length.toLocaleString('tr-TR')} kayıttan {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredHistory.length)} arası gösteriliyor
          </p>
          <div className="flex items-center gap-1">
            <button 
              disabled={page <= 1} 
              onClick={() => setPage((p) => Math.max(1, p - 1))} 
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 p-2.5 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-905 dark:hover:bg-slate-850 transition"
            >
              {'<'}
            </button>
            <span className="rounded-xl bg-blue-600 px-4 py-2.5 font-bold text-white shadow-sm shadow-blue-500/10">
              {page}
            </span>
            <span className="px-2">/ {totalPages}</span>
            <button 
              disabled={page >= totalPages} 
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))} 
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 p-2.5 disabled:opacity-40 dark:border-slate-800 dark:bg-slate-905 dark:hover:bg-slate-850 transition"
            >
              {'>'}
            </button>
          </div>
        </div>
      </section>

      {selectedItem && typeof document !== 'undefined'
        ? createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4" onClick={() => setSelectedItem(null)}>
            <div className="w-full max-w-2xl rounded-3xl border border-slate-150 bg-white p-6 shadow-2xl dark:border-slate-850 dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-505">İşlem Detayı</p>
                  <h2 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">#{selectedItem.surecId} - {selectedItem.akisAdi}</h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{selectedItem.tarih}</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setSelectedItem(null)} 
                  className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 transition"
                >
                  Kapat
                </button>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-cyan-100 bg-cyan-50/50 p-4 dark:border-cyan-950/30 dark:bg-cyan-950/10">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Adım</p>
                  <p className="mt-1 text-sm font-extrabold text-cyan-900 dark:text-cyan-200">{selectedItem.adimAdi}</p>
                </div>
                <div className={`rounded-xl border p-4 ${
                  selectedItem.aksiyon.toLocaleUpperCase('tr-TR').includes('RED') 
                    ? 'border-rose-100 bg-rose-50/50 dark:border-rose-950/30 dark:bg-rose-950/10' 
                    : 'border-emerald-100 bg-emerald-50/50 dark:border-emerald-950/30 dark:bg-emerald-950/10'
                }`}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-405">Aksiyon</p>
                  <p className="mt-1 text-sm font-extrabold text-slate-900 dark:text-slate-200">{selectedItem.aksiyon}</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/50">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Form İçeriği</p>
                {detailLines.length > 0 ? (
                  <ul className="space-y-2">
                    {detailLines.map((line, idx) => (
                      <li 
                        key={`${line}-${idx}`} 
                        className="rounded-xl border border-slate-150 bg-white px-4 py-3 text-xs font-medium text-slate-700 dark:border-slate-800/80 dark:bg-slate-905 dark:text-slate-300 shadow-sm"
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs font-medium text-slate-450 dark:text-slate-500">Bu kayıt için form içeriği bulunamadı.</p>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
        : null}
    </div>
  )
}

