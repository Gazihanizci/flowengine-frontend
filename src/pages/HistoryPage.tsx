import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
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

  const actionOptions = useMemo(() => {
    return Array.from(new Set(history.map((item) => item.aksiyon))).sort((a, b) => a.localeCompare(b, 'tr'))
  }, [history])

  const filteredHistory = useMemo(() => {
    const flowQuery = flowFilter.trim().toLocaleLowerCase('tr-TR')
    const stepQuery = stepFilter.trim().toLocaleLowerCase('tr-TR')
    const contentQuery = contentFilter.trim().toLocaleLowerCase('tr-TR')
    const surecIdQuery = surecIdFilter.trim()

    return history.filter((item) => {
      if (flowQuery && !item.akisAdi.toLocaleLowerCase('tr-TR').includes(flowQuery)) {
        return false
      }

      if (actionFilter && item.aksiyon !== actionFilter) {
        return false
      }

      if (stepQuery && !item.adimAdi.toLocaleLowerCase('tr-TR').includes(stepQuery)) {
        return false
      }

      if (surecIdQuery && String(item.surecId) !== surecIdQuery) {
        return false
      }

      const formIcerikText = String(item.formIcerik ?? '').toLocaleLowerCase('tr-TR')
      const aciklamaText = String(item.aciklama ?? '').toLocaleLowerCase('tr-TR')
      if (contentQuery && !formIcerikText.includes(contentQuery) && !aciklamaText.includes(contentQuery)) {
        return false
      }

      return inDateRange(parseHistoryDate(item.tarih), startDateFilter, endDateFilter)
    })
  }, [history, flowFilter, actionFilter, stepFilter, surecIdFilter, contentFilter, startDateFilter, endDateFilter])

  const detailLines = useMemo(() => {
    if (!selectedItem?.formIcerik) return []

    return selectedItem.formIcerik
      .split('|')
      .map((part) => part.trim())
      .filter(Boolean)
  }, [selectedItem])

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">History</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Yaptigim Islemler</h1>
        <p className="mt-2 text-sm text-slate-600">
          `/api/history/my` kaydına göre kullanıcının tüm onay/red/işlem geçmişi burada listelenir.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Akış adı</span>
            <input
              type="text"
              value={flowFilter}
              onChange={(event) => setFlowFilter(event.target.value)}
              placeholder="Akış adında ara"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Aksiyon</span>
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            >
              <option value="">Tüm aksiyonlar</option>
              {actionOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Adım adı</span>
            <input
              type="text"
              value={stepFilter}
              onChange={(event) => setStepFilter(event.target.value)}
              placeholder="Adım adında ara"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Süreç ID</span>
            <input
              type="number"
              min={1}
              value={surecIdFilter}
              onChange={(event) => setSurecIdFilter(event.target.value)}
              placeholder="Orn: 119"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <label className="block xl:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Form içeriğinde ara</span>
            <input
              type="text"
              value={contentFilter}
              onChange={(event) => setContentFilter(event.target.value)}
              placeholder="Metin içeriğinde arama"
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
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadHistory}
            disabled={loading}
            className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? 'Yükleniyor...' : 'Listeyi Yenile'}
          </button>
          <button
            type="button"
            onClick={() => {
              setFlowFilter('')
              setActionFilter('')
              setStepFilter('')
              setSurecIdFilter('')
              setContentFilter('')
              setStartDateFilter('')
              setEndDateFilter('')
            }}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Filtreleri Temizle
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Kayıtlar ({filteredHistory.length})</p>
        </div>

        {error ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-slate-500">İşlem geçmişi yükleniyor...</p>
        ) : filteredHistory.length === 0 ? (
          <p className="text-sm text-slate-500">Filtreye uygun kayıt bulunamadı.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredHistory.map((item, index) => (
              <button
                key={`${item.surecId}-${item.tarih}-${item.aksiyon}-${index}`}
                type="button"
                onClick={() => setSelectedItem(item)}
                className="group rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-cyan-50 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-[0_12px_30px_rgba(8,145,178,0.15)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">
                    #{item.surecId} - {item.akisAdi}
                  </p>
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-sm">
                    {item.tarih}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-700">{item.adimAdi}</span>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      item.aksiyon.toLocaleUpperCase('tr-TR').includes('RED')
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {item.aksiyon}
                  </span>
                </div>

                <p className="mt-3 line-clamp-2 text-sm text-slate-700">{item.formIcerik?.trim() || '-'}</p>
                {item.aciklama?.trim() ? (
                  <p className="mt-2 line-clamp-2 text-sm text-rose-700">
                    <span className="font-semibold">İptal Açıklaması:</span> {item.aciklama.trim()}
                  </p>
                ) : null}
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-cyan-700 group-hover:text-cyan-800">
                  Detay kutucuğunu açmak için tıkla
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedItem ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.35)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Islem Detayi</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  #{selectedItem.surecId} - {selectedItem.akisAdi}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{selectedItem.tarih}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Kapat
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700">Adım</p>
                <p className="mt-1 text-sm font-semibold text-cyan-900">{selectedItem.adimAdi}</p>
              </div>
              <div
                className={`rounded-xl border p-3 ${
                  selectedItem.aksiyon.toLocaleUpperCase('tr-TR').includes('RED')
                    ? 'border-rose-200 bg-rose-50'
                    : 'border-emerald-200 bg-emerald-50'
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Aksiyon</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{selectedItem.aksiyon}</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Form İçeriği</p>
              {detailLines.length > 0 ? (
                <ul className="space-y-2">
                  {detailLines.map((line, idx) => (
                    <li key={`${line}-${idx}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                      {line}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Bu kayıt için form içeriği bulunamadı.</p>
              )}
            </div>

            {(selectedItem.aksiyon.toLocaleUpperCase('tr-TR').includes('RED') ||
              selectedItem.aksiyon.toLocaleUpperCase('tr-TR').includes('IPTAL')) &&
            selectedItem.aciklama?.trim() ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-rose-700">İptal Açıklaması</p>
                <p className="text-sm text-rose-900">{selectedItem.aciklama.trim()}</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
