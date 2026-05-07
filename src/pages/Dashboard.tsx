import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchFlowDetail, fetchFlows, startFlow } from '../services/flowApi'
import type { FlowDetailResponse, FlowListItem } from '../services/flowApi'
import { useUserStore } from '../store/userStore'

function toErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return fallback
}

export default function Dashboard() {
  const navigate = useNavigate()
  const user = useUserStore((state) => state.user)
  const isLoaded = useUserStore((state) => state.isLoaded)
  const isAdmin = user?.rolId === 4

  const [flows, setFlows] = useState<FlowListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFlowId, setSelectedFlowId] = useState<number | null>(null)
  const [flowDetail, setFlowDetail] = useState<FlowDetailResponse | null>(null)
  const [activeStepId, setActiveStepId] = useState<number | null>(null)
  const [flowStartLoading, setFlowStartLoading] = useState(false)
  const [flowStartError, setFlowStartError] = useState<string | null>(null)
  const [flowStartSuccess, setFlowStartSuccess] = useState<string | null>(null)
  const [flowSearchTerm, setFlowSearchTerm] = useState('')
  const [flowQuickFilter, setFlowQuickFilter] = useState<'ALL' | 'SHORT' | 'LONG'>('ALL')

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchFlows()
        if (mounted) {
          setFlows(data)
          if (data.length > 0) {
            setSelectedFlowId((prev) => prev ?? data[0].akisId)
          }
        }
      } catch {
        if (mounted) {
          setError('AkÄ±ÅŸ listesi alÄ±namadÄ±.')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!isAdmin || selectedFlowId === null) return

    const loadDetail = async () => {
      setFlowDetail(null)
      try {
        const data = await fetchFlowDetail(selectedFlowId)
        setFlowDetail(data)
        setActiveStepId(data.steps[0]?.stepId ?? null)
      } catch {
        // keep layout visible even if detail fetch fails
      }
    }

    loadDetail()
  }, [isAdmin, selectedFlowId])

  const selectedFlow = useMemo(
    () => flows.find((flow) => flow.akisId === selectedFlowId) ?? null,
    [flows, selectedFlowId],
  )

  const totalFieldCount = useMemo(
    () => flowDetail?.steps.reduce((sum, step) => sum + step.fields.length, 0) ?? 0,
    [flowDetail],
  )

  const filteredFlows = useMemo(() => {
    const normalizedSearch = flowSearchTerm.trim().toLocaleLowerCase('tr-TR')
    return flows.filter((flow) => {
      const baseMatch =
        !normalizedSearch ||
        flow.akisAdi.toLocaleLowerCase('tr-TR').includes(normalizedSearch) ||
        String(flow.akisId).includes(normalizedSearch) ||
        (flow.aciklama ?? '').toLocaleLowerCase('tr-TR').includes(normalizedSearch)

      if (!baseMatch) return false
      if (flowQuickFilter === 'SHORT') return flow.akisAdi.trim().length <= 12
      if (flowQuickFilter === 'LONG') return flow.akisAdi.trim().length > 12
      return true
    })
  }, [flows, flowQuickFilter, flowSearchTerm])

  const handleStartFlow = async () => {
    if (!selectedFlowId) return

    setFlowStartLoading(true)
    setFlowStartError(null)
    setFlowStartSuccess(null)

    try {
      const response = await startFlow({ akisId: selectedFlowId })
      setFlowStartSuccess(
        response?.mesaj || `AkÄ±ÅŸ baÅŸlatÄ±ldÄ±: ${selectedFlow?.akisAdi ?? `#${selectedFlowId}`}`,
      )
    } catch (error) {
      setFlowStartError(toErrorMessage(error, 'AkÄ±ÅŸ baÅŸlatÄ±lamadÄ±.'))
    } finally {
      setFlowStartLoading(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="dashboard">
        <div className="dashboard-shell">
          <p className="hint">KullanÄ±cÄ± bilgileri yÃ¼kleniyor...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="dashboard">
        <div className="dashboard-shell">
          <section className="panel dashboard-user-hero">
            <div className="dashboard-user-hero-main">
              <p className="dashboard-user-kicker">Operational Workspace</p>
              <h1>Workflow Dashboard</h1>
              <p>Görevlerini, bildirimlerini ve akış başlatma adımlarını tek ekrandan yonet.</p>
            </div>
            <div className="dashboard-user-hero-meta">
              <span>Toplam akış: {flows.length}</span>
              <span>Seçili ID: {selectedFlowId ?? '-'}</span>
              <span>Kullanıcı: {user?.adSoyad ?? 'Bilinmiyor'}</span>
            </div>
          </section>

          <section className="dashboard-user-grid">
            <article className="panel dashboard-user-card dashboard-user-card-task">
              <h2>Görevler</h2>
              <p className="hint">Atanan görevleri gör, formu doldur ve aksiyon al.</p>
              <div className="dashboard-user-card-actions">
                <button className="button primary" type="button" onClick={() => navigate('/tasks')}>
                  Görevler Sayfasına Git
                </button>
              </div>
            </article>

            <article className="panel dashboard-user-card dashboard-user-card-notification">
              <h2>Bildirimler</h2>
              <p className="hint">Onay/reddet işlemleri ve bildirim akışını ayrı panelden yonet.</p>
              <div className="dashboard-user-card-actions">
                <button className="button primary" type="button" onClick={() => navigate('/notifications')}>
                  Bildirimler Sayfasına Git
                </button>
              </div>
            </article>

            <article className="panel user-flow-start-panel">
              <div className="user-flow-start-hero">
                <p className="user-flow-start-kicker">Quick Start</p>
                <h2>Akış Başlat</h2>
                <p>Admin panelindeki gibi akış seçip yeni süreç başlatın.</p>
              </div>

              <div className="user-flow-start-body">
                <label className="user-flow-start-label" htmlFor="flow-select-user">
                  Akış seçimi
                </label>
                <div className="user-flow-start-select-wrap">
                  <select
                    id="flow-select-user"
                    className="input user-flow-start-select"
                    value={selectedFlowId ?? ''}
                    onChange={(event) => setSelectedFlowId(Number(event.target.value))}
                    disabled={loading || flows.length === 0}
                  >
                    {flows.length === 0 ? <option value="">Akış bulunamadı</option> : null}
                    {flows.map((flow) => (
                      <option key={flow.akisId} value={flow.akisId}>
                        #{flow.akisId} - {flow.akisAdi}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="user-flow-start-meta">
                  <span>Toplam akış: {flows.length}</span>
                  <span>Seçili ID: {selectedFlowId ?? '-'}</span>
                </div>

                {error ? <p className="error-text">{error}</p> : null}
                {flowStartError ? <p className="error-text">{flowStartError}</p> : null}
                {flowStartSuccess ? <p className="success-text">{flowStartSuccess}</p> : null}

                <button
                  className="button user-flow-start-button"
                  type="button"
                  onClick={handleStartFlow}
                  disabled={!selectedFlowId || flowStartLoading || loading}
                >
                  {flowStartLoading ? 'Başlatılıyor...' : 'Flow Başlat'}
                </button>
              </div>
            </article>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="dashboard-shell space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Operational Workspace</p>
              <h1 className="text-xl font-bold text-slate-900">Akış Paneli</h1>
              <p className="mt-2 text-lg text-slate-600">Aktif iş akışlarını yönetin ve yeni operasyonel süreçler başlatın.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                type="button"
                onClick={() => selectedFlowId && navigate(`/flow-edit/${selectedFlowId}`)}
                disabled={!selectedFlowId}
              >
                Akışı Düzenle
              </button>
              <button className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800" type="button" onClick={() => navigate('/create-flow')}>
                Yeni Akış Oluştur
              </button>
            </div>
          </div>
        </section>

        {flowStartError ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{flowStartError}</p> : null}
        {flowStartSuccess ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{flowStartSuccess}</p> : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-600">Filtrele:</span>
              {(['ALL', 'SHORT', 'LONG'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFlowQuickFilter(key)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium ${flowQuickFilter === key ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}
                >
                  {key === 'ALL' ? 'Tümü' : key === 'SHORT' ? 'Kısa' : 'Uzun'}
                </button>
              ))}
            </div>
            <input
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              type="search"
              value={flowSearchTerm}
              placeholder="Akış ara..."
              onChange={(event) => setFlowSearchTerm(event.target.value)}
            />
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.7fr_1.15fr]">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-2xl font-semibold text-slate-900">Akış Listesi</h2>
              <span className="text-sm font-semibold text-slate-600">{filteredFlows.length} Aktif Kayıt</span>
            </div>
            <div className="max-h-[560px] space-y-2 overflow-y-auto p-3">
              {loading ? <p className="px-2 py-3 text-sm text-slate-500">Yükleniyor...</p> : null}
              {error ? <p className="px-2 py-3 text-sm text-rose-700">{error}</p> : null}
              {!loading && !error && filteredFlows.map((flow) => (
                <button
                  key={flow.akisId}
                  type="button"
                  onClick={() => setSelectedFlowId(flow.akisId)}
                  className={`w-full rounded-xl border p-4 text-left transition ${selectedFlowId === flow.akisId ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xl font-semibold text-slate-900">{flow.akisAdi}</p>
                      <p className="mt-1 text-sm text-slate-600">{flow.aciklama || 'Açıklama bulunmuyor.'}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${flow.akisAdi.length > 12 ? 'bg-slate-200 text-slate-700' : 'bg-blue-600 text-white'}`}>
                      {flow.akisAdi.length > 12 ? 'Taslak' : 'Aktif'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Detaylı Görünüm</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-900">{selectedFlow?.akisAdi ?? 'Akış seçiniz'}</h3>
              <p className="mt-2 text-sm text-slate-600">{selectedFlow?.aciklama || 'Seçilen akışın açıklaması burada görünür.'}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-100 p-3 text-center">
                  <p className="text-xs font-semibold uppercase text-slate-500">Adım Sayısı</p>
                  <p className="text-xl font-bold text-blue-700">{flowDetail?.steps.length ?? 0}</p>
                </div>
                <div className="rounded-xl bg-slate-100 p-3 text-center">
                  <p className="text-xs font-semibold uppercase text-slate-500">Toplam Alan</p>
                  <p className="text-xl font-bold text-blue-700">{totalFieldCount}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Süreç Adımları</p>
                <div className="mt-2 space-y-2">
                  {(flowDetail?.steps ?? []).slice(0, 4).map((step, index) => (
                    <button key={step.stepId} type="button" onClick={() => setActiveStepId(step.stepId)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-sm ${activeStepId === step.stepId ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}>
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold">{index + 1}</span>
                      <span>{step.stepName}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <button
                className="w-full rounded-xl bg-blue-700 px-4 py-3 text-base font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                type="button"
                onClick={handleStartFlow}
                disabled={!selectedFlowId || flowStartLoading}
              >
                {flowStartLoading ? 'Akış Başlatılıyor...' : 'Akışı Başlat'}
              </button>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="button" onClick={() => selectedFlowId && navigate(`/preview/${selectedFlowId}`)} disabled={!selectedFlowId}>
                  Raporlar
                </button>
                <button className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" type="button" onClick={() => selectedFlowId && navigate(`/flow-edit/${selectedFlowId}`)} disabled={!selectedFlowId}>
                  Paylaş
                </button>
              </div>
            </section>
          </div>
        </section>

      </div>
    </div>
  )
}


