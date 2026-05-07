import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { FileText, Clock3, Database, Zap, Search, CalendarDays } from 'lucide-react'
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
          : 'Surecler listesi alinamadi.'
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
      setError('Lutfen once listeden bir surec secin.')
      return
    }

    setDownloadingId(targetSurecId)
    setError(null)
    setSuccess(null)

    try {
      await downloadPdfBySurecId(targetSurecId)
      setSuccess(`PDF hazirlandi ve indirildi. Surec: ${targetSurecId}`)
    } catch (requestError) {
      const message = axios.isAxiosError(requestError)
        ? requestError.response?.data?.message || requestError.message
        : requestError instanceof Error
          ? requestError.message
          : 'PDF olusturma/indirme basarisiz.'
      setError(String(message))
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">PDF Rapor</p>
        <h1 className="mt-2 text-5xl font-bold tracking-tight text-slate-900">Surec Listesinden PDF Indir</h1>
        <p className="mt-4 max-w-5xl text-3xl leading-relaxed text-slate-600">
          `/api/surecler` listesinden bir surec secilir, secilen kaydin `surecId` degeri ile
          <code> /api/pdf/generate/{'{surecId}'}</code> endpointine istek atilip PDF indirilir.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-blue-100 p-3 text-blue-700"><FileText className="h-5 w-5" /></span><p className="text-lg text-slate-600">Toplam Rapor</p></div>
          <p className="mt-2 text-5xl font-bold text-slate-900">{stats.total}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-emerald-100 p-3 text-emerald-700"><Clock3 className="h-5 w-5" /></span><p className="text-lg text-slate-600">Bu Hafta Uretilen</p></div>
          <p className="mt-2 text-5xl font-bold text-slate-900">{stats.thisWeek}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-amber-100 p-3 text-amber-700"><Database className="h-5 w-5" /></span><p className="text-lg text-slate-600">Kullanilan Alan</p></div>
          <p className="mt-2 text-5xl font-bold text-slate-900">{stats.gb} GB</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-violet-100 p-3 text-violet-700"><Zap className="h-5 w-5" /></span><p className="text-lg text-slate-600">Aktif Akislar</p></div>
          <p className="mt-2 text-5xl font-bold text-slate-900">{stats.uniqueFlows}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
          <label className="xl:col-span-3">
            <span className="mb-2 block text-lg font-semibold text-slate-800">Akis Adi</span>
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input type="text" value={flowNameFilter} onChange={(event) => setFlowNameFilter(event.target.value)} placeholder="Akis adinda ara" className="w-full rounded-xl border border-slate-300 px-3 py-2 pl-9 text-sm" /></div>
          </label>
          <label className="xl:col-span-3">
            <span className="mb-2 block text-lg font-semibold text-slate-800">Baslangic Tarihi</span>
            <div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input type="date" value={startDateFilter} onChange={(event) => setStartDateFilter(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 pl-9 text-sm" /></div>
          </label>
          <label className="xl:col-span-3">
            <span className="mb-2 block text-lg font-semibold text-slate-800">Bitis Tarihi</span>
            <div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" /><input type="date" value={endDateFilter} onChange={(event) => setEndDateFilter(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 pl-9 text-sm" /></div>
          </label>
          <label className="xl:col-span-2">
            <span className="mb-2 block text-lg font-semibold text-slate-800">Siralama</span>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value as 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc')} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
              <option value="date_desc">Tarih (Yeni)</option>
              <option value="date_asc">Tarih (Eski)</option>
              <option value="name_asc">A-Z</option>
              <option value="name_desc">Z-A</option>
            </select>
          </label>
          <div className="flex items-end xl:col-span-1">
            <button type="button" onClick={loadSurecler} disabled={loadingSurecler} className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-400">
              {loadingSurecler ? '...' : 'Yenile'}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-2xl font-bold text-slate-900">Surecler ({sortedSurecler.length})</h2>
          <p className="text-sm text-slate-500">Kayda tiklayin, indirme butonu satir icinde acilsin.</p>
        </div>

        {loadingSurecler ? (
          <p className="p-6 text-sm text-slate-500">Surecler yukleniyor...</p>
        ) : sortedSurecler.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Filtreye uygun surec bulunamadi.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3">Rapor Adi & No</th>
                  <th className="px-6 py-3">Aciklama</th>
                  <th className="px-6 py-3">Tarih</th>
                  <th className="px-6 py-3">Dosya Boyutu</th>
                  <th className="px-6 py-3 text-right">Islemler</th>
                </tr>
              </thead>
              <tbody>
                {sortedSurecler.map((surec) => {
                  const isSelected = selectedSurecId === surec.surecId
                  return (
                    <tr key={surec.surecId} className={`border-t border-slate-200 ${isSelected ? 'bg-blue-50/70' : 'bg-white'}`} onClick={() => setSelectedSurecId(surec.surecId)}>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">#{surec.surecId} - {surec.akisAdi}</p>
                        <p className="text-sm text-slate-500">PDF-{surec.surecId}</p>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{surec.akisAciklama || '-'}</td>
                      <td className="px-6 py-4 text-slate-700">{surec.baslamaTarihi}</td>
                      <td className="px-6 py-4 text-slate-700">{toFileSizeLabel(surec.akisAciklama || '')}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleDownload(surec.surecId)
                            }}
                            disabled={downloadingId === surec.surecId}
                            className="rounded-lg border border-blue-600 bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
                          >
                            {downloadingId === surec.surecId ? 'Indiriliyor...' : 'PDF Indir'}
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

        {success ? <p className="px-6 pb-4 pt-3 text-sm text-emerald-700">{success}</p> : null}
        {error ? <p className="px-6 pb-4 pt-3 text-sm text-red-700">{error}</p> : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
          <h3 className="text-3xl font-bold text-slate-900">Haftalik Performans</h3>
          <p className="mt-2 text-lg text-slate-600">Issue cozum sureleri bu hafta iyilesme gosterdi.</p>
          <div className="mt-5 h-3 w-full rounded-full bg-slate-200"><div className="h-full w-[72%] rounded-full bg-blue-600" /></div>
          <p className="mt-2 text-right text-xl font-semibold text-blue-700">%72</p>
        </article>
        <article className="rounded-2xl border border-blue-700 bg-blue-700 p-5 text-white shadow-sm">
          <h3 className="text-3xl font-bold">Kritik Uyarilar</h3>
          <p className="mt-2 text-lg text-blue-100">SLA suresi dolmak uzere olan aktif issue bulunuyor.</p>
          <button type="button" className="mt-4 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white">Hemen Incele</button>
        </article>
      </section>
    </div>
  )
}
