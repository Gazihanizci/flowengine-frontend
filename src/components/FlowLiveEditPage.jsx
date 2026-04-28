import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import StepCard from './StepCard'
import FloatingFieldEditor from './FloatingFieldEditor'
import './FlowLiveEditPage.css'

const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function toErrorMessage(error) {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : 'Bilinmeyen hata'
  }

  const data = error.response?.data
  if (typeof data === 'string' && data.trim()) {
    return data
  }

  if (data && typeof data === 'object') {
    return data.message || data.error || data.detail || data.mesaj || error.message
  }

  return error.message || 'API hatası'
}

function normalizePermissions(field) {
  if (Array.isArray(field.permissions)) {
    return field.permissions.map((permission) => ({
      tip: permission.tip || 'USER',
      refId: Number(permission.refId ?? 0),
      yetkiTipi: permission.yetkiTipi || 'VIEW',
    }))
  }

  const permissions = []
  if (Array.isArray(field.roleIds)) {
    field.roleIds.forEach((roleId) => permissions.push({ tip: 'ROLE', refId: Number(roleId), yetkiTipi: 'EDIT' }))
  }
  if (Array.isArray(field.userIds)) {
    field.userIds.forEach((userId) => permissions.push({ tip: 'USER', refId: Number(userId), yetkiTipi: 'EDIT' }))
  }
  return permissions
}

function normalizeField(field) {
  return {
    fieldId: Number(field.fieldId ?? field.id ?? 0),
    label: field.label || field.etiket || '',
    type: field.type || field.tip || 'TEXT',
    placeholder: field.placeholder || '',
    required: Boolean(field.required),
    editable: field.editable ?? true,
    orderNo: Number(field.orderNo ?? 0),
    permissions: normalizePermissions(field),
    options: Array.isArray(field.options) ? field.options : [],
  }
}

function normalizeStep(step) {
  return {
    stepId: Number(step.stepId ?? step.adimId ?? 0),
    stepName: step.stepName || step.adimAdi || '',
    stepOrder: Number(step.stepOrder ?? step.sira ?? 1),
    requiredApprovalCount: Number(step.requiredApprovalCount ?? 0),
    externalFlowEnabled: Boolean(step.externalFlowEnabled),
    externalFlowId: step.externalFlowId ?? null,
    waitForExternalFlowCompletion: Boolean(step.waitForExternalFlowCompletion),
    resumeParentAfterSubFlow: Boolean(step.resumeParentAfterSubFlow),
    cancelBehavior: step.cancelBehavior || 'PROPAGATE',
    fields: Array.isArray(step.fields) ? step.fields.map(normalizeField) : [],
  }
}

function normalizeFlow(data, fallbackFlowId) {
  return {
    flowId: Number(data.flowId ?? data.akisId ?? fallbackFlowId),
    flowName: data.flowName || data.akisAdi || '',
    aciklama: data.aciklama || '',
    baslatmaYetkileri: Array.isArray(data.baslatmaYetkileri) ? data.baslatmaYetkileri : [],
    steps: Array.isArray(data.steps) ? data.steps.map(normalizeStep) : [],
  }
}

function hasDuplicatePermission(permissions) {
  const seen = new Set()
  for (const permission of permissions || []) {
    const key = `${permission.tip}:${permission.refId}`
    if (seen.has(key)) return true
    seen.add(key)
  }
  return false
}

function supportsOptions(type) {
  const normalized = String(type || '')
    .trim()
    .toUpperCase()
  return normalized === 'RADIO' || normalized === 'COMBOBOX'
}

function buildStepPayload(step) {
  return {
    stepName: step.stepName,
    stepOrder: Number(step.stepOrder),
    requiredApprovalCount: Number(step.requiredApprovalCount),
    externalFlowEnabled: Boolean(step.externalFlowEnabled),
    externalFlowId: step.externalFlowId ?? null,
    waitForExternalFlowCompletion: Boolean(step.waitForExternalFlowCompletion),
    resumeParentAfterSubFlow: Boolean(step.resumeParentAfterSubFlow),
    cancelBehavior: step.cancelBehavior || 'PROPAGATE',
  }
}

