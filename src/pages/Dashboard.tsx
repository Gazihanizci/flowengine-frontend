import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchFlowDetail, fetchFlows } from '../services/flowApi'
import type { FlowDetailResponse, FlowListItem } from '../services/flowApi'

export default function Dashboard() {
  const navigate = useNavigate()
  const [flows, setFlows] = useState<FlowListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFlowId, setSelectedFlowId] = useState<number | null>(null)
  const [flowDetail, setFlowDetail] = useState<FlowDetailResponse | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [activeStepId, setActiveStepId] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)
        const data = await fetchFlows()
        if (mounted) {
          setFlows(data)
          if (data.length > 0) {
            setSelectedFlowId((prev) => prev ?? data[0].akisId)
          }
        }
      } catch (err) {
        if (mounted) {
          setError('Akış listesi alınamadı.')
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
    if (selectedFlowId === null) return

    const loadDetail = async () => {
      setFlowDetail(null)
      setDetailError(null)
      setDetailLoading(true)

      try {
        const data = await fetchFlowDetail(selectedFlowId)
        setFlowDetail(data)
        setActiveStepId(data.steps[0]?.stepId ?? null)
      } catch (err) {
        setDetailError('Akış detayı alınamadı.')
      } finally {
        setDetailLoading(false)
      }
    }

    loadDetail()
  }, [selectedFlowId])

  const activeStep = useMemo(() => {
    if (!flowDetail || activeStepId === null) return null
    return flowDetail.steps.find((step) => step.stepId === activeStepId) ?? null
  }, [flowDetail, activeStepId])

  return (
    <div className="dashboard">
      <div className="dashboard-shell">
        <div className="dashboard-top">
          <div>
            <h1>İş Akışı Paneli</h1>
            <p>Akışları yönetin, adımları ve form alanlarını inceleyin.</p>
          </div>
          <button
            className="button primary"
            type="button"
            onClick={() => navigate('/create-flow')}
          >
            Yeni Akış Oluştur
          </button>
        </div>

        <div className="dashboard-stats">
          <div className="stat-card">
            <span>Toplam Akış</span>
            <strong>{flows.length}</strong>
          </div>
          <div className="stat-card">
            <span>Toplam Adım</span>
            <strong>{flowDetail?.steps.length ?? 0}</strong>
          </div>
          <div className="stat-card">
            <span>Toplam Alan</span>
            <strong>{flowDetail?.steps.reduce((sum, step) => sum + step.fields.length, 0) ?? 0}</strong>
          </div>
        </div>

        <div className="dashboard-grid">
          <section className="panel flow-list-panel">
            <div className="panel-header">
              <h2>Akışlar</h2>
              <span>{flows.length} kayıt</span>
            </div>

            {loading && <p className="hint">Yükleniyor...</p>}
            {error && <p className="error-text">{error}</p>}

            {!loading && !error && flows.length === 0 && (
              <p className="hint">Henüz kayıtlı akış yok.</p>
            )}

            {!loading && !error && flows.length > 0 && (
              <div className="flow-grid">
                {flows.map((flow) => (
                  <button
                    key={flow.akisId}
                    className={`flow-card ${selectedFlowId === flow.akisId ? 'selected' : ''}`}
                    type="button"
                    onClick={() => setSelectedFlowId(flow.akisId)}
                  >
                    <div>
                      <h3>{flow.akisAdi}</h3>
                      <p>{flow.aciklama}</p>
                    </div>
                    <span className="flow-status passive">Akış</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="panel flow-detail-panel">
            <div className="panel-header">
              <h2>Akış Detayı</h2>
              {flowDetail && (
                <span className={`flow-status ${flowDetail.steps.length ? 'active' : 'passive'}`}>
                  {flowDetail.steps.length ? 'Adımlar Var' : 'Adım Yok'}
                </span>
              )}
            </div>

            {detailLoading && <p className="hint">Detay yükleniyor...</p>}
            {detailError && <p className="error-text">{detailError}</p>}

            {!detailLoading && !detailError && flowDetail && (
              <div className="flow-summary">
                <div>
                  <h3>{flowDetail.flowName}</h3>
                  <p>{flowDetail.aciklama}</p>
                </div>
                <div className="summary-meta">
                  <div>
                    <span>Akış ID</span>
                    <strong>{flowDetail.flowId}</strong>
                  </div>
                  <div>
                    <span>Adım Sayısı</span>
                    <strong>{flowDetail.steps.length}</strong>
                  </div>
                </div>
              </div>
            )}

            {!detailLoading && !detailError && flowDetail && (
              <div className="step-tabs">
                {flowDetail.steps.map((step) => (
                  <button
                    key={step.stepId}
                    className={`step-tab ${activeStepId === step.stepId ? 'active' : ''}`}
                    type="button"
                    onClick={() => setActiveStepId(step.stepId)}
                  >
                    {step.stepName}
                  </button>
                ))}
              </div>
            )}

            <div className="flow-fields">
              <h3>Form Alanları</h3>
              {!detailLoading && !detailError && !activeStep && (
                <p className="hint">Bir adım seçerek alanları görüntüleyin.</p>
              )}

              {!detailLoading && !detailError && activeStep && activeStep.fields.length === 0 && (
                <p className="hint">Bu adım için alan bulunamadı.</p>
              )}

              {!detailLoading && !detailError && activeStep && activeStep.fields.length > 0 && (
                <div className="fields-table">
                  <div className="fields-row fields-head">
                    <span>#</span>
                    <span>Tür</span>
                    <span>Etiket</span>
                    <span>Zorunlu</span>
                  </div>
                  {activeStep.fields.map((field) => (
                    <div key={field.fieldId} className="fields-row">
                      <span>{field.orderNo}</span>
                      <span>{field.type}</span>
                      <span>{field.label}</span>
                      <span>{field.required ? 'Evet' : 'Hayır'}</span>
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