import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Search } from 'lucide-react'
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
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-4xl font-semibold text-slate-900">Islem Gecmisi</h1>
        <p className="mt-2 text-sm text-slate-600">Tum is akis sureclerini ve gecmis loglari buradan takip edebilirsiniz.</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">Gelismis Filtreleme</p>
          <button
            type="button"
            className="text-xs font-semibold text-blue-600"
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

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Islem Adi</span>
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
              <option value="">Tum islemler</option>
              {actionOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>

          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Adim Adi</span>
            <input value={stepFilter} onChange={(e) => setStepFilter(e.target.value)} placeholder="orn: Finans Onayi" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </label>

          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Process ID</span>
            <input value={surecIdFilter} onChange={(e) => setSurecIdFilter(e.target.value)} placeholder="PRC-00000" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </label>

          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Tarih Araligi</span>
            <input type="date" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </label>

          <label className="xl:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Akis adi</span>
            <input value={flowFilter} onChange={(e) => setFlowFilter(e.target.value)} placeholder="Akis adinda ara" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </label>

          <label className="xl:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Aciklama / Not</span>
            <div className="relative">
              <input value={contentFilter} onChange={(e) => setContentFilter(e.target.value)} placeholder="Not veya icerikte ara" className="w-full rounded-xl border border-slate-300 py-2 pl-3 pr-9 text-sm" />
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </label>
        </div>

        <div className="mt-4 flex justify-end">
          <button type="button" onClick={loadHistory} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
            <Search className="h-4 w-4" /> Kayitlari Sorgula
          </button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold tracking-wide text-slate-500">TOPLAM ISLEM</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{filteredHistory.length.toLocaleString('tr-TR')}</p>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold tracking-wide text-emerald-700">ONAYLANAN</p>
          <p className="mt-1 text-3xl font-bold text-emerald-700">{approvedCount.toLocaleString('tr-TR')}</p>
        </article>
        <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs font-semibold tracking-wide text-rose-700">REDDEDILEN</p>
          <p className="mt-1 text-3xl font-bold text-rose-700">{rejectedCount.toLocaleString('tr-TR')}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Kayitlar</h2>
          <span className="text-xs text-slate-500">Siralama: En Yeni Once</span>
        </div>

        {error ? <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-slate-500">Yukleniyor...</p>
        ) : pageItems.length === 0 ? (
          <p className="text-sm text-slate-500">Kayit bulunamadi.</p>
        ) : (
          <div className="space-y-2">
            {pageItems.map((item, index) => {
              const rejected = item.aksiyon.toLocaleUpperCase('tr-TR').includes('RED')
              return (
                <button
                  key={`${item.surecId}-${item.tarih}-${item.aksiyon}-${index}`}
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className="w-full rounded-xl border border-slate-200 bg-white text-left transition hover:border-slate-300"
                >
                  <div className="grid gap-3 p-3 md:grid-cols-[1.25fr_1.8fr_220px]">
                    <div className="border-slate-200 md:border-r md:pr-3">
                      <p className="text-xs font-semibold text-blue-700">PRC-{item.surecId}</p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">{item.akisAdi}</p>
                      <p className="mt-1 text-xs text-slate-500">Tip: Ofis Ekipmani</p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Aktif Adim</p>
                      <p className="text-sm font-semibold text-slate-900">{item.adimAdi}</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Aciklama / Not</p>
                      <p className="text-sm text-slate-700 line-clamp-2">{item.formIcerik || item.aciklama || '-'}</p>
                    </div>

                    <div className="flex items-start justify-end gap-3">
                      <div className="flex flex-col items-end gap-2">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${rejected ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {rejected ? 'Reddedildi' : 'Onaylandi'}
                        </span>
                        <p className="text-right text-xs text-slate-600">{item.tarih}</p>
                      </div>
                      <span className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600">Detay</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-xs text-slate-500">
          <p>
            Toplam {filteredHistory.length.toLocaleString('tr-TR')} kayittan {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredHistory.length)} arasi gosteriliyor
          </p>
          <div className="flex items-center gap-1">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40">{'<'}</button>
            <span className="rounded-md bg-blue-600 px-2 py-1 font-semibold text-white">{page}</span>
            <span>/ {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded-md border border-slate-300 px-2 py-1 disabled:opacity-40">{'>'}</button>
          </div>
        </div>
      </section>

      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" onClick={() => setSelectedItem(null)}>
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.35)]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Islem Detayi</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">#{selectedItem.surecId} - {selectedItem.akisAdi}</h2>
                <p className="mt-1 text-sm text-slate-500">{selectedItem.tarih}</p>
              </div>
              <button type="button" onClick={() => setSelectedItem(null)} className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50">Kapat</button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700">Adim</p>
                <p className="mt-1 text-sm font-semibold text-cyan-900">{selectedItem.adimAdi}</p>
              </div>
              <div className={`rounded-xl border p-3 ${selectedItem.aksiyon.toLocaleUpperCase('tr-TR').includes('RED') ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Aksiyon</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{selectedItem.aksiyon}</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Form Icerigi</p>
              {detailLines.length > 0 ? (
                <ul className="space-y-2">
                  {detailLines.map((line, idx) => (
                    <li key={`${line}-${idx}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Bu kayit icin form icerigi bulunamadi.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
