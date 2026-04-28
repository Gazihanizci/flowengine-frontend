import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import StepList from './StepList'
import StepEditPanel from './StepEditPanel'
import FieldList from './FieldList'
import FieldEditModal from './FieldEditModal'
import { useFlowStore } from '../store/flowStore'
import './FlowEditPage.css'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
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
  const navigate = useNavigate()
  const setFlowName = useFlowStore((state) => state.setFlowName)
  const setAciklama = useFlowStore((state) => state.setAciklama)
  const setStarterRoleIds = useFlowStore((state) => state.setStarterRoleIds)
  const setStarterUserIds = useFlowStore((state) => state.setStarterUserIds)
  const initializeSteps = useFlowStore((state) => state.initializeSteps)
  const updateStepNameInStore = useFlowStore((state) => state.updateStepName)
  const updateStepRequiredApprovalCountInStore = useFlowStore((state) => state.updateStepRequiredApprovalCount)
  const updateStepExternalFlowInStore = useFlowStore((state) => state.updateStepExternalFlow)
  const updateStepFieldsInStore = useFlowStore((state) => state.updateStepFields)

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
  const [builderRedirected, setBuilderRedirected] = useState(false)
  const [creatingStep, setCreatingStep] = useState(false)
  const [creatingField, setCreatingField] = useState(false)
  const [newStepForm, setNewStepForm] = useState({
    stepName: '',
    stepOrder: 1,
    requiredApprovalCount: 0,
    externalFlowEnabled: false,
    externalFlowId: '',
    waitForExternalFlowCompletion: false,
    resumeParentAfterSubFlow: false,
    cancelBehavior: 'PROPAGATE',
  })
  const [newFieldForm, setNewFieldForm] = useState({
    stepId: '',
    label: '',
    placeholder: '',
    required: false,
    type: 'TEXT',
    permissions: [{ tip: 'USER', refId: '', yetkiTipi: 'VIEW' }],
    options: [{ label: '', value: '' }],
  })

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

  useEffect(() => {
    if (!selectedStepId) return
    setNewFieldForm((prev) => ({ ...prev, stepId: String(selectedStepId) }))
  }, [selectedStepId])

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

  useEffect(() => {
    if (loading || builderRedirected) return
    if (!flow) return
    openBuilderWithCurrentFlow()
    setBuilderRedirected(true)
  }, [loading, flow, builderRedirected])

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

  async function refreshFlowAfterCreate() {
    if (!flowId) return
    const { data } = await api.get(`/api/flows/${flowId}`)
    const normalized = normalizeFlow(data, flowId)
    setFlow(normalized)
    setSelectedStepId((prev) => prev ?? normalized.steps[0]?.stepId ?? null)
  }

  async function createStep(targetFlowId) {
    const numericFlowId = Number(targetFlowId)
    if (!Number.isFinite(numericFlowId) || numericFlowId <= 0) {
      pushToast('error', 'Geçerli flowId bulunamadı.')
      return
    }

    const requestBody = {
      stepName: String(newStepForm.stepName ?? '').trim(),
      stepOrder: Number(newStepForm.stepOrder),
      requiredApprovalCount: Number(newStepForm.requiredApprovalCount),
      externalFlowEnabled: Boolean(newStepForm.externalFlowEnabled),
      externalFlowId:
        newStepForm.externalFlowId === '' || newStepForm.externalFlowId === null || newStepForm.externalFlowId === undefined
          ? null
          : Number(newStepForm.externalFlowId),
      waitForExternalFlowCompletion: Boolean(newStepForm.waitForExternalFlowCompletion),
      resumeParentAfterSubFlow: Boolean(newStepForm.resumeParentAfterSubFlow),
      cancelBehavior: String(newStepForm.cancelBehavior ?? 'PROPAGATE'),
    }

    if (!requestBody.stepName) {
      pushToast('error', 'Adım adı zorunlu.')
      return
    }

    if (!Number.isFinite(requestBody.stepOrder) || !Number.isFinite(requestBody.requiredApprovalCount)) {
      pushToast('error', 'Sayısal alanları kontrol edin.')
      return
    }

    if (requestBody.externalFlowId !== null && !Number.isFinite(requestBody.externalFlowId)) {
      pushToast('error', 'Harici Akış ID geçerli bir sayı olmalı.')
      return
    }

    setCreatingStep(true)
    try {
      console.log(`POST /api/flows/edit/step/${numericFlowId}`, requestBody)
      await api.post(`/api/flows/edit/step/${numericFlowId}`, requestBody)
      setErrorDetail(null)
      pushToast('success', 'Step oluşturuldu')
      setNewStepForm({
        stepName: '',
        stepOrder: 1,
        requiredApprovalCount: 0,
        externalFlowEnabled: false,
        externalFlowId: '',
        waitForExternalFlowCompletion: false,
        resumeParentAfterSubFlow: false,
        cancelBehavior: 'PROPAGATE',
      })
      await refreshFlowAfterCreate()
    } catch (error) {
      setErrorDetail(buildErrorDetail(error, 'Step oluşturma'))
      pushToast('error', parseErrorMessage(error))
    } finally {
      setCreatingStep(false)
    }
  }

  async function createField(targetStepId) {
    const numericStepId = Number(targetStepId)
    if (!Number.isFinite(numericStepId) || numericStepId <= 0) {
      pushToast('error', 'Geçerli stepId girin.')
      return
    }

    const normalizedType = String(newFieldForm.type ?? 'TEXT')
    const needsOptions = normalizedType === 'SELECT' || normalizedType === 'RADIO'
    const normalizedPermissions = (Array.isArray(newFieldForm.permissions) ? newFieldForm.permissions : [])
      .map((permission) => ({
        tip: permission.tip === 'ROLE' ? 'ROLE' : 'USER',
        refId: Number(permission.refId),
        yetkiTipi: permission.yetkiTipi === 'EDIT' ? 'EDIT' : 'VIEW',
      }))
      .filter((permission) => Number.isFinite(permission.refId) && permission.refId > 0)

    const normalizedOptions = needsOptions
      ? (Array.isArray(newFieldForm.options) ? newFieldForm.options : [])
          .map((option) => ({
            label: String(option.label ?? '').trim(),
            value: String(option.value ?? '').trim(),
          }))
          .filter((option) => option.label && option.value)
      : []

    if (!String(newFieldForm.label ?? '').trim()) {
      pushToast('error', 'Alan etiketi zorunlu.')
      return
    }

    if (needsOptions && normalizedOptions.length === 0) {
      pushToast('error', 'SELECT/RADIO için en az bir option gerekli.')
      return
    }

    const requestBody = {
      label: String(newFieldForm.label ?? '').trim(),
      placeholder: String(newFieldForm.placeholder ?? '').trim(),
      required: Boolean(newFieldForm.required),
      type: normalizedType,
      permissions: normalizedPermissions,
      options: normalizedOptions,
    }

    setCreatingField(true)
    try {
      console.log(`POST /api/flows/edit/field/${numericStepId}`, requestBody)
      console.log('Field create baseURL:', api.defaults.baseURL || window.location.origin)
      await api.post(`/api/flows/edit/field/${numericStepId}`, requestBody)
      setErrorDetail(null)
      pushToast('success', 'Field oluşturuldu')
      setNewFieldForm((prev) => ({
        ...prev,
        label: '',
        placeholder: '',
        required: false,
        type: 'TEXT',
        permissions: [{ tip: 'USER', refId: '', yetkiTipi: 'VIEW' }],
        options: [{ label: '', value: '' }],
      }))
      await refreshFlowAfterCreate()
    } catch (error) {
      setErrorDetail(buildErrorDetail(error, 'Field oluşturma'))
      pushToast('error', parseErrorMessage(error))
    } finally {
      setCreatingField(false)
    }
  }

  function toBuilderFieldType(type) {
    if (type === 'SELECT') return 'COMBOBOX'
    return type || 'TEXT'
  }

  function openBuilderWithCurrentFlow() {
    if (!flow || !Array.isArray(flow.steps)) {
      pushToast('error', 'Düzenlenecek adım bulunamadı.')
      return
    }

    const sourceSteps = [...flow.steps].sort((a, b) => Number(a.stepOrder ?? 0) - Number(b.stepOrder ?? 0))
    if (sourceSteps.length === 0) {
      initializeSteps(1)
      setFlowName(String(flow.flowName || ''))
      setAciklama(String(flow.aciklama || ''))
      navigate('/builder/1')
      return
    }
    const selectedIndex = sourceSteps.findIndex((step) => step.stepId === selectedStepId)
    const startStepId = selectedIndex >= 0 ? selectedIndex + 1 : 1

    setFlowName(String(flow.flowName || ''))
    setAciklama(String(flow.aciklama || ''))
    setStarterRoleIds(
      (Array.isArray(flow.baslatmaYetkileri) ? flow.baslatmaYetkileri : [])
        .filter((item) => item?.tip === 'ROLE')
        .map((item) => Number(item.refId))
        .filter((id) => Number.isFinite(id) && id > 0),
    )
    setStarterUserIds(
      (Array.isArray(flow.baslatmaYetkileri) ? flow.baslatmaYetkileri : [])
        .filter((item) => item?.tip === 'USER')
        .map((item) => Number(item.refId))
        .filter((id) => Number.isFinite(id) && id > 0),
    )
    initializeSteps(sourceSteps.length)

    sourceSteps.forEach((step, index) => {
      const builderStepId = index + 1
      updateStepNameInStore(builderStepId, String(step.stepName || `Adım ${builderStepId}`))
      updateStepRequiredApprovalCountInStore(builderStepId, Number(step.requiredApprovalCount ?? 1))
      updateStepExternalFlowInStore(builderStepId, {
        externalFlowEnabled: Boolean(step.externalFlowEnabled),
        externalFlowId: step.externalFlowId === null || step.externalFlowId === undefined ? null : Number(step.externalFlowId),
        waitForExternalFlowCompletion: Boolean(step.waitForExternalFlowCompletion),
        resumeParentAfterSubFlow: Boolean(step.resumeParentAfterSubFlow),
        cancelBehavior: step.cancelBehavior === 'WAIT' ? 'WAIT' : 'PROPAGATE',
      })

      const builderFields = (Array.isArray(step.fields) ? step.fields : []).map((field, fieldIndex) => ({
        id: `field-${builderStepId}-${field.fieldId || fieldIndex + 1}`,
        type: toBuilderFieldType(field.type),
        label: String(field.label || ''),
        placeholder: String(field.placeholder || ''),
        required: Boolean(field.required),
        permissions: Array.isArray(field.permissions) ? field.permissions : [],
        options: Array.isArray(field.options) ? field.options : [],
      }))

      updateStepFieldsInStore(builderStepId, builderFields)
    })

    navigate(`/builder/${startStepId}`)
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
          <section className="panel flow-edit-create-panel flow-edit-field-builder">
            <h2>Adım Ekle</h2>
            <form
              className="flow-edit-grid flow-edit-field-builder-form"
              onSubmit={async (event) => {
                event.preventDefault()
                await createStep(flow?.flowId ?? flowId)
              }}
            >
              <label>
                Adım Adı
                <input
                  className="input"
                  value={newStepForm.stepName}
                  onChange={(event) => setNewStepForm((prev) => ({ ...prev, stepName: event.target.value }))}
                  required
                />
              </label>
              <label>
                Adım Sırası
                <input
                  className="input"
                  type="number"
                  value={newStepForm.stepOrder}
                  onChange={(event) => setNewStepForm((prev) => ({ ...prev, stepOrder: event.target.value }))}
                  required
                />
              </label>
              <label>
                Gerekli Onay Sayısı
                <input
                  className="input"
                  type="number"
                  value={newStepForm.requiredApprovalCount}
                  onChange={(event) =>
                    setNewStepForm((prev) => ({ ...prev, requiredApprovalCount: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                Harici Akış ID (opsiyonel)
                <input
                  className="input"
                  type="number"
                  value={newStepForm.externalFlowId}
                  onChange={(event) => setNewStepForm((prev) => ({ ...prev, externalFlowId: event.target.value }))}
                />
              </label>
              <label>
                İptal Davranışı
                <select
                  className="input"
                  value={newStepForm.cancelBehavior}
                  onChange={(event) => setNewStepForm((prev) => ({ ...prev, cancelBehavior: event.target.value }))}
                >
                  <option value="PROPAGATE">PROPAGATE</option>
                  <option value="CANCEL">CANCEL</option>
                  <option value="IGNORE">IGNORE</option>
                </select>
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={newStepForm.externalFlowEnabled}
                  onChange={(event) =>
                    setNewStepForm((prev) => ({ ...prev, externalFlowEnabled: event.target.checked }))
                  }
                />
                Harici Akış Etkin
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={newStepForm.waitForExternalFlowCompletion}
                  onChange={(event) =>
                    setNewStepForm((prev) => ({ ...prev, waitForExternalFlowCompletion: event.target.checked }))
                  }
                />
                Harici Akışı Bekle
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={newStepForm.resumeParentAfterSubFlow}
                  onChange={(event) =>
                    setNewStepForm((prev) => ({ ...prev, resumeParentAfterSubFlow: event.target.checked }))
                  }
                />
                Ana Akışa Dön
              </label>
              <button type="submit" className="button" disabled={creatingStep}>
                {creatingStep ? 'Ekleniyor...' : 'Adım Ekle'}
              </button>
            </form>
          </section>

          <StepEditPanel step={selectedStep} loading={stepSaving} onSave={updateStep} />
          <section className="panel flow-edit-create-panel">
            <h2>Alan Ekle</h2>
            <div className="flow-edit-builder-switch">
              <button type="button" className="button secondary" onClick={openBuilderWithCurrentFlow}>
                Form Sayfasında Aç (Sürükle-Bırak)
              </button>
            </div>
            <form
              className="flow-edit-grid"
              onSubmit={async (event) => {
                event.preventDefault()
                await createField(newFieldForm.stepId)
              }}
            >
              <label>
                Adım ID
                <input
                  className="input"
                  type="number"
                  value={newFieldForm.stepId}
                  onChange={(event) => setNewFieldForm((prev) => ({ ...prev, stepId: event.target.value }))}
                  required
                />
              </label>
              <label>
                Etiket
                <input
                  className="input"
                  value={newFieldForm.label}
                  onChange={(event) => setNewFieldForm((prev) => ({ ...prev, label: event.target.value }))}
                  required
                />
              </label>
              <label>
                Yer Tutucu
                <input
                  className="input"
                  value={newFieldForm.placeholder}
                  onChange={(event) => setNewFieldForm((prev) => ({ ...prev, placeholder: event.target.value }))}
                />
              </label>
              <label>
                Tip
                <select
                  className="input"
                  value={newFieldForm.type}
                  onChange={(event) => setNewFieldForm((prev) => ({ ...prev, type: event.target.value }))}
                >
                  <option value="TEXT">TEXT</option>
                  <option value="FILE">FILE</option>
                  <option value="SELECT">SELECT</option>
                  <option value="RADIO">RADIO</option>
                  <option value="DATE">DATE</option>
                </select>
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={newFieldForm.required}
                  onChange={(event) => setNewFieldForm((prev) => ({ ...prev, required: event.target.checked }))}
                />
                Zorunlu
              </label>

              <h3 className="flow-edit-builder-title">Yetkiler</h3>
              {newFieldForm.permissions.map((permission, index) => (
                <div key={`permission-${index}`} className="flow-edit-permission-row">
                  <label>
                    Tip
                    <select
                      className="input"
                      value={permission.tip}
                      onChange={(event) =>
                        setNewFieldForm((prev) => ({
                          ...prev,
                          permissions: prev.permissions.map((item, permissionIndex) =>
                            permissionIndex === index ? { ...item, tip: event.target.value } : item,
                          ),
                        }))
                      }
                    >
                      <option value="USER">USER</option>
                      <option value="ROLE">ROLE</option>
                    </select>
                  </label>
                  <label>
                    Ref ID
                    <input
                      className="input"
                      type="number"
                      value={permission.refId}
                      onChange={(event) =>
                        setNewFieldForm((prev) => ({
                          ...prev,
                          permissions: prev.permissions.map((item, permissionIndex) =>
                            permissionIndex === index ? { ...item, refId: event.target.value } : item,
                          ),
                        }))
                      }
                    />
                  </label>
                  <label>
                    Yetki Tipi
                    <select
                      className="input"
                      value={permission.yetkiTipi}
                      onChange={(event) =>
                        setNewFieldForm((prev) => ({
                          ...prev,
                          permissions: prev.permissions.map((item, permissionIndex) =>
                            permissionIndex === index ? { ...item, yetkiTipi: event.target.value } : item,
                          ),
                        }))
                      }
                    >
                      <option value="VIEW">VIEW</option>
                      <option value="EDIT">EDIT</option>
                    </select>
                  </label>
                </div>
              ))}

              {(newFieldForm.type === 'SELECT' || newFieldForm.type === 'RADIO') && (
                <>
                  <h3 className="flow-edit-builder-title">Seçenekler</h3>
                  {newFieldForm.options.map((option, index) => (
                    <div key={`option-${index}`} className="flow-edit-option-row">
                      <label>
                        Etiket
                        <input
                          className="input"
                          value={option.label}
                          onChange={(event) =>
                            setNewFieldForm((prev) => ({
                              ...prev,
                              options: prev.options.map((item, optionIndex) =>
                                optionIndex === index ? { ...item, label: event.target.value } : item,
                              ),
                            }))
                          }
                        />
                      </label>
                      <label>
                        Değer
                        <input
                          className="input"
                          value={option.value}
                          onChange={(event) =>
                            setNewFieldForm((prev) => ({
                              ...prev,
                              options: prev.options.map((item, optionIndex) =>
                                optionIndex === index ? { ...item, value: event.target.value } : item,
                              ),
                            }))
                          }
                        />
                      </label>
                    </div>
                  ))}
                </>
              )}

              <button type="submit" className="button flow-edit-builder-submit" disabled={creatingField}>
                {creatingField ? 'Ekleniyor...' : 'Alan Ekle'}
              </button>
            </form>
          </section>
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

