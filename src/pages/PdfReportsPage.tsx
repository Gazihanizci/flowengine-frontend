import { useState } from 'react'
import axios from 'axios'
import { downloadPdfBySurecId } from '../services/pdfApi'

export default function PdfReportsPage() {
  const [surecIdInput, setSurecIdInput] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleDownload = async () => {
    const surecId = Number(surecIdInput)
    if (!surecId || Number.isNaN(surecId)) {
      setError('Lutfen gecerli bir surec_id girin.')
      return
    }

    setDownloading(true)
    setError(null)
    setSuccess(null)
    try {
      await downloadPdfBySurecId(surecId)
      setSuccess(`PDF olusturuldu ve indirildi. Surec: ${surecId}`)
    } catch (requestError) {
      const message = axios.isAxiosError(requestError)
        ? requestError.response?.data?.message || requestError.message
        : requestError instanceof Error
          ? requestError.message
          : 'PDF olusturma/indirme basarisiz.'
      setError(String(message))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">PDF Rapor</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Surec_id ile PDF Indir</h1>
        <p className="mt-2 text-sm text-slate-600">
          surec_id degerini manuel girip <code>/api/pdf/generate/{'{surecId}'}</code> endpointi ile raporu indirebilirsin.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor="surec-id-input">
              surec_id
            </label>
            <input
              id="surec-id-input"
              type="number"
              min={1}
              value={surecIdInput}
              onChange={(event) => setSurecIdInput(event.target.value)}
              disabled={downloading}
              placeholder="Orn: 104"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
            />
          </div>

          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
          >
            {downloading ? 'PDF olusturuluyor...' : 'PDF Indir'}
          </button>
        </div>

        {success ? <p className="mt-4 text-sm text-emerald-700">{success}</p> : null}
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      </div>
    </div>
  )
}
