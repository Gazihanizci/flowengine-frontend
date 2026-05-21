import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  SlidersHorizontal, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  X, 
  Layers, 
  Hash, 
  Activity, 
  ChevronRight,
  RefreshCw
} from 'lucide-react'
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
  const [showFilters, setShowFilters] = useState(false)

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
          : 'İşlem geçmişi alınamadı.'
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

  const activeFilterCount = useMemo(() => {
    return [flowFilter, actionFilter, stepFilter, surecIdFilter, contentFilter, startDateFilter, endDateFilter].filter(Boolean).length
  }, [flowFilter, actionFilter, stepFilter, surecIdFilter, contentFilter, startDateFilter, endDateFilter])

  const approvedPercent = useMemo(() => {
    return filteredHistory.length > 0 ? Math.round((approvedCount / filteredHistory.length) * 100) : 0
  }, [approvedCount, filteredHistory.length])

  const rejectedPercent = useMemo(() => {
    return filteredHistory.length > 0 ? Math.round((rejectedCount / filteredHistory.length) * 100) : 0
  }, [rejectedCount, filteredHistory.length])

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-indigo-50/60 via-white to-blue-50/40 p-8 shadow-sm dark:border-slate-800 dark:from-slate-900/60 dark:via-slate-900/40 dark:to-slate-800/20 backdrop-blur-md">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/5 animate-pulse" />
        <div className="absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/5 animate-pulse" />
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-600 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Log & Geçmiş İzleme</p>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent dark:from-white dark:via-indigo-200 dark:to-white">
              İşlem Geçmişi
            </h1>
            <p className="text-slate-600 dark:text-slate-350 max-w-3xl text-sm leading-relaxed">
              Tüm iş akış süreçlerini, onay durumlarını, form detaylarını ve geçmiş logları filtreleyerek anlık olarak inceleyebilirsiniz.
            </p>
          </div>

          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold shadow-sm transition-all duration-200 shrink-0 ${
              showFilters 
                ? 'bg-slate-800 text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white' 
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/10'
            }`}
          >
            <SlidersHorizontal className={`h-4 w-4 transition-transform duration-300 ${showFilters ? 'rotate-90' : ''}`} />
            <span>{showFilters ? 'Filtreleri Gizle' : 'Gelişmiş Filtrele'}</span>
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white dark:ring-slate-900">
                {activeFilterCount}
              </span>
            )}
          </motion.button>
        </div>
      </section>

      {/* Collapsible Advanced Filtering Panel Wrapper */}
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <section className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-md dark:border-slate-800 dark:bg-slate-900/60 backdrop-blur-md">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-550 dark:text-slate-400">Gelişmiş Filtreleme</p>
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

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">İşlem Adı</span>
                  <div className="relative">
                    <SlidersHorizontal className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select 
                      value={actionFilter} 
                      onChange={(e) => setActionFilter(e.target.value)} 
                      className="w-full pl-9 pr-2.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 outline-none transition duration-150 focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 focus:bg-white dark:border-slate-855 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-800/60 dark:focus:bg-slate-900"
                    >
                      <option value="">Tüm işlemler</option>
                      {actionOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Adım Adı</span>
                  <div className="relative">
                    <Layers className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input 
                      value={stepFilter} 
                      onChange={(e) => setStepFilter(e.target.value)} 
                      placeholder="örn: Finans Onayı" 
                      className="w-full pl-9 pr-2.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 outline-none transition duration-150 focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 focus:bg-white dark:border-slate-855 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-800/60 dark:focus:bg-slate-900" 
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Process ID</span>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input 
                      value={surecIdFilter} 
                      onChange={(e) => setSurecIdFilter(e.target.value)} 
                      placeholder="PRC-000" 
                      className="w-full pl-9 pr-2.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 outline-none transition duration-150 focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 focus:bg-white dark:border-slate-855 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-800/60 dark:focus:bg-slate-900" 
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Akış Adı</span>
                  <div className="relative">
                    <Activity className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input 
                      value={flowFilter} 
                      onChange={(e) => setFlowFilter(e.target.value)} 
                      placeholder="Akış adında ara" 
                      className="w-full pl-9 pr-2.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 outline-none transition duration-150 focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 focus:bg-white dark:border-slate-855 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-800/60 dark:focus:bg-slate-900" 
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Açıklama / Not</span>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input 
                      value={contentFilter} 
                      onChange={(e) => setContentFilter(e.target.value)} 
                      placeholder="Not veya içerikte ara" 
                      className="w-full pl-9 pr-2.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 outline-none transition duration-150 focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 focus:bg-white dark:border-slate-855 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-800/60 dark:focus:bg-slate-900" 
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Tarih</span>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input 
                      type="date" 
                      value={startDateFilter} 
                      onChange={(e) => setStartDateFilter(e.target.value)} 
                      className="w-full pl-9 pr-2.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 outline-none transition duration-150 focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 focus:bg-white dark:border-slate-855 dark:bg-slate-800/40 dark:text-slate-200 dark:hover:bg-slate-800/60 dark:focus:bg-slate-900" 
                    />
                  </div>
                </label>
              </div>

              <div className="mt-4 flex justify-end gap-2.5">
                <button 
                  type="button" 
                  onClick={loadHistory} 
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-blue-500/10 hover:shadow-md active:scale-[0.98] transition"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Kayıtları Yenile
                </button>
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Cards */}
      <section className="grid gap-4 md:grid-cols-3">
        <motion.article 
          whileHover={{ y: -2 }}
          className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/50 transition-all duration-200 hover:shadow-md hover:border-indigo-500/30 dark:hover:border-indigo-500/20 flex items-center gap-5"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 ring-4 ring-indigo-50/50 dark:ring-indigo-950/20 shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-500">TOPLAM İŞLEM</p>
            <p className="mt-1.5 text-3xl font-black text-slate-900 dark:text-white leading-none">
              {filteredHistory.length.toLocaleString('tr-TR')}
            </p>
          </div>
        </motion.article>

        <motion.article 
          whileHover={{ y: -2 }}
          className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-emerald-50/10 p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-emerald-950/5 transition-all duration-200 hover:shadow-md hover:border-emerald-500/30 dark:hover:border-emerald-500/20 flex items-center justify-between gap-5"
        >
          <div className="flex items-center gap-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 ring-4 ring-emerald-50/50 dark:ring-emerald-950/20 shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">ONAYLANAN</p>
              <p className="mt-1.5 text-3xl font-black text-slate-900 dark:text-white leading-none">
                {approvedCount.toLocaleString('tr-TR')}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-250/20">
            %{approvedPercent}
          </span>
        </motion.article>

        <motion.article 
          whileHover={{ y: -2 }}
          className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-rose-50/10 p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-rose-955/5 transition-all duration-200 hover:shadow-md hover:border-rose-500/30 dark:hover:border-rose-500/20 flex items-center justify-between gap-5"
        >
          <div className="flex items-center gap-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 ring-4 ring-rose-50/50 dark:ring-rose-950/20 shrink-0">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">REDDEDİLEN</p>
              <p className="mt-1.5 text-3xl font-black text-slate-900 dark:text-white leading-none">
                {rejectedCount.toLocaleString('tr-TR')}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-250/20">
            %{rejectedPercent}
          </span>
        </motion.article>
      </section>

      {/* Records List Section */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 backdrop-blur-sm">
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-blue-600" />
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Kayıtlar</h2>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Sıralama: En Yeni Önce</span>
        </div>

        {error ? <p className="mb-4 rounded-xl border border-rose-205 bg-rose-50/50 p-4 text-xs font-semibold text-rose-650 dark:text-rose-400">{error}</p> : null}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mb-3" />
            <p className="text-sm font-bold text-slate-550 dark:text-slate-400">Yükleniyor...</p>
          </div>
        ) : pageItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-850 text-slate-400 mb-4 ring-4 ring-slate-100/50 dark:ring-slate-900/20">
              <FileText className="h-8 w-8" />
            </div>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Kayıt bulunamadı.</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Arama kriterlerinizi değiştirip tekrar deneyebilirsiniz.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pageItems.map((item, index) => {
              const rejected = item.aksiyon.toLocaleUpperCase('tr-TR').includes('RED')
              return (
                <motion.button
                  key={`${item.surecId}-${item.tarih}-${item.aksiyon}-${index}`}
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
                  whileHover={{ y: -2 }}
                  className={`w-full rounded-2xl border text-left transition-all duration-200 ${
                    rejected 
                      ? 'border-slate-150 dark:border-slate-800/80 hover:border-rose-300 dark:hover:border-rose-900/50 hover:shadow-lg hover:shadow-rose-500/[0.02]' 
                      : 'border-slate-150 dark:border-slate-800/80 hover:border-emerald-300 dark:hover:border-emerald-900/50 hover:shadow-lg hover:shadow-emerald-500/[0.02]'
                  } bg-white dark:bg-slate-905 overflow-hidden relative group`}
                >
                  {/* Accent Left Bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-200 group-hover:w-2 ${
                    rejected ? 'bg-rose-500 dark:bg-rose-600' : 'bg-emerald-500 dark:bg-emerald-600'
                  }`} />

                  <div className="grid gap-5 p-5 md:grid-cols-[1.5fr_2fr_220px] items-center">
                    <div className="pl-3 border-slate-100 dark:border-slate-800 md:border-r md:pr-5">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[10px] font-bold text-blue-650 dark:text-blue-400 border border-blue-100/50 dark:border-blue-950/20">
                          PRC-{item.surecId}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">Tip: Ofis Ekipmanı</span>
                      </div>
                      <h3 className="mt-2.5 text-base font-extrabold text-slate-800 dark:text-slate-100 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-150">
                        {item.akisAdi}
                      </h3>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Aktif Adım</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-350">{item.adimAdi}</p>
                        </div>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Açıklama / Not</span>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
                          {item.formIcerik || item.aciklama || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 border-t border-slate-50 dark:border-slate-850/30 md:border-t-0 pt-3 md:pt-0">
                      <div className="flex flex-col md:items-end gap-1.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold border ${
                          rejected 
                            ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-455 border-rose-200/50 dark:border-rose-900/40' 
                            : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-455 border-emerald-200/50 dark:border-emerald-900/40'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${rejected ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                          {rejected ? 'Reddedildi' : 'Onaylandı'}
                        </span>
                        
                        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>{item.tarih}</span>
                        </div>
                      </div>

                      <div className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-205 bg-slate-50 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 px-4 py-2 text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-350 dark:group-hover:bg-blue-600 dark:group-hover:text-white dark:group-hover:border-blue-600 transition-all duration-200">
                        <span>Detay</span>
                        <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}

        {/* Pagination Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-850 pt-5 text-xs font-semibold text-slate-400 dark:text-slate-500">
          <p>
            Toplam <span className="font-bold text-slate-700 dark:text-slate-300">{filteredHistory.length.toLocaleString('tr-TR')}</span> kayıttan <span className="font-bold text-slate-700 dark:text-slate-300">{(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredHistory.length)}</span> arası gösteriliyor
          </p>
          <div className="flex items-center gap-1">
            <button 
              disabled={page <= 1} 
              onClick={() => setPage((p) => Math.max(1, p - 1))} 
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 p-2.5 disabled:opacity-40 disabled:pointer-events-none dark:border-slate-800 dark:bg-slate-905 dark:hover:bg-slate-850 transition-all active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <span className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/10">
              {page}
            </span>
            <span className="px-2 font-bold">/ {totalPages}</span>
            <button 
              disabled={page >= totalPages} 
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))} 
              className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 p-2.5 disabled:opacity-40 disabled:pointer-events-none dark:border-slate-800 dark:bg-slate-905 dark:hover:bg-slate-850 transition-all active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>
        </div>
      </section>

      {/* Details Modal Portal */}
      {typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence>
              {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  {/* Backdrop */}
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md"
                    onClick={() => setSelectedItem(null)}
                  />

                  {/* Modal Card */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: 'spring', duration: 0.4 }}
                    className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 md:p-8"
                  >
                    {/* Glowing Blobs in Modal */}
                    <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
                    <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />

                    <div className="relative">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-850 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[10px] font-bold text-blue-650 dark:text-blue-400 border border-blue-100/50 dark:border-blue-950/20">
                              İŞLEM DETAYI
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">{selectedItem.tarih}</span>
                          </div>
                          <h2 className="mt-2 text-xl font-black text-slate-900 dark:text-white leading-tight">
                            #{selectedItem.surecId} - {selectedItem.akisAdi}
                          </h2>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setSelectedItem(null)} 
                          className="rounded-full bg-slate-50 hover:bg-slate-100 p-2 text-slate-550 hover:text-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-750 dark:hover:text-slate-200 transition-all duration-150"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Body Content */}
                      <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-blue-100/50 bg-blue-50/20 p-5 dark:border-blue-950/30 dark:bg-blue-950/10 flex flex-col justify-between">
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-blue-650 dark:text-blue-400">Adım</span>
                            <p className="mt-1 text-base font-extrabold text-blue-900 dark:text-blue-200 leading-snug">{selectedItem.adimAdi}</p>
                          </div>
                          <div className="mt-4 flex items-center gap-1.5 text-xs text-blue-650 dark:text-blue-400 font-semibold">
                            <Layers className="h-4 w-4" />
                            <span>Süreç Aşama Bilgisi</span>
                          </div>
                        </div>
                        
                        {/* Actions Card */}
                        <div className={`rounded-2xl border p-5 flex flex-col justify-between ${
                          selectedItem.aksiyon.toLocaleUpperCase('tr-TR').includes('RED') 
                            ? 'border-rose-100/50 bg-rose-50/20 dark:border-rose-950/30 dark:bg-rose-955/10' 
                            : 'border-emerald-100/50 bg-emerald-50/20 dark:border-emerald-950/30 dark:bg-emerald-955/10'
                        }`}>
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-405 dark:text-slate-500">Aksiyon</span>
                            <p className="mt-1 text-base font-extrabold text-slate-900 dark:text-slate-200 leading-snug">{selectedItem.aksiyon}</p>
                          </div>
                          
                          <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold">
                            {selectedItem.aksiyon.toLocaleUpperCase('tr-TR').includes('RED') ? (
                              <>
                                <AlertCircle className="h-4 w-4 text-rose-500" />
                                <span className="text-rose-700 dark:text-rose-400">İşlem Reddedildi</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                <span className="text-emerald-700 dark:text-emerald-400">İşlem Onaylandı</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Form Details Area */}
                      <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-900/60">
                        <div className="mb-4 flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Form İçeriği</span>
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                            {detailLines.length} Parametre
                          </span>
                        </div>

                        {detailLines.length > 0 ? (
                          <div className="max-h-[220px] overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
                            {detailLines.map((line, idx) => (
                              <div 
                                key={`${line}-${idx}`} 
                                className="flex items-center gap-3 rounded-xl border border-slate-150 bg-white px-4 py-3 text-xs font-semibold text-slate-700 dark:border-slate-850 dark:bg-slate-950 dark:text-slate-350 shadow-sm transition-colors duration-150 hover:bg-slate-50/50 dark:hover:bg-slate-900/50"
                              >
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                                <span className="break-all">{line}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-6 text-center text-slate-450 dark:text-slate-500">
                            <FileText className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-xs font-semibold">Bu kayıt için form içeriği bulunamadı.</p>
                          </div>
                        )}
                      </div>

                      {/* Footer Close Button */}
                      <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-850 pt-4">
                        <button 
                          type="button" 
                          onClick={() => setSelectedItem(null)} 
                          className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-6 py-2.5 text-xs font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-850 dark:text-slate-300 dark:hover:bg-slate-750 transition active:scale-[0.98]"
                        >
                          Kapat
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  )
}