function buildFieldPayload(field) {
  return {
    label: String(field.label || '').trim(),
    placeholder: String(field.placeholder || '').trim(),
    required: Boolean(field.required),
    permissions: Array.isArray(field.permissions) ? field.permissions : [],
    options: supportsOptions(field.type) ? field.options || [] : [],
  }
}

function cloneField(field) {
  return {
    ...field,
    permissions: (field.permissions || []).map((item) => ({ ...item })),
    options: (field.options || []).map((item) => ({ ...item })),
  }
}

function ToastList({ toasts }) {
  if (!toasts.length) return null

  return (
    <div className="flow-live-toast-wrap">
      {toasts.map((toast) => (
        <div key={toast.id} className={`flow-live-toast ${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  )
}

export default function FlowLiveEditPage() {
  const { flowId } = useParams()

  const [flow, setFlow] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editingFlowName, setEditingFlowName] = useState(false)
  const [editingDescription, setEditingDescription] = useState(false)
  const [flowNameDraft, setFlowNameDraft] = useState('')
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [selectedEditor, setSelectedEditor] = useState(null)
  const [savingStepIds, setSavingStepIds] = useState(new Set())
  const [savingFieldIds, setSavingFieldIds] = useState(new Set())
  const [savingFlow, setSavingFlow] = useState(false)
  const [validationError, setValidationError] = useState('')
  const [toasts, setToasts] = useState([])

  const committedFlowRef = useRef(null)
  const committedStepRef = useRef(new Map())
  const committedFieldRef = useRef(new Map())
  const fieldDebounceRef = useRef(new Map())
  const fieldSeqRef = useRef(new Map())

  const selectedField = useMemo(() => {
    if (!selectedEditor || !flow) return null
    const step = flow.steps.find((item) => item.stepId === selectedEditor.stepId)
    return step?.fields.find((item) => item.fieldId === selectedEditor.fieldId) || null
  }, [flow, selectedEditor])

  function pushToast(type, message) {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, type, message }])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id))
    }, 2800)
  }

  function resetCommittedState(nextFlow) {
    committedFlowRef.current = {
      flowName: nextFlow.flowName,
      aciklama: nextFlow.aciklama,
      baslatmaYetkileri: nextFlow.baslatmaYetkileri,
    }
    committedStepRef.current = new Map()
    committedFieldRef.current = new Map()

    nextFlow.steps.forEach((step) => {
      committedStepRef.current.set(step.stepId, { ...step })
      step.fields.forEach((field) => {
        committedFieldRef.current.set(field.fieldId, cloneField(field))
      })
    })
  }

  useEffect(() => {
    async function loadFlow() {
      if (!flowId) {
        pushToast('error', 'Geçerli flowId bulunamadı.')
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const { data } = await api.get(`/api/flows/${flowId}`)
        const normalized = normalizeFlow(data, flowId)
        setFlow(normalized)
        setFlowNameDraft(normalized.flowName)
        setDescriptionDraft(normalized.aciklama)
        resetCommittedState(normalized)
      } catch (error) {
        pushToast('error', toErrorMessage(error))
      } finally {
        setLoading(false)
      }
    }

    loadFlow()
  }, [flowId])

  useEffect(() => {
    return () => {
      fieldDebounceRef.current.forEach((timer) => window.clearTimeout(timer))
      fieldDebounceRef.current.clear()
    }
  }, [])

  function updateFieldState(stepId, fieldId, patch) {
    let nextField = null

    setFlow((prev) => {
      if (!prev) return prev

      return {
        ...prev,
        steps: prev.steps.map((step) => {
          if (step.stepId !== stepId) return step
          return {
            ...step,
            fields: step.fields.map((field) => {
              if (field.fieldId !== fieldId) return field
              nextField = {
                ...field,
                ...patch,
              }
              return nextField
            }),
          }
        }),
      }
    })

    return nextField
  }

  function rollbackField(fieldId) {
    const committed = committedFieldRef.current.get(fieldId)
    if (!committed) return

    setFlow((prev) => {
      if (!prev) return prev

      return {
        ...prev,
        steps: prev.steps.map((step) => ({
          ...step,
          fields: step.fields.map((field) => (field.fieldId === fieldId ? cloneField(committed) : field)),
        })),
      }
    })
  }

  function scheduleFieldSave(stepId, fieldId, nextField) {
    const existingTimer = fieldDebounceRef.current.get(fieldId)
    if (existingTimer) {
      window.clearTimeout(existingTimer)
    }

    const seq = (fieldSeqRef.current.get(fieldId) || 0) + 1
    fieldSeqRef.current.set(fieldId, seq)

    const timer = window.setTimeout(async () => {
      if (!nextField) return

      const payload = buildFieldPayload(nextField)
      const hasEmptyLabel = !payload.label
      const hasDuplicate = hasDuplicatePermission(payload.permissions)

      if (hasEmptyLabel) {
        setValidationError('label-empty')
        return
      }

      if (hasDuplicate) {
        setValidationError('duplicate-permission')
        return
      }

      setValidationError('')
      setSavingFieldIds((prev) => new Set(prev).add(fieldId))

      try {
        await api.put(`/api/flows/edit/field/${fieldId}`, payload)
        if (fieldSeqRef.current.get(fieldId) === seq) {
          committedFieldRef.current.set(fieldId, cloneField(nextField))
        }
      } catch (error) {
        if (fieldSeqRef.current.get(fieldId) === seq) {
          rollbackField(fieldId)
          pushToast('error', toErrorMessage(error))
        }
      } finally {
        setSavingFieldIds((prev) => {
          const copy = new Set(prev)
          copy.delete(fieldId)
          return copy
        })
      }
    }, 500)

    fieldDebounceRef.current.set(fieldId, timer)
  }

  async function saveFlowMeta(nextFlowName, nextDescription) {
    if (!flow) return

    const previous = committedFlowRef.current
    const optimistic = {
      ...flow,
      flowName: nextFlowName,
      aciklama: nextDescription,
    }

    setFlow(optimistic)
    setSavingFlow(true)

    try {
      await api.put(`/api/flows/edit/${flow.flowId}`, {
        flowName: nextFlowName,
        aciklama: nextDescription,
        baslatmaYetkileri: flow.baslatmaYetkileri,
      })
      committedFlowRef.current = {
        flowName: nextFlowName,
        aciklama: nextDescription,
        baslatmaYetkileri: flow.baslatmaYetkileri,
      }
    } catch (error) {
      setFlow((prev) =>
        prev
          ? {
              ...prev,
              flowName: previous?.flowName || prev.flowName,
              aciklama: previous?.aciklama || prev.aciklama,
            }
          : prev,
      )
      setFlowNameDraft(previous?.flowName || '')
      setDescriptionDraft(previous?.aciklama || '')
      pushToast('error', toErrorMessage(error))
    } finally {
      setSavingFlow(false)
    }
  }

  async function handleStepNameSave(stepId, stepName) {
    if (!flow) return

    const baseStep = flow.steps.find((step) => step.stepId === stepId)
    if (!baseStep) return

    const optimisticStep = { ...baseStep, stepName }
    setFlow((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        steps: prev.steps.map((step) => (step.stepId === stepId ? optimisticStep : step)),
      }
    })
    setSavingStepIds((prev) => new Set(prev).add(stepId))

    try {
      await api.put(`/api/flows/edit/step/${stepId}`, buildStepPayload(optimisticStep))
      committedStepRef.current.set(stepId, { ...optimisticStep })
    } catch (error) {
      const rollback = committedStepRef.current.get(stepId)
      if (rollback) {
        setFlow((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            steps: prev.steps.map((step) => (step.stepId === stepId ? rollback : step)),
          }
        })
      }
      pushToast('error', toErrorMessage(error))
    } finally {
      setSavingStepIds((prev) => {
        const copy = new Set(prev)
        copy.delete(stepId)
        return copy
      })
    }
  }

  function openEditor(stepId, field, element) {
    const rect = element.getBoundingClientRect()
    const panelWidth = 420
    const preferRight = rect.right + 12 + panelWidth < window.innerWidth
    const left = preferRight ? rect.right + 12 : Math.max(12, rect.left - panelWidth - 12)
    const top = Math.min(window.innerHeight - 560, Math.max(12, rect.top - 8))

    setSelectedEditor({
      stepId,
      fieldId: field.fieldId,
      position: { top, left },
    })
    setValidationError('')
  }

  function patchSelectedField(patch) {
    if (!selectedEditor) return
    const nextField = updateFieldState(selectedEditor.stepId, selectedEditor.fieldId, patch)
    if (nextField) {
      scheduleFieldSave(selectedEditor.stepId, selectedEditor.fieldId, nextField)
    }
  }

  if (loading) {
    return (
      <div className="panel flow-live-loading">
        <div className="flow-live-loading-line">
          <span className="flow-live-spinner" />
          <span>Flow yükleniyor...</span>
        </div>
      </div>
    )
  }

  if (!flow) {
    return (
      <div className="panel">
        <p className="error-text">Flow verisi alınamadı.</p>
      </div>
    )
  }

  return (
    <div className="flow-live-page">
      <section className="panel flow-live-header">
        <div className="flow-live-header-main">
          {editingFlowName ? (
            <input
              autoFocus
              className="input flow-live-title-input"
              value={flowNameDraft}
              onChange={(event) => setFlowNameDraft(event.target.value)}
              onBlur={() => {
                const next = flowNameDraft.trim()
                setEditingFlowName(false)
                if (next && next !== flow.flowName) {
                  saveFlowMeta(next, descriptionDraft.trim())
                } else {
                  setFlowNameDraft(flow.flowName)
                }
              }}
            />
          ) : (
            <button type="button" className="flow-live-title" onClick={() => setEditingFlowName(true)}>
              {flow.flowName || 'İsimsiz Flow'}
            </button>
          )}

          {editingDescription ? (
            <textarea
              autoFocus
              className="input flow-live-description-input"
              rows={2}
              value={descriptionDraft}
              onChange={(event) => setDescriptionDraft(event.target.value)}
              onBlur={() => {
                const next = descriptionDraft.trim()
                setEditingDescription(false)
                if (next !== flow.aciklama) {
                  saveFlowMeta(flowNameDraft.trim() || flow.flowName, next)
                } else {
                  setDescriptionDraft(flow.aciklama)
                }
              }}
            />
          ) : (
            <button type="button" className="flow-live-description" onClick={() => setEditingDescription(true)}>
              {flow.aciklama || 'Açıklama eklemek için tıklayın'}
            </button>
          )}
        </div>
        {savingFlow ? <span className="flow-live-saving-chip">Flow kaydediliyor...</span> : null}
      </section>

      <div className="flow-live-steps">
        {flow.steps.map((step) => (
          <StepCard
            key={step.stepId}
            step={step}
            selectedFieldId={selectedEditor?.fieldId || null}
            savingStep={savingStepIds.has(step.stepId)}
            savingFieldIds={savingFieldIds}
            onStepNameSave={handleStepNameSave}
            onFieldClick={openEditor}
          />
        ))}
      </div>

      <FloatingFieldEditor
        open={Boolean(selectedEditor && selectedField)}
        position={selectedEditor?.position || { top: 0, left: 0 }}
        field={selectedField}
        saving={selectedEditor ? savingFieldIds.has(selectedEditor.fieldId) : false}
        validationError={validationError}
        onPatch={patchSelectedField}
        onClose={() => setSelectedEditor(null)}
      />

      <ToastList toasts={toasts} />
    </div>
  )
}
