import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import StepList from './StepList'
import StepEditPanel from './StepEditPanel'
import FieldList from './FieldList'
import FieldEditModal from './FieldEditModal'
import './FlowEditPage.css'

const api = axios.create({
  baseURL: 'http://localhost:8080',
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

function parseErrorMessage(error) {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : 'Bilinmeyen hata'
  }

  const data = error.response?.data
  const status = error.response?.status

  if (typeof data === 'string' && data.trim()) {
    return data
  }

  if (data && typeof data === 'object') {
    return data.message || data.error || data.detail || data.mesaj || `HTTP ${status ?? '-'}`
  }

  return error.message || `HTTP ${status ?? '-'}`
}

function normalizePermissions(field) {
  if (Array.isArray(field.permissions)) {
    return field.permissions.map((item) => ({
      tip: item.tip || 'USER',
      refId: Number(item.refId ?? 0),
      yetkiTipi: item.yetkiTipi || 'VIEW',
    }))
  }

  const permissions = []
  if (Array.isArray(field.roleIds)) {
    field.roleIds.forEach((roleId) => {
      permissions.push({ tip: 'ROLE', refId: Number(roleId), yetkiTipi: 'EDIT' })
    })
  }
  if (Array.isArray(field.userIds)) {
    field.userIds.forEach((userId) => {
      permissions.push({ tip: 'USER', refId: Number(userId), yetkiTipi: 'EDIT' })
    })
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

function normalizeFlow(data, flowId) {
  const steps = Array.isArray(data.steps) ? data.steps.map(normalizeStep) : []

  return {
    flowId: Number(data.flowId ?? data.akisId ?? flowId),
    flowName: data.flowName || data.akisAdi || '',
    aciklama: data.aciklama || '',
    baslatmaYetkileri: Array.isArray(data.baslatmaYetkileri) ? data.baslatmaYetkileri : [],
    steps,
  }
}

function ToastList({ toasts }) {
  if (!toasts.length) return null

  return (
    <div className="flow-edit-toast-wrap">
      {toasts.map((toast) => (
        <div key={toast.id} className={`flow-edit-toast ${toast.type}`}>
          {toast.message}
        </div>
      ))}
    </div>
  )
}

export default function FlowEditPage() {
  const { flowId } = useParams()

  const [flow, setFlow] = useState(null)
  const [selectedStepId, setSelectedStepId] = useState(null)
  const [selectedField, setSelectedField] = useState(null)
  const [loading, setLoading] = useState(true)
  const [flowSaving, setFlowSaving] = useState(false)
  const [stepSaving, setStepSaving] = useState(false)
  const [fieldSaving, setFieldSaving] = useState(false)
  const [flowForm, setFlowForm] = useState({ flowName: '', aciklama: '' })
  const [toasts, setToasts] = useState([])

  const selectedStep = useMemo(
    () => flow?.steps.find((step) => step.stepId === selectedStepId) ?? null,
    [flow, selectedStepId],
  )

  function pushToast(type, message) {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, type, message }])

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 2600)
  }

  useEffect(() => {
    async function loadFlowDetail() {
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
        setFlowForm({
          flowName: normalized.flowName,
          aciklama: normalized.aciklama,
        })
        setSelectedStepId(normalized.steps[0]?.stepId ?? null)
      } catch (error) {
        pushToast('error', parseErrorMessage(error))
      } finally {
        setLoading(false)
      }
    }

    loadFlowDetail()
  }, [flowId])

  function patchStepInFlow(targetStepId, patch) {
    setFlow((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        steps: prev.steps.map((step) => (step.stepId === targetStepId ? { ...step, ...patch } : step)),
      }
    })
  }

  function patchFieldInFlow(targetStepId, targetFieldId, patch) {
    setFlow((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        steps: prev.steps.map((step) =>
          step.stepId !== targetStepId
            ? step
            : {
                ...step,
                fields: step.fields.map((field) => (field.fieldId === targetFieldId ? { ...field, ...patch } : field)),
              },
        ),
      }
    })
  }

  async function handleFlowUpdate(event) {
    event.preventDefault()
    if (!flow) return

    const rollback = {
      flowName: flow.flowName,
      aciklama: flow.aciklama,
    }

    const optimisticFlow = {
      ...flow,
      flowName: flowForm.flowName.trim(),
      aciklama: flowForm.aciklama.trim(),
    }

    setFlow(optimisticFlow)
    setFlowSaving(true)

    try {
      await api.put(`/api/flows/edit/${flow.flowId}`, {
        flowName: optimisticFlow.flowName,
        aciklama: optimisticFlow.aciklama,
        baslatmaYetkileri: flow.baslatmaYetkileri,
      })
      pushToast('success', 'Akış güncellendi')
    } catch (error) {
      setFlow((prev) => (prev ? { ...prev, ...rollback } : prev))
      pushToast('error', parseErrorMessage(error))
    } finally {
      setFlowSaving(false)
    }
  }

  async function handleStepUpdate(stepId, payload) {
    if (!flow) return

    const previousStep = flow.steps.find((step) => step.stepId === stepId)
    if (!previousStep) return

    patchStepInFlow(stepId, payload)
    setStepSaving(true)

    try {
      await api.put(`/api/flows/edit/step/${stepId}`, payload)
      pushToast('success', 'Adım güncellendi')
    } catch (error) {
      patchStepInFlow(stepId, previousStep)
      pushToast('error', parseErrorMessage(error))
    } finally {
      setStepSaving(false)
    }
  }

  async function handleFieldUpdate(fieldId, payload) {
    if (!flow || !selectedStepId) return

    const currentStep = flow.steps.find((step) => step.stepId === selectedStepId)
    const previousField = currentStep?.fields.find((field) => field.fieldId === fieldId)
    if (!currentStep || !previousField) return

    patchFieldInFlow(selectedStepId, fieldId, payload)
    setFieldSaving(true)

    try {
      await api.put(`/api/flows/edit/field/${fieldId}`, payload)
      setSelectedField(null)
      pushToast('success', 'Alan güncellendi')
    } catch (error) {
      patchFieldInFlow(selectedStepId, fieldId, previousField)
      pushToast('error', parseErrorMessage(error))
    } finally {
      setFieldSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="panel flow-edit-loading">
        <div className="flow-edit-loading-line">
          <span className="flow-edit-spinner" />
          <span>Akış verisi yükleniyor...</span>
        </div>
        <ToastList toasts={toasts} />
      </div>
    )
  }

  if (!flow) {
    return (
      <div className="panel">
        <p className="error-text">Akış yüklenemedi.</p>
        <ToastList toasts={toasts} />
      </div>
    )
  }

  return (
    <div className="flow-edit-page">
      <section className="panel">
        <h1>Akış Düzenleme Paneli</h1>
        <form className="flow-edit-grid" onSubmit={handleFlowUpdate}>
          <label>
            Akış Adı
            <input
              className="input"
              value={flowForm.flowName}
              onChange={(event) => setFlowForm((prev) => ({ ...prev, flowName: event.target.value }))}
              required
            />
          </label>
          <label>
            Açıklama
            <textarea
              className="input"
              rows={3}
              value={flowForm.aciklama}
              onChange={(event) => setFlowForm((prev) => ({ ...prev, aciklama: event.target.value }))}
            />
          </label>
          <button type="submit" className="button" disabled={flowSaving}>
            {flowSaving ? (
              <span className="flow-edit-loading-line">
                <span className="flow-edit-spinner" />
                Güncelleniyor...
              </span>
            ) : (
              'Akışı Güncelle'
            )}
          </button>
        </form>
      </section>

      <div className="flow-edit-layout">
        <StepList steps={flow.steps} selectedStepId={selectedStepId} onSelectStep={setSelectedStepId} />

        <div className="flow-edit-right">
          <StepEditPanel step={selectedStep} loading={stepSaving} onSave={handleStepUpdate} />
          <FieldList fields={selectedStep?.fields || []} onEditField={setSelectedField} />
        </div>
      </div>

      <FieldEditModal
        open={Boolean(selectedField)}
        field={selectedField}
        loading={fieldSaving}
        onClose={() => {
          if (!fieldSaving) {
            setSelectedField(null)
          }
        }}
        onSave={handleFieldUpdate}
      />

      <ToastList toasts={toasts} />
    </div>
  )
}
