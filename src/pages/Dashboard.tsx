import { Fragment, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchFlowDetail, fetchFlows, startFlow } from '../services/flowApi'
import type { FlowDetailResponse, FlowListItem } from '../services/flowApi'
import { useUserStore } from '../store/userStore'

function resolveLinkedFlowId(step: FlowDetailResponse['steps'][number]) {
  return step.externalFlowId ?? step.subFlowId ?? step.nextFlowId ?? null
}

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
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
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
          setError('Akis listesi alinamadi.')
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
      setDetailError(null)
      setDetailLoading(true)

      try {
        const data = await fetchFlowDetail(selectedFlowId)
        setFlowDetail(data)
        setActiveStepId(data.steps[0]?.stepId ?? null)
      } catch {
        setDetailError('Akis detayi alinamadi.')
      } finally {
        setDetailLoading(false)
      }
    }

    loadDetail()
  }, [isAdmin, selectedFlowId])

  const activeStep = useMemo(() => {
    if (!flowDetail || activeStepId === null) return null
    return flowDetail.steps.find((step) => step.stepId === activeStepId) ?? null
  }, [flowDetail, activeStepId])

  const selectedFlow = useMemo(
    () => flows.find((flow) => flow.akisId === selectedFlowId) ?? null,
    [flows, selectedFlowId],
  )
  const totalFieldCount = useMemo(
    () => flowDetail?.steps.reduce((sum, step) => sum + step.fields.length, 0) ?? 0,
    [flowDetail],
  )
  const selectedStepOrder = useMemo(() => {
    if (!flowDetail || activeStepId === null) return null
    const index = flowDetail.steps.findIndex((step) => step.stepId === activeStepId)
    return index >= 0 ? index + 1 : null
  }, [flowDetail, activeStepId])
  const flowNameById = useMemo(() => {
    const entries = flows.map((flow) => [flow.akisId, flow.akisAdi] as const)
    return new Map<number, string>(entries)
  }, [flows])

  const filteredFlows = useMemo(() => {
    const normalizedSearch = flowSearchTerm.trim().toLocaleLowerCase('tr-TR')

    return flows.filter((flow) => {
      const baseMatch =
        !normalizedSearch ||
        flow.akisAdi.toLocaleLowerCase('tr-TR').includes(normalizedSearch) ||
        String(flow.akisId).includes(normalizedSearch) ||
        (flow.aciklama ?? '').toLocaleLowerCase('tr-TR').includes(normalizedSearch)

      if (!baseMatch) return false

      if (flowQuickFilter === 'SHORT') {
        return flow.akisAdi.trim().length <= 12
      }

      if (flowQuickFilter === 'LONG') {
        return flow.akisAdi.trim().length > 12
      }

      return true
    })
  }, [flows, flowQuickFilter, flowSearchTerm])

  const formatIds = (ids?: number[]) => {
    if (!ids || ids.length === 0) return '-'
    return ids.join(', ')
  }

  const getPermissionIds = (
    field: FlowDetailResponse['steps'][number]['fields'][number],
    tip: 'ROLE' | 'USER',
  ) => {
    if (tip === 'ROLE' && field.roleIds) return field.roleIds
    if (tip === 'USER' && field.userIds) return field.userIds

    return Array.from(
      new Set(
        (field.permissions ?? [])
          .filter((permission) => permission.tip === tip)
          .map((permission) => permission.refId),
      ),
    )
  }

  const handleStartFlow = async () => {
    if (!selectedFlowId) return

    setFlowStartLoading(true)
    setFlowStartError(null)
    setFlowStartSuccess(null)

    try {
      const response = await startFlow({ akisId: selectedFlowId })
      setFlowStartSuccess(
        response?.mesaj || `Akis baslatildi: ${selectedFlow?.akisAdi ?? `#${selectedFlowId}`}`,
      )
    } catch (error) {
      setFlowStartError(toErrorMessage(error, 'Akis baslatilamadi.'))
    } finally {
      setFlowStartLoading(false)
    }
  }

  if (!isLoaded) {
    return (
      <div className="dashboard">
        <div className="dashboard-shell">
          <p className="hint">Kullanici bilgileri yukleniyor...</p>
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
              <p>Gorevlerini, bildirimlerini ve akis baslatma adimlarini tek ekrandan yonet.</p>
            </div>
            <div className="dashboard-user-hero-meta">
              <span>Toplam akis: {flows.length}</span>
              <span>Secili ID: {selectedFlowId ?? '-'}</span>
              <span>Kullanici: {user?.adSoyad ?? 'Bilinmiyor'}</span>
            </div>
          </section>

          <section className="dashboard-user-grid">
            <article className="panel dashboard-user-card dashboard-user-card-task">
              <h2>Gorevler</h2>
              <p className="hint">Atanan gorevleri gor, formu doldur ve aksiyon al.</p>
              <div className="dashboard-user-card-actions">
                <button className="button primary" type="button" onClick={() => navigate('/tasks')}>
                  Gorevler Sayfasina Git
                </button>
              </div>
            </article>

            <article className="panel dashboard-user-card dashboard-user-card-notification">
              <h2>Bildirimler</h2>
              <p className="hint">Onay/reddet islemlerini ve bildirim akisini ayri panelden yonet.</p>
              <div className="dashboard-user-card-actions">
                <button className="button primary" type="button" onClick={() => navigate('/notifications')}>
                  Bildirimler Sayfasina Git
                </button>
              </div>
            </article>

            <article className="panel user-flow-start-panel">
              <div className="user-flow-start-hero">
                <p className="user-flow-start-kicker">Quick Start</p>
                <h2>Akis Baslat</h2>
                <p>Admin panelindeki gibi akis secip yeni surec baslatin.</p>
              </div>

              <div className="user-flow-start-body">
                <label className="user-flow-start-label" htmlFor="flow-select-user">
                  Akis secimi
                </label>
                <div className="user-flow-start-select-wrap">
                  <select
                    id="flow-select-user"
                    className="input user-flow-start-select"
                    value={selectedFlowId ?? ''}
                    onChange={(event) => setSelectedFlowId(Number(event.target.value))}
                    disabled={loading || flows.length === 0}
                  >
                    {flows.length === 0 ? <option value="">Akis bulunamadi</option> : null}
                    {flows.map((flow) => (
                      <option key={flow.akisId} value={flow.akisId}>
                        #{flow.akisId} - {flow.akisAdi}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="user-flow-start-meta">
                  <span>Toplam akis: {flows.length}</span>
                  <span>Secili ID: {selectedFlowId ?? '-'}</span>
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
                  {flowStartLoading ? 'Baslatiliyor...' : 'Flow Baslat'}
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
      <div className="dashboard-shell">
        <div className="dashboard-top">
          <div>
            <h1>Is Akisi Paneli</h1>
            <p>Akislari yonetin, adimlari ve form alanlarini inceleyin.</p>
          </div>
          <div className="header-actions">
            <button
              className="button secondary"
              type="button"
              onClick={handleStartFlow}
              disabled={!selectedFlowId || flowStartLoading}
            >
              {flowStartLoading ? 'Baslatiliyor...' : 'Flow Baslat'}
            </button>
            <button
              className="button primary"
              type="button"
              onClick={() => navigate('/create-flow')}
            >
              Yeni Akis Olustur
            </button>
          </div>
        </div>
        {flowStartError ? <p className="error-text">{flowStartError}</p> : null}
        {flowStartSuccess ? <p className="success-text">{flowStartSuccess}</p> : null}

        <section className="panel dashboard-spotlight">
          <div className="dashboard-spotlight-main">
            <p className="dashboard-spotlight-kicker">Secili Akis</p>
            <h2>{selectedFlow?.akisAdi ?? 'Akis seciniz'}</h2>
            <p>{selectedFlow?.aciklama || 'Secili akis icin aciklama bulunmuyor.'}</p>
          </div>
          <div className="dashboard-spotlight-meta">
            <div>
              <span>Akis ID</span>
              <strong>{selectedFlow?.akisId ?? '-'}</strong>
            </div>
            <div>
              <span>Toplam Adim</span>
              <strong>{flowDetail?.steps.length ?? 0}</strong>
            </div>
            <div>
              <span>Toplam Alan</span>
              <strong>{totalFieldCount}</strong>
            </div>
          </div>
        </section>

        <div className="dashboard-stats">
          <div className="stat-card">
            <span>Toplam Akis</span>
            <strong>{flows.length}</strong>
          </div>
          <div className="stat-card">
            <span>Toplam Adim</span>
            <strong>{flowDetail?.steps.length ?? 0}</strong>
          </div>
          <div className="stat-card">
            <span>Toplam Alan</span>
            <strong>{totalFieldCount}</strong>
          </div>
        </div>

        <div className="dashboard-grid">
          <section className="panel flow-list-panel">
            <div className="panel-header">
              <h2>Akislar</h2>
              <span>{filteredFlows.length} / {flows.length} kayit</span>
            </div>
            <p className="panel-subtitle">Detayini incelemek istediginiz akis kaydini secin.</p>

            <div className="flow-list-toolbar">
              <label className="flow-search">
                <span>Akis Ara</span>
                <input
                  className="input"
                  type="search"
                  value={flowSearchTerm}
                  placeholder="ID, akis adi veya aciklama..."
                  onChange={(event) => setFlowSearchTerm(event.target.value)}
                />
              </label>
              <div className="flow-filter-chips">
                <button
                  type="button"
                  className={`flow-filter-chip ${flowQuickFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setFlowQuickFilter('ALL')}
                >
                  Tumu
                </button>
                <button
                  type="button"
                  className={`flow-filter-chip ${flowQuickFilter === 'SHORT' ? 'active' : ''}`}
                  onClick={() => setFlowQuickFilter('SHORT')}
                >
                  Kisa Isim
                </button>
                <button
                  type="button"
                  className={`flow-filter-chip ${flowQuickFilter === 'LONG' ? 'active' : ''}`}
                  onClick={() => setFlowQuickFilter('LONG')}
                >
                  Uzun Isim
                </button>
              </div>
            </div>

            {loading && <p className="hint">Yukleniyor...</p>}
            {error && <p className="error-text">{error}</p>}

            {!loading && !error && filteredFlows.length === 0 && (
              <p className="hint">
                {flows.length === 0 ? 'Henuz kayitli akis yok.' : 'Arama kriterine uygun akis bulunamadi.'}
              </p>
            )}

            {!loading && !error && filteredFlows.length > 0 && (
              <div className="flow-list-scroll">
                <div className="flow-list-head">
                  <span>ID</span>
                  <span>Akis Adi</span>
                  <span>Aciklama</span>
                </div>
                <div className="flow-list">
                  {filteredFlows.map((flow) => (
                    <button
                      key={flow.akisId}
                      className={`flow-row ${selectedFlowId === flow.akisId ? 'selected' : ''}`}
                      type="button"
                      onClick={() => setSelectedFlowId(flow.akisId)}
                    >
                      <span>{flow.akisId}</span>
                      <span>{flow.akisAdi}</span>
                      <span>{flow.aciklama || '-'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="panel flow-detail-panel">
            <div className="panel-header">
              <h2>Akis Detayi</h2>
              <div className="panel-actions">
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => {
                    if (selectedFlowId) {
                      navigate(`/preview/${selectedFlowId}`)
                    }
                  }}
                  disabled={!selectedFlowId}
                >
                  Onizleme
                </button>
              </div>
              {flowDetail && (
                <span className={`flow-status ${flowDetail.steps.length ? 'active' : 'passive'}`}>
                  {flowDetail.steps.length ? 'Adimlar Var' : 'Adim Yok'}
                </span>
              )}
            </div>

            {detailLoading && <p className="hint">Detay yukleniyor...</p>}
            {detailError && <p className="error-text">{detailError}</p>}

            {!detailLoading && !detailError && flowDetail && (
              <div className="flow-summary">
                <div>
                  <h3>{flowDetail.flowName}</h3>
                  <p>{flowDetail.aciklama}</p>
                </div>
                <div className="summary-meta">
                  <div>
                    <span>Akis ID</span>
                    <strong>{flowDetail.flowId}</strong>
                  </div>
                  <div>
                    <span>Adim Sayisi</span>
                    <strong>{flowDetail.steps.length}</strong>
                  </div>
                  <div>
                    <span>Aktif Adim</span>
                    <strong>{selectedStepOrder ?? '-'}</strong>
                  </div>
                  <div>
                    <span>Alan Sayisi</span>
                    <strong>{totalFieldCount}</strong>
                  </div>
                </div>
              </div>
            )}

            {!detailLoading && !detailError && flowDetail && (
              <div className="step-tabs">
                {flowDetail.steps.map((step, index) => {
                  const linkedFlowId =
                    step.externalFlowEnabled === false ? null : resolveLinkedFlowId(step)
                  const linkedFlowName = linkedFlowId ? flowNameById.get(linkedFlowId) : null
                  const hasNextStep = index < flowDetail.steps.length - 1

                  return (
                    <Fragment key={step.stepId}>
                      <button
                        className={`step-tab ${activeStepId === step.stepId ? 'active' : ''}`}
                        type="button"
                        onClick={() => setActiveStepId(step.stepId)}
                      >
                        {step.stepName}
                      </button>
                      {hasNextStep && linkedFlowId ? (
                        <button
                          className="embedded-flow-pill"
                          type="button"
                          onClick={() => navigate(`/preview/${linkedFlowId}`)}
                          title="Ara akis onizlemesini ac"
                        >
                          Ara Akis: {linkedFlowName ?? `#${linkedFlowId}`}
                        </button>
                      ) : null}
                    </Fragment>
                  )
                })}
              </div>
            )}

            <div className="flow-fields">
              <h3>Form Alanlari</h3>
              {!detailLoading && !detailError && !activeStep && (
                <p className="hint">Bir adim secerek alanlari goruntuleyin.</p>
              )}

              {!detailLoading && !detailError && activeStep && activeStep.fields.length === 0 && (
                <p className="hint">Bu adim icin alan bulunamadi.</p>
              )}

              {!detailLoading && !detailError && activeStep && activeStep.fields.length > 0 && (
                <div className="fields-table">
                  <div className="fields-row fields-head">
                    <span>#</span>
                    <span>Tur</span>
                    <span>Etiket</span>
                    <span>Zorunlu</span>
                    <span>Yetkili Roller</span>
                    <span>Yetkili Kullanicilar</span>
                  </div>
                  {activeStep.fields.map((field) => (
                    <div key={field.fieldId} className="fields-row">
                      <span>{field.orderNo}</span>
                      <span>{field.type}</span>
                      <span>{field.label}</span>
                      <span>{field.required ? 'Evet' : 'Hayir'}</span>
                      <span>{formatIds(getPermissionIds(field, 'ROLE'))}</span>
                      <span>{formatIds(getPermissionIds(field, 'USER'))}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
