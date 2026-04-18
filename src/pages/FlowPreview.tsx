import { Fragment, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchFlowDetail, fetchFlowMap, fetchFlowPermissions } from '../services/flowApi'
import type { FlowDetailResponse, FlowMapResponse, FlowPermissionItem } from '../services/flowApi'
import FlowFieldPreview from '../components/FlowFieldPreview'

function resolveLinkedFlowId(step: FlowDetailResponse['steps'][number]) {
  return step.externalFlowId ?? step.subFlowId ?? step.nextFlowId ?? null
}

function parsePhaseOrder(evre: string) {
  const match = evre.match(/^(\d+)/)
  return match ? Number(match[1]) : 999
}

function parseSubflowIdFromEvre(evre: string) {
  const match = evre.match(/subflow\s*:\s*(\d+)/i)
  return match ? Number(match[1]) : null
}

function formatPermissionItems(permissions: FlowPermissionItem[]) {
  if (!permissions || permissions.length === 0) {
    return ['Tanimli baslatma yetkisi yok']
  }

  return permissions.map((permission) =>
    permission.tip === 'ROLE' ? `Rol #${permission.refId}` : `Kullanici #${permission.refId}`,
  )
}

type TransitionItem = {
  fromStepName: string
  fromStepId: number
  linkedFlowId: number
  toStepName: string
  toStepId: number | null
}

