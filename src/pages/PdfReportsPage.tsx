import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  FileText,
  Clock3,
  Database,
  Zap,
  Search,
  CalendarDays,
  Grid,
  List,
  FileDown,
  Download,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { downloadPdfBySurecId, fetchSurecler, type SurecListItem } from '../services/pdfApi'

function parseBaslamaTarihi(value: string): Date | null {
  const [datePart, timePart = '00:00'] = value.trim().split(' ')
  const [dayRaw, monthRaw, yearRaw] = datePart.split('.')
  const [hourRaw = '0', minuteRaw = '0'] = timePart.split(':')

  const day = Number(dayRaw)
  const month = Number(monthRaw)
  const year = Number(yearRaw)
  const hour = Number(hourRaw)
  const minute = Number(minuteRaw)

  if (
    [day, month, year, hour, minute].some((part) => Number.isNaN(part)) ||
    year < 1000 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null
  }

  return new Date(year, month - 1, day, hour, minute, 0, 0)
}

function isInDateRange(value: Date | null, startDate: string, endDate: string) {
  if (!value) return false

  if (startDate) {
    const start = new Date(`${startDate}T00:00:00`)
    if (value < start) return false
  }

  if (endDate) {
    const end = new Date(`${endDate}T23:59:59`)
    if (value > end) return false
  }

  return true
}

