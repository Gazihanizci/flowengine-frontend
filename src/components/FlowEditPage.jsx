import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import StepList from './StepList'
import StepEditPanel from './StepEditPanel'
import FieldList from './FieldList'
import FieldEditModal from './FieldEditModal'
import './FlowEditPage.css'

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

function buildErrorDetail(error, fallbackAction) {
  if (!axios.isAxiosError(error)) {
    return {
      action: fallbackAction,
      status: '-',
      method: '-',
      url: '-',
      message: error instanceof Error ? error.message : 'Bilinmeyen hata',
      responseBody: null,
    }
  }

  return {
    action: fallbackAction,
    status: String(error.response?.status ?? '-'),
    method: String(error.config?.method ?? '-').toUpperCase(),
    url: error.config?.url ?? '-',
    message: parseErrorMessage(error),
    responseBody: error.response?.data ?? null,
  }
}

function extractBackendErrorText(responseBody) {
  if (responseBody === null || responseBody === undefined) return null
  if (typeof responseBody === 'string') return responseBody
  if (typeof responseBody === 'object') {
    return (
      responseBody.message ||
      responseBody.error ||
      responseBody.detail ||
      responseBody.mesaj ||
      responseBody.title ||
      null
    )
  }
  return null
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
  const [errorDetail, setErrorDetail] = useState(null)
  const [stepQuery, setStepQuery] = useState('')
  const [fieldQuery, setFieldQuery] = useState('')
  const [editableOnly, setEditableOnly] = useState(false)

  const selectedStep = useMemo(
    () => flow?.steps.find((step) => step.stepId === selectedStepId) ?? null,
    [flow, selectedStepId],
  )
  const totalFieldCount = useMemo(
    () => (flow?.steps || []).reduce((sum, step) => sum + (step.fields?.length || 0), 0),
    [flow],
  )
  const flowFormDirty = useMemo(() => {
    if (!flow) return false
    return flowForm.flowName.trim() !== (flow.flowName || '') || flowForm.aciklama.trim() !== (flow.aciklama || '')
  }, [flow, flowForm])
  const filteredSteps = useMemo(() => {
    const list = flow?.steps || []
    const query = stepQuery.trim().toLocaleLowerCase('tr-TR')
    if (!query) return list
    return list.filter((step) => {
      const name = String(step.stepName || '').toLocaleLowerCase('tr-TR')
      return name.includes(query) || String(step.stepOrder).includes(query) || String(step.stepId).includes(query)
    })
  }, [flow, stepQuery])
  const filteredFields = useMemo(() => {
    const list = selectedStep?.fields || []
    const query = fieldQuery.trim().toLocaleLowerCase('tr-TR')
    return list.filter((field) => {
      if (editableOnly && !field.editable) return false
      if (!query) return true
      const label = String(field.label || '').toLocaleLowerCase('tr-TR')
      const type = String(field.type || '').toLocaleLowerCase('tr-TR')
      return label.includes(query) || type.includes(query) || String(field.fieldId).includes(query)
    })
  }, [selectedStep, fieldQuery, editableOnly])

  useEffect(() => {
    if (!selectedStepId) return
    const existsInFiltered = filteredSteps.some((step) => step.stepId === selectedStepId)
    if (!existsInFiltered) {
      setSelectedStepId(filteredSteps[0]?.stepId ?? null)
    }
  }, [filteredSteps, selectedStepId])

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
        setErrorDetail(null)
        setFlowForm({
          flowName: normalized.flowName,
          aciklama: normalized.aciklama,
        })
        setSelectedStepId(normalized.steps[0]?.stepId ?? null)
      } catch (error) {
        setErrorDetail(buildErrorDetail(error, 'Akış detayını yükleme'))
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

  async function updateFlow() {
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
      const normalizedBaslatmaYetkileri = Array.isArray(flow.baslatmaYetkileri)
        ? flow.baslatmaYetkileri
            .map((item) => ({
              tip: item?.tip === 'ROLE' ? 'ROLE' : 'USER',
              refId: parseInt(String(item?.refId ?? 0), 10),
            }))
            .filter((item) => Number.isFinite(item.refId) && item.refId > 0)
        : []

      const requestBody = {
        flowName: optimisticFlow.flowName,
        aciklama: optimisticFlow.aciklama,
        ...(normalizedBaslatmaYetkileri.length > 0
          ? { baslatmaYetkileri: normalizedBaslatmaYetkileri }
          : {}),
      }
      console.log('PUT /api/flows/edit/{flowId}', requestBody)
      await api.put(`/api/flows/edit/${flow.flowId}`, requestBody)
      setErrorDetail(null)
      pushToast('success', 'Ak?? g?ncellendi')
    } catch (error) {
      setFlow((prev) => (prev ? { ...prev, ...rollback } : prev))
      setErrorDetail(buildErrorDetail(error, 'Akış güncelleme'))
      pushToast('error', parseErrorMessage(error))
    } finally {
      setFlowSaving(false)
    }
  }
  async function updateStep(stepId, payload) {
    if (!flow) return
    const numericStepId = parseInt(String(stepId), 10)
    const previousStep = flow.steps.find((step) => step.stepId === numericStepId)
    if (!previousStep) return
    const requestBody = {
      stepName: String(payload.stepName ?? '').trim(),
      stepOrder: parseInt(String(payload.stepOrder ?? 0), 10),
      requiredApprovalCount: parseInt(String(payload.requiredApprovalCount ?? 0), 10),
      externalFlowEnabled: Boolean(payload.externalFlowEnabled),
      externalFlowId:
        payload.externalFlowId === '' || payload.externalFlowId === undefined || payload.externalFlowId === null
          ? null
          : parseInt(String(payload.externalFlowId), 10),
      waitForExternalFlowCompletion: Boolean(payload.waitForExternalFlowCompletion),
      resumeParentAfterSubFlow: Boolean(payload.resumeParentAfterSubFlow),
      cancelBehavior: String(payload.cancelBehavior ?? 'PROPAGATE'),
    }
    patchStepInFlow(numericStepId, requestBody)
    setStepSaving(true)
    try {
      console.log('PUT /api/flows/edit/step/{stepId}', requestBody)
      await api.put(`/api/flows/edit/step/${numericStepId}`, requestBody)
      setErrorDetail(null)
      pushToast('success', 'Ad?m g?ncellendi')
    } catch (error) {
      patchStepInFlow(numericStepId, previousStep)
      setErrorDetail(buildErrorDetail(error, 'Adım güncelleme'))
      pushToast('error', parseErrorMessage(error))
    } finally {
      setStepSaving(false)
    }
  }
  async function updateField(fieldId, payload) {
    if (!flow || !selectedStepId) return
    const numericStepId = parseInt(String(selectedStepId), 10)
    const currentStep = flow.steps.find((step) => step.stepId === numericStepId)
    const effectiveFieldId = parseInt(String(selectedField?.fieldId ?? fieldId), 10)
    const previousField = currentStep?.fields.find((field) => field.fieldId === effectiveFieldId)
    if (!currentStep || !previousField) return
    const requestBody = {
      label: String(payload.label ?? '').trim(),
      placeholder: String(payload.placeholder ?? '').trim(),
      required: Boolean(payload.required),
      permissions: Array.isArray(payload.permissions)
        ? payload.permissions.map((permission) => ({
            tip: permission.tip === 'ROLE' ? 'ROLE' : 'USER',
            refId: parseInt(String(permission.refId ?? 0), 10),
            yetkiTipi: permission.yetkiTipi === 'EDIT' ? 'EDIT' : 'VIEW',
          }))
        : [],
      options: Array.isArray(payload.options)
        ? payload.options.map((option) => ({
            label: String(option.label ?? ''),
            value: String(option.value ?? ''),
          }))
        : [],
    }
    patchFieldInFlow(numericStepId, effectiveFieldId, requestBody)
    setFieldSaving(true)
    try {
      console.log('PUT /api/flows/edit/field/{fieldId}', requestBody)
      await api.put(`/api/flows/edit/field/${effectiveFieldId}`, requestBody)
      setSelectedField(null)
      setErrorDetail(null)
      pushToast('success', 'Alan g?ncellendi')
    } catch (error) {
      patchFieldInFlow(numericStepId, effectiveFieldId, previousField)
      setErrorDetail(buildErrorDetail(error, 'Alan güncelleme'))
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
      {errorDetail ? (
        <section className="panel flow-edit-error-panel">
          <h2>Detaylı Hata</h2>
          <p className="error-text">
            {errorDetail.action}: {errorDetail.message}
          </p>
          <p className="hint">
            Backend Mesajı:{' '}
            {extractBackendErrorText(errorDetail.responseBody) ?? 'Backend tarafından okunabilir bir hata mesajı dönmedi.'}
          </p>
          <p className="hint">
            HTTP {errorDetail.status} | {errorDetail.method} {errorDetail.url}
          </p>
          <pre className="hint" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(errorDetail.responseBody, null, 2)}
          </pre>
        </section>
      ) : null}

      <section className="panel flow-edit-main-panel">
        <h1 className="flow-edit-title">Akış Düzenleme Paneli</h1>
        <p className="hint flow-edit-subtitle">Akış bilgilerini, adımları ve alan ayarlarını tek ekrandan yönetin.</p>
        <form
          className="flow-edit-grid"
          onSubmit={async (event) => {
            event.preventDefault()
            await updateFlow()
          }}
        >
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
          <button type="submit" className="button" disabled={flowSaving || !flowFormDirty}>
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
        <section className="panel flow-edit-step-list-panel">
          <h2>Adimlar</h2>
          <p className="hint">
            Toplam {flow.steps.length} adim, {totalFieldCount} alan
          </p>
          <input
            className="input"
            placeholder="Adim ara (ad, sira, id)"
            value={stepQuery}
            onChange={(event) => setStepQuery(event.target.value)}
          />
          <StepList steps={filteredSteps} selectedStepId={selectedStepId} onSelectStep={setSelectedStepId} />
        </section>

        <div className="flow-edit-right">
          <StepEditPanel step={selectedStep} loading={stepSaving} onSave={updateStep} />
          <section className="panel">
            <h2>Alan Filtreleri</h2>
            <div className="flow-edit-grid">
              <label>
                Alan ara
                <input
                  className="input"
                  placeholder="Etiket, tip veya id"
                  value={fieldQuery}
                  onChange={(event) => setFieldQuery(event.target.value)}
                />
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={editableOnly}
                  onChange={(event) => setEditableOnly(event.target.checked)}
                />
                Sadece duzenlenebilir alanlari goster
              </label>
            </div>
          </section>
          <FieldList fields={filteredFields} onEditField={setSelectedField} />
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
        onSave={updateField}
      />

      <ToastList toasts={toasts} />
    </div>
  )
}