export default function FlowPreview() {
  const navigate = useNavigate()
  const { flowId } = useParams<{ flowId: string }>()
  const [flowDetail, setFlowDetail] = useState<FlowDetailResponse | null>(null)
  const [flowMap, setFlowMap] = useState<FlowMapResponse | null>(null)
  const [linkedFlowDetails, setLinkedFlowDetails] = useState<Record<number, FlowDetailResponse>>({})
  const [flowPermissions, setFlowPermissions] = useState<FlowPermissionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeStepId, setActiveStepId] = useState<number | null>(null)

  useEffect(() => {
    if (!flowId) return
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)
        setError(null)

        const [data, permissions, mapData] = await Promise.all([
          fetchFlowDetail(Number(flowId)),
          fetchFlowPermissions().catch(() => [] as FlowPermissionItem[]),
          fetchFlowMap(Number(flowId)).catch(() => null),
        ])
        if (!mounted) return

        setFlowDetail(data)
        setFlowMap(mapData)
        setFlowPermissions(Array.isArray(permissions) ? permissions : [])
        setActiveStepId(data.steps[0]?.stepId ?? null)

        const linkedFromDetail = data.steps
          .map((step) => (step.externalFlowEnabled === false ? null : resolveLinkedFlowId(step)))
          .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

        const linkedFromMap = (mapData?.adimlar ?? [])
          .map((step) => parseSubflowIdFromEvre(step.evre))
          .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

        const linkedFlowIds = Array.from(new Set([...linkedFromDetail, ...linkedFromMap]))

        if (linkedFlowIds.length === 0) {
          setLinkedFlowDetails({})
          return
        }

        const childDetails = await Promise.all(
          linkedFlowIds.map(async (id) => {
            try {
              const detail = await fetchFlowDetail(id)
              return [id, detail] as const
            } catch {
              return null
            }
          }),
        )

        if (!mounted) return

        const detailMap = Object.fromEntries(
          childDetails.filter((entry): entry is readonly [number, FlowDetailResponse] => entry !== null),
        )
        setLinkedFlowDetails(detailMap)
      } catch {
        if (mounted) {
          setError('Akis detayi alinamadi.')
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

  const transitionsFromDetail = useMemo<TransitionItem[]>(() => {
    if (!flowDetail) return []

    return flowDetail.steps
      .map((step, index) => {
        const linkedFlowId = step.externalFlowEnabled === false ? null : resolveLinkedFlowId(step)
        if (!linkedFlowId) return null

        const nextStep = flowDetail.steps[index + 1] ?? null
        return {
          fromStepName: step.stepName,
          fromStepId: step.stepId,
          linkedFlowId,
          toStepName: nextStep?.stepName ?? 'Akis Sonu',
          toStepId: nextStep?.stepId ?? null,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  }, [flowDetail])

  const transitionsFromMap = useMemo<TransitionItem[]>(() => {
    if (!flowMap) return []

    const sorted = [...flowMap.adimlar].sort((a, b) => {
      const phaseDiff = parsePhaseOrder(a.evre) - parsePhaseOrder(b.evre)
      if (phaseDiff !== 0) return phaseDiff
      if (a.sira !== b.sira) return a.sira - b.sira
      return a.adimId - b.adimId
    })

    return sorted
      .map((node, index) => {
        const linkedFlowId = parseSubflowIdFromEvre(node.evre)
        if (!linkedFlowId) return null

        const previousNormal = [...sorted.slice(0, index)]
          .reverse()
          .find((item) => parseSubflowIdFromEvre(item.evre) === null)
        const nextNormal = sorted.slice(index + 1).find((item) => parseSubflowIdFromEvre(item.evre) === null)

        return {
          fromStepName: previousNormal?.adimAdi ?? `Adim #${node.adimId}`,
          fromStepId: previousNormal?.adimId ?? node.adimId,
          linkedFlowId,
          toStepName: nextNormal?.adimAdi ?? 'Akis Sonu',
          toStepId: nextNormal?.adimId ?? null,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  }, [flowMap])

  const childFlowTransitions = useMemo(() => {
    const combined = [...transitionsFromDetail, ...transitionsFromMap]
    const unique = new Map<string, TransitionItem>()

    combined.forEach((item) => {
      const key = `${item.fromStepId}-${item.linkedFlowId}-${item.toStepId ?? 'end'}`
      if (!unique.has(key)) {
        unique.set(key, item)
      }
    })

    return Array.from(unique.values())
  }, [transitionsFromDetail, transitionsFromMap])

  const permissionsByFlowId = useMemo(() => {
    const map = new Map<number, FlowPermissionItem[]>()
    flowPermissions.forEach((permission) => {
      const list = map.get(permission.akisId) ?? []
      list.push(permission)
      map.set(permission.akisId, list)
    })
    return map
  }, [flowPermissions])

  const activeStepLinkedFlowId = useMemo(() => {
    if (!activeStep) return null
    if (activeStep.externalFlowEnabled !== false) {
      const direct = resolveLinkedFlowId(activeStep)
      if (direct) return direct
    }

    const transition = childFlowTransitions.find(
      (item) => item.fromStepId === activeStep.stepId || item.fromStepName === activeStep.stepName,
    )
    return transition?.linkedFlowId ?? null
  }, [activeStep, childFlowTransitions])

  const childFlowList = useMemo(
    () =>
      Object.entries(linkedFlowDetails)
        .map(([id, detail]) => ({ id: Number(id), detail }))
        .sort((a, b) => a.id - b.id),
    [linkedFlowDetails],
  )

  const linkedFlowByStepKey = useMemo(() => {
    const map = new Map<string, number>()
    childFlowTransitions.forEach((item) => {
      map.set(`id:${item.fromStepId}`, item.linkedFlowId)
      map.set(`name:${item.fromStepName}`, item.linkedFlowId)
    })
    return map
  }, [childFlowTransitions])

  const mainFlowPermissions = useMemo(() => {
    if (!flowDetail) return []
    return permissionsByFlowId.get(flowDetail.flowId) ?? []
  }, [flowDetail, permissionsByFlowId])

  if (!flowId) {
    return (
      <div className="page flow-preview">
        <div className="card">
          <h2>Akis bulunamadi</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="page flow-preview">
      <div className="card flow-preview-card">
        <div className="card-header flow-preview-hero">
          <div>
            <p className="eyebrow">Akis Onizleme</p>
            <h1>{flowDetail?.flowName ?? 'Yukleniyor...'}</h1>
            <p className="hint">{flowDetail?.aciklama}</p>
          </div>
          {flowDetail ? <div className="flow-status active">Adimlar Var</div> : null}
        </div>

        {loading ? <p className="hint">Yukleniyor...</p> : null}
        {error ? <p className="error-text">{error}</p> : null}

        {!loading && !error && flowDetail ? (
          <>
            <section className="flow-summary flow-preview-summary">
              <div>
                <h3>Akis Bilgileri</h3>
                <p>Flow adimlarini, child flow baglantilarini ve baslatma yetkilerini inceleyin.</p>
              </div>
              <div className="summary-meta">
                <div className="flow-preview-kpi">
                  <span>Akis ID</span>
                  <strong>{flowDetail.flowId}</strong>
                </div>
                <div className="flow-preview-kpi">
                  <span>Adim Sayisi</span>
                  <strong>{flowDetail.steps.length}</strong>
                </div>
                <div className="flow-preview-kpi">
                  <span>Child Flow</span>
                  <strong>{childFlowList.length}</strong>
                </div>
                <div className="flow-preview-kpi">
                  <span>Aktif Adim</span>
                  <strong>{activeStep?.stepName ?? '-'}</strong>
                </div>
              </div>
            </section>

            <div className="step-tabs flow-preview-stepbar">
              {flowDetail.steps.map((step) => {
                const direct = step.externalFlowEnabled === false ? null : resolveLinkedFlowId(step)
                const linkedFlowId =
                  direct ??
                  linkedFlowByStepKey.get(`id:${step.stepId}`) ??
                  linkedFlowByStepKey.get(`name:${step.stepName}`) ??
                  null

                return (
                  <Fragment key={step.stepId}>
                    <button
                      className={`step-tab ${activeStepId === step.stepId ? 'active' : ''}`}
                      type="button"
                      onClick={() => setActiveStepId(step.stepId)}
                    >
                      {step.stepName}
                    </button>
                    {linkedFlowId ? (
                      <button
                        className="embedded-flow-pill"
                        type="button"
                        onClick={() => navigate(`/preview/${linkedFlowId}`)}
                        title="Child flow onizlemesini ac"
                      >
                        Child Flow #{linkedFlowId}
                      </button>
                    ) : null}
                  </Fragment>
                )
              })}
            </div>

            <section className="panel flow-preview-panel">
              <div className="panel-header">
                <h2>Child Flow Gecis Noktalari</h2>
              </div>
              {childFlowTransitions.length === 0 ? (
                <p className="hint">Bu akista adimlar arasina bagli child flow tanimi yok.</p>
              ) : (
                <div className="flow-list flow-preview-transition-list">
                  {childFlowTransitions.map((transition) => (
                    <div key={`${transition.fromStepId}-${transition.linkedFlowId}`} className="flow-card flow-preview-transition-card">
                      <div>
                        <h3>
                          {transition.fromStepName}
                          {' -> '}
                          {linkedFlowDetails[transition.linkedFlowId]?.flowName ?? `Akis #${transition.linkedFlowId}`}
                          {' -> '}
                          {transition.toStepName}
                        </h3>
                        <p>
                          Adim #{transition.fromStepId} ile{' '}
                          {transition.toStepId ? `Adim #${transition.toStepId}` : 'akis sonu'} arasina girer.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => navigate(`/preview/${transition.linkedFlowId}`)}
                      >
                        Child Ac
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="panel flow-preview-panel">
              <div className="panel-header">
                <h2>Ana Akis Baslatma Yetkileri</h2>
              </div>
              <div className="step-tabs flow-preview-chip-row">
                {formatPermissionItems(mainFlowPermissions).map((permission) => (
                  <span key={permission} className="step-tab">
                    {permission}
                  </span>
                ))}
              </div>
            </section>

            {activeStepLinkedFlowId ? (
              <section className="panel flow-preview-panel">
                <div className="panel-header">
                  <h2>Secili Adimin Child Flow Yetkileri</h2>
                </div>
                <p className="hint">
                  {linkedFlowDetails[activeStepLinkedFlowId]?.flowName ?? `Akis #${activeStepLinkedFlowId}`}
                </p>
                <div className="step-tabs flow-preview-chip-row">
                  {formatPermissionItems(permissionsByFlowId.get(activeStepLinkedFlowId) ?? []).map((permission) => (
                    <span key={`${activeStepLinkedFlowId}-${permission}`} className="step-tab">
                      {permission}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {childFlowList.length > 0 ? (
              <section className="panel flow-preview-panel">
                <div className="panel-header">
                  <h2>Child Flow Listesi</h2>
                </div>
                <div className="flow-list flow-preview-transition-list">
                  {childFlowList.map((child) => (
                    <div key={child.id} className="flow-card flow-preview-transition-card">
                      <div>
                        <h3>{child.detail.flowName}</h3>
                        <p>ID: {child.id}</p>
                        <p>{child.detail.aciklama || 'Aciklama yok'}</p>
                        <p className="hint">
                          Yetkiler: {formatPermissionItems(permissionsByFlowId.get(child.id) ?? []).join(', ')}
                        </p>
                      </div>
                      <button type="button" className="button secondary" onClick={() => navigate(`/preview/${child.id}`)}>
                        Ac
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="panel flow-preview-panel flow-preview-form">
              <div className="panel-header">
                <h2>Adim Form Alanlari</h2>
                <span>{activeStep?.stepName ?? '-'}</span>
              </div>
              <div className="form">
                {!activeStep ? <p className="hint">Adim seciniz.</p> : null}
                {activeStep && activeStep.fields.length === 0 ? <p className="hint">Bu adimda alan yok.</p> : null}
                {activeStep?.fields.map((field) => (
                  <div key={field.fieldId} className="field">
                    <div className="field-label">
                      <span>{field.label}</span>
                      {field.required ? <span className="required">*</span> : null}
                    </div>
                    <FlowFieldPreview field={field} />
                  </div>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  )
}