function toFileSizeLabel(text: string) {
  const kb = Math.max(200, Math.min(5400, text.length * 38))
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`
  return `${kb} KB`
}

export default function PdfReportsPage() {
  const [surecler, setSurecler] = useState<SurecListItem[]>([])
  const [selectedSurecId, setSelectedSurecId] = useState<number | null>(null)
  const [flowNameFilter, setFlowNameFilter] = useState('')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'name_desc'>('date_desc')
  const [loadingSurecler, setLoadingSurecler] = useState(false)
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(8)

  // Reset page when filters or sorting change
  useEffect(() => {
    setCurrentPage(1)
  }, [flowNameFilter, startDateFilter, endDateFilter, sortBy])

  const loadSurecler = async () => {
    setLoadingSurecler(true)
    setError(null)

    try {
      const data = await fetchSurecler()
      const list = Array.isArray(data) ? data : []
      setSurecler(list)
      setSelectedSurecId((prev) => {
        if (prev && list.some((item) => item.surecId === prev)) return prev
        return list[0]?.surecId ?? null
      })
    } catch (requestError) {
      const message = axios.isAxiosError(requestError)
        ? requestError.response?.data?.message || requestError.message
        : requestError instanceof Error
          ? requestError.message
          : 'Süreçler listesi alınamadı. Lütfen daha sonra tekrar deneyin.'
      setError(String(message))
    } finally {
      setLoadingSurecler(false)
    }
  }

  useEffect(() => {
    loadSurecler()
  }, [])

  const filteredSurecler = useMemo(() => {
    const query = flowNameFilter.trim().toLocaleLowerCase('tr-TR')

    return surecler.filter((surec) => {
      const nameMatch = surec.akisAdi.toLocaleLowerCase('tr-TR').includes(query)
      if (!nameMatch) return false

      const parsed = parseBaslamaTarihi(surec.baslamaTarihi)
      return isInDateRange(parsed, startDateFilter, endDateFilter)
    })
  }, [surecler, flowNameFilter, startDateFilter, endDateFilter])

  const sortedSurecler = useMemo(() => {
    const list = [...filteredSurecler]

    list.sort((left, right) => {
      if (sortBy === 'name_asc') return left.akisAdi.localeCompare(right.akisAdi, 'tr-TR')
      if (sortBy === 'name_desc') return right.akisAdi.localeCompare(left.akisAdi, 'tr-TR')

      const leftDate = parseBaslamaTarihi(left.baslamaTarihi)?.getTime() ?? 0
      const rightDate = parseBaslamaTarihi(right.baslamaTarihi)?.getTime() ?? 0
      return sortBy === 'date_asc' ? leftDate - rightDate : rightDate - leftDate
    })

    return list
  }, [filteredSurecler, sortBy])

  const paginatedSurecler = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedSurecler.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedSurecler, currentPage, itemsPerPage])

  const totalPages = Math.ceil(sortedSurecler.length / itemsPerPage)

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const range = 1

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - range && i <= currentPage + range)
      ) {
        pages.push(i)
      } else if (
        i === currentPage - range - 1 ||
        i === currentPage + range + 1
      ) {
        pages.push('...')
      }
    }

    return pages.filter((item, index) => {
      if (item === '...') {
        return pages[index - 1] !== '...'
      }
      return true
    })
  }

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [totalPages, currentPage])

  const stats = useMemo(() => {
    const total = sortedSurecler.length
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7))
    startOfWeek.setHours(0, 0, 0, 0)

    const thisWeek = sortedSurecler.filter((item) => {
      const d = parseBaslamaTarihi(item.baslamaTarihi)
      return d ? d >= startOfWeek : false
    }).length

    const totalKb = sortedSurecler.reduce((sum, item) => sum + Math.max(200, Math.min(5400, item.akisAciklama.length * 38)), 0)
    const gb = (totalKb / (1024 * 1024)).toFixed(1)

    const uniqueFlows = new Set(sortedSurecler.map((item) => item.akisAdi)).size
    return { total, thisWeek, gb, uniqueFlows }
  }, [sortedSurecler])

  const handleDownload = async (surecId?: number) => {
    const targetSurecId = surecId ?? selectedSurecId
    if (!targetSurecId) {
      setError('Lütfen önce listeden veya kılavuzdan bir süreç seçin.')
      return
    }

    setDownloadingId(targetSurecId)
    setError(null)
    setSuccess(null)

    try {
      await downloadPdfBySurecId(targetSurecId)
      setSuccess(`PDF raporu başarıyla oluşturuldu ve indirildi. Süreç ID: #${targetSurecId}`)
    } catch (requestError) {
      const message = axios.isAxiosError(requestError)
        ? requestError.response?.data?.message || requestError.message
        : requestError instanceof Error
          ? requestError.message
          : 'PDF raporu oluşturma veya indirme işlemi başarısız.'
      setError(String(message))
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Premium Dark Header Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-[0_20px_45px_rgba(2,6,23,0.35)] dark:border-slate-900">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl"></div>
        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">PDF Raporlama Sistemi</p>
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-white">Süreç Listesinden PDF İndir</h1>
          <p className="mt-1.5 text-sm text-slate-300 max-w-2xl leading-relaxed">
            Sistemde tamamlanan iş akışlarını arayabilir ve ilgili süreçlere ait PDF raporlarını anında oluşturup indirebilirsiniz.
          </p>
        </div>
      </section>

      {/* Summary Cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Toplam Rapor', value: stats.total, icon: FileText, border: 'border-l-4 border-l-blue-500', text: 'text-blue-600 dark:text-blue-400' },
          { label: 'Bu Hafta Üretilen', value: stats.thisWeek, icon: Clock3, border: 'border-l-4 border-l-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Kullanılan Alan', value: `${stats.gb} GB`, icon: Database, border: 'border-l-4 border-l-amber-500', text: 'text-amber-600 dark:text-amber-400' },
          { label: 'Aktif Akışlar', value: stats.uniqueFlows, icon: Zap, border: 'border-l-4 border-l-violet-500', text: 'text-violet-600 dark:text-violet-400' },
        ].map((item) => {
          const Icon = item.icon
          return (
            <div 
              key={item.label} 
              className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${item.border}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{item.label}</span>
                <Icon className={`h-5 w-5 shrink-0 ${item.text}`} />
              </div>
              <p className="mt-2.5 text-2xl font-black text-slate-800 dark:text-slate-100">{item.value}</p>
            </div>
          )
        })}
      </section>

      {/* Filter and Search Panel */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/50 dark:backdrop-blur-md">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12 items-end">
          <label className="xl:col-span-3">
            <span className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Akış Adı</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                value={flowNameFilter} 
                onChange={(event) => setFlowNameFilter(event.target.value)} 
                placeholder="Akış adında ara" 
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-950" 
              />
            </div>
          </label>
          <label className="xl:col-span-3">
            <span className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Başlangıç Tarihi</span>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input 
                type="date" 
                value={startDateFilter} 
                onChange={(event) => setStartDateFilter(event.target.value)} 
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-950" 
              />
            </div>
          </label>
          <label className="xl:col-span-3">
            <span className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Bitiş Tarihi</span>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input 
                type="date" 
                value={endDateFilter} 
                onChange={(event) => setEndDateFilter(event.target.value)} 
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-950" 
              />
            </div>
          </label>
          <label className="xl:col-span-2">
            <span className="mb-2 block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sıralama</span>
            <select 
              value={sortBy} 
              onChange={(event) => setSortBy(event.target.value as 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc')} 
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:bg-white dark:border-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:focus:bg-slate-950"
            >
              <option value="date_desc">Tarih (Yeni)</option>
              <option value="date_asc">Tarih (Eski)</option>
              <option value="name_asc">A-Z</option>
              <option value="name_desc">Z-A</option>
            </select>
          </label>
          <div className="xl:col-span-1">
            <button 
              type="button" 
              onClick={loadSurecler} 
              disabled={loadingSurecler} 
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/10 hover:shadow-lg active:scale-[0.98] transition disabled:from-slate-400 disabled:to-slate-500"
            >
              {loadingSurecler ? '...' : 'Yenile'}
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 px-6 py-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800 dark:text-white">Süreç Raporları ({sortedSurecler.length})</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {viewMode === 'grid' 
                ? 'İncelemek istediğiniz rapora tıklayarak seçebilir veya doğrudan PDF belgesini indirebilirsiniz.' 
                : 'Sıralı listeyi inceleyebilir, indirme butonunu görüntülemek için satıra tıklayabilirsiniz.'}
            </p>
          </div>

          {/* Grid/Table Toggle Switch */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-950 shrink-0 border border-slate-200/50 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex h-8 px-3 items-center gap-1.5 rounded-lg text-xs font-bold transition duration-150 ${
                viewMode === 'grid'
                  ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400'
                  : 'text-slate-450 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="Kılavuz (Kart) Görünümü"
            >
              <Grid className="h-4 w-4" />
              <span>Kart</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex h-8 px-3 items-center gap-1.5 rounded-lg text-xs font-bold transition duration-150 ${
                viewMode === 'table'
                  ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400'
                  : 'text-slate-455 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="Tablo Listesi Görünümü"
            >
              <List className="h-4 w-4" />
              <span>Tablo</span>
            </button>
          </div>
        </div>

        {loadingSurecler ? (
          <div className="flex items-center justify-center py-12 text-xs font-bold text-slate-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mr-2"></div>
            Süreçler yükleniyor...
          </div>
        ) : sortedSurecler.length === 0 ? (
          <div className="py-12 text-center text-xs font-bold text-slate-400">
            Filtreleme kriterlerine uygun süreç bulunamadı.
          </div>
        ) : (
          <>
            {viewMode === 'grid' ? (
              /* Premium Grid Cards View */
              <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-h-[60vh] overflow-y-auto">
                {paginatedSurecler.map((surec) => {
                  const isSelected = selectedSurecId === surec.surecId
                  const fileSize = toFileSizeLabel(surec.akisAciklama || '')
                  return (
                    <div
                      key={surec.surecId}
                      onClick={() => setSelectedSurecId(surec.surecId)}
                      className={`group relative flex flex-col justify-between rounded-2xl border bg-white p-5 transition duration-200 cursor-pointer hover:border-blue-500 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] dark:bg-slate-950 ${
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-500/10 dark:border-blue-900 bg-blue-50/5'
                          : 'border-slate-200 dark:border-slate-850'
                      }`}
                    >
                      {/* Left-top PDF accent ribbon */}
                      <div className={`absolute left-0 top-6 h-5 w-1 rounded-r-md ${isSelected ? 'bg-blue-500' : 'bg-rose-500'}`} />

                      <div className="space-y-3">
                        {/* Top layout */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 dark:bg-rose-950/20 dark:text-rose-400">
                            <FileDown className="h-5 w-5" />
                          </div>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500 dark:bg-slate-900 dark:text-slate-400 border border-slate-200/40 dark:border-slate-800">
                            PDF-{surec.surecId}
                          </span>
                        </div>

                        {/* Report Text */}
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-slate-800 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                            #{surec.surecId} - {surec.akisAdi}
                          </h4>
                          <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium line-clamp-2 leading-relaxed h-8">
                            {surec.akisAciklama || 'Süreç detay açıklaması belirtilmemiş.'}
                          </p>
                        </div>
                      </div>

                      {/* Horizontal Line */}
                      <div className="my-3.5 border-t border-slate-100 dark:border-slate-900" />

                      {/* Date, Size and Button details */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{surec.baslamaTarihi.split(' ')[0]}</span>
                          </div>
                          <div className="flex items-center gap-1 justify-end">
                            <Database className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{fileSize}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            void handleDownload(surec.surecId)
                          }}
                          disabled={downloadingId === surec.surecId}
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 py-2.5 text-xs font-bold text-white shadow-sm hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] transition disabled:from-slate-400 disabled:to-slate-500"
                        >
                          {downloadingId === surec.surecId ? (
                            <>
                              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                              Hazırlanıyor...
                            </>
                          ) : (
                            <>
                              <Download className="h-3.5 w-3.5" />
                              PDF Raporu İndir
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Classic Tabular View */
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-150 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    <tr>
                      <th className="px-6 py-4">Rapor Adı & No</th>
                      <th className="px-6 py-4">Açıklama</th>
                      <th className="px-6 py-4">Başlangıç Tarihi</th>
                      <th className="px-6 py-4">Dosya Boyutu</th>
                      <th className="px-6 py-4 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {paginatedSurecler.map((surec) => {
                      const isSelected = selectedSurecId === surec.surecId
                      return (
                        <tr 
                          key={surec.surecId} 
                          className={`cursor-pointer transition-all duration-155 ${isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20 border-l-4 border-l-blue-500' : 'bg-white hover:bg-slate-50/30 dark:bg-slate-900 dark:hover:bg-slate-850/25'}`} 
                          onClick={() => setSelectedSurecId(surec.surecId)}
                        >
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">#{surec.surecId} - {surec.akisAdi}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">PDF-{surec.surecId}</p>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400 max-w-xs truncate">{surec.akisAciklama || '-'}</td>
                          <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400">{surec.baslamaTarihi}</td>
                          <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">{toFileSizeLabel(surec.akisAciklama || '')}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex gap-2">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  void handleDownload(surec.surecId)
                                }}
                                disabled={downloadingId === surec.surecId}
                                className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] transition disabled:from-slate-400 disabled:to-slate-500"
                              >
                                {downloadingId === surec.surecId ? 'Hazırlanıyor...' : 'PDF İndir'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Premium Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-150 dark:border-slate-800/80 px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Toplam <span className="font-extrabold text-slate-800 dark:text-slate-200">{sortedSurecler.length}</span> kayıttan{' '}
                <span className="font-extrabold text-slate-800 dark:text-slate-200">
                  {Math.min((currentPage - 1) * itemsPerPage + 1, sortedSurecler.length)}-{Math.min(currentPage * itemsPerPage, sortedSurecler.length)}
                </span>{' '}
                arası gösteriliyor
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200 transition duration-150"
                  title="Önceki Sayfa"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {getPageNumbers().map((pageNum, index) => {
                  if (pageNum === '...') {
                    return (
                      <span
                        key={`ellipsis-${index}`}
                        className="inline-flex h-8 w-8 items-center justify-center text-xs font-bold text-slate-400"
                      >
                        ...
                      </span>
                    )
                  }

                  const page = pageNum as number
                  const isCurrent = page === currentPage

                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition duration-150 ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700 dark:bg-blue-600 dark:text-white'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {page}
                    </button>
                  )
                })}

                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-200 transition duration-150"
                  title="Sonraki Sayfa"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}

        {success ? (
          <div className="flex items-center gap-2 px-6 pb-4 pt-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
            {success}
          </div>
        ) : null}
        {error ? (
          <div className="flex items-center gap-2 px-6 pb-4 pt-3 text-xs font-bold text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-3.5 w-3.5" />
            {error}
          </div>
        ) : null}
      </section>

      {/* KPI Performance Section */}
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:col-span-2 hover:shadow-md transition-all duration-200">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Haftalık Raporlama Performansı</h3>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">Rapor oluşturma ve indirme işlemlerindeki hız ve başarı oranı bu hafta artış gösterdi.</p>
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">İşlem Başarı Oranı</span>
              <span className="text-sm font-extrabold text-blue-700 dark:text-blue-400">%72</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width: '72%' }} />
            </div>
          </div>
        </article>
        
        <article className="rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 p-6 text-white shadow-md shadow-red-500/10 hover:shadow-lg transition-all duration-200 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-extrabold">Kritik SLA Uyarıları</h3>
            <p className="mt-2 text-xs text-rose-100 leading-relaxed">SLA süresi dolmak üzere olan ve acil indirilmesi gereken aktif süreç raporları bulunmaktadır.</p>
          </div>
          <button 
            type="button" 
            className="mt-6 w-full rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur px-4 py-2.5 text-xs font-bold text-white transition active:scale-[0.98]"
          >
            Hemen İncele
          </button>
        </article>
      </section>
    </div>
  )
}
