import { Fragment, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchFlowDetail } from '../services/flowApi'
import type { FlowDetailResponse } from '../services/flowApi'
import FlowFieldPreview from '../components/FlowFieldPreview'

function resolveLinkedFlowId(step: FlowDetailResponse['steps'][number]) {
  return step.externalFlowId ?? step.subFlowId ?? step.nextFlowId ?? null
}

export default function FlowPreview() {
  const navigate = useNavigate()
  const { flowId } = useParams<{ flowId: string }>()
  const [flowDetail, setFlowDetail] = useState<FlowDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeStepId, setActiveStepId] = useState<number | null>(null)

  useEffect(() => {
    if (!flowId) return
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)
        const data = await fetchFlowDetail(Number(flowId))
        if (!mounted) return
        setFlowDetail(data)
        setActiveStepId(data.steps[0]?.stepId ?? null)
      } catch (err) {
        if (mounted) {
          setError('Akış detayı alınamadı.')
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
  }, [flowId])

  const activeStep = useMemo(() => {
    if (!flowDetail || activeStepId === null) return null
    return flowDetail.steps.find((step) => step.stepId === activeStepId) ?? null
  }, [flowDetail, activeStepId])

  if (!flowId) {
    return (
      <div className="page flow-preview">
        <div className="card">
          <h2>Akış bulunamadı</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="page flow-preview">
      <div className="card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Akış Önizleme</p>
            <h1>{flowDetail?.flowName ?? 'Yükleniyor...'}</h1>
            <p className="hint">{flowDetail?.aciklama}</p>
          </div>
          {flowDetail ? (
            <div className="flow-status active">Adımlar Var</div>
          ) : null}
        </div>

        {loading && <p className="hint">Yükleniyor...</p>}
        {error && <p className="error-text">{error}</p>}

        {!loading && !error && flowDetail && (
          <>
            <div className="step-tabs">
              {flowDetail.steps.map((step, index) => {
                const linkedFlowId =
                  step.externalFlowEnabled === false ? null : resolveLinkedFlowId(step)
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
                        Ara Akis #{linkedFlowId}
                      </button>
                    ) : null}
                  </Fragment>
                )
              })}
            </div>

            <div className="form">
              {!activeStep && <p className="hint">Adım seçiniz.</p>}
              {activeStep && activeStep.fields.length === 0 && (
                <p className="hint">Bu adımda alan yok.</p>
              )}
              {activeStep?.fields.map((field) => (
                <div key={field.fieldId} className="field">
                  <div className="field-label">
                    <span>{field.label}</span>
                    {field.required && <span className="required">*</span>}
                  </div>
                  <FlowFieldPreview field={field} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
