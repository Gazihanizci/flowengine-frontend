import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
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

export default function PdfReportsPage() {
  const [surecler, setSurecler] = useState<SurecListItem[]>([])
  const [selectedSurecId, setSelectedSurecId] = useState<number | null>(null)
  const [flowNameFilter, setFlowNameFilter] = useState('')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name_asc' | 'name_desc'>('date_desc')
  const [loadingSurecler, setLoadingSurecler] = useState(false)
  const [downloading, setDownloading] = useState(false)
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
        if (prev && list.some((item) => item.surecId === prev)) {
          return prev
        }
        return list[0]?.surecId ?? null
      })
    } catch (requestError) {
      const message = axios.isAxiosError(requestError)
        ? requestError.response?.data?.message || requestError.message
        : requestError instanceof Error
          ? requestError.message
          : 'Süreçler listesi alınamadı.'
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
      if (sortBy === 'name_asc') {
        return left.akisAdi.localeCompare(right.akisAdi, 'tr-TR')
      }

      if (sortBy === 'name_desc') {
        return right.akisAdi.localeCompare(left.akisAdi, 'tr-TR')
      }

      const leftDate = parseBaslamaTarihi(left.baslamaTarihi)?.getTime() ?? 0
      const rightDate = parseBaslamaTarihi(right.baslamaTarihi)?.getTime() ?? 0

      return sortBy === 'date_asc' ? leftDate - rightDate : rightDate - leftDate
    })

    return list
  }, [filteredSurecler, sortBy])

  const handleDownload = async (surecId?: number) => {
    const targetSurecId = surecId ?? selectedSurecId
    if (!targetSurecId) {
      setError('Lütfen önce listeden bir süreç seçin.')
      return
    }

    setDownloading(true)
    setError(null)
    setSuccess(null)

    try {
      await downloadPdfBySurecId(targetSurecId)
      setSuccess(`PDF oluşturma tamamlandı ve indirildi. Süreç: ${targetSurecId}`)
    } catch (requestError) {
      const message = axios.isAxiosError(requestError)
        ? requestError.response?.data?.message || requestError.message
        : requestError instanceof Error
          ? requestError.message
          : 'PDF oluşturma/indirme başarısız.'
      setError(String(message))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">PDF Rapor</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Süreç Listesinden PDF İndir</h1>
        <p className="mt-2 text-sm text-slate-600">
          `/api/surecler` listesinden bir süreç seçilir, seçilen kaydın `surecId` değeri ile
          <code> /api/pdf/generate/{'{surecId}'}</code> endpointine istek atılıp PDF indirilir.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Akis adi</span>
            <input
              type="text"
              value={flowNameFilter}
              onChange={(event) => setFlowNameFilter(event.target.value)}
              placeholder="Akis adinda ara"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Başlangıç tarihi</span>
            <input
              type="date"
              value={startDateFilter}
              onChange={(event) => setStartDateFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Bitiş tarihi</span>
            <input
              type="date"
              value={endDateFilter}
              onChange={(event) => setEndDateFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Sıralama</span>
            <select
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value as 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc')
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            >
              <option value="date_desc">Tarih (Yeni - Eski)</option>
              <option value="date_asc">Tarih (Eski - Yeni)</option>
              <option value="name_asc">Alfabetik (A - Z)</option>
              <option value="name_desc">Alfabetik (Z - A)</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={loadSurecler}
              disabled={loadingSurecler}
              className="w-full rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loadingSurecler ? 'Yenileniyor...' : 'Listeyi Yenile'}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Süreçler ({sortedSurecler.length})</p>
          <p className="text-xs text-slate-500">Kayda tıklayın, indirme butonu satrın icinde açılsın.</p>
        </div>

        {loadingSurecler ? (
          <p className="text-sm text-slate-500">Süreçler yükleniyor...</p>
        ) : sortedSurecler.length === 0 ? (
          <p className="text-sm text-slate-500">Filtreye uygun süreç bulunamadı.</p>
        ) : (
          <div className="space-y-3">
            {sortedSurecler.map((surec) => {
              const isSelected = selectedSurecId === surec.surecId
              return (
                <div
                  key={surec.surecId}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedSurecId(surec.surecId)
                    setError(null)
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedSurecId(surec.surecId)
                      setError(null)
                    }
                  }}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    isSelected
                      ? 'border-cyan-300 bg-cyan-50 shadow-[0_8px_20px_rgba(8,145,178,0.12)]'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      #{surec.surecId} - {surec.akisAdi}
                    </p>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                      {surec.baslamaTarihi}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{surec.akisAciklama || '-'}</p>
                  {isSelected ? (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          void handleDownload(surec.surecId)
                        }}
                        disabled={downloading}
                        className="inline-flex items-center rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                      >
                        {downloading ? 'PDF oluşturuluyor...' : 'PDF İndir'}
                      </button>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}

        {selectedSurecId ? (
          <p className="mt-4 text-sm text-slate-600">
            Seçili süreç id: <strong>{selectedSurecId}</strong>
          </p>
        ) : null}

        {success ? <p className="mt-4 text-sm text-emerald-700">{success}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      </div>
    </div>
  )
}
