import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import FieldRenderer from '../components/FieldRenderer'
import ActionButtons from '../components/ActionButtons'
import FileList from '../components/FileList'
import { fetchWorkflow, sendWorkflowAction } from '../services/workflowApi'
import { useUserStore } from '../store/userStore'
import type { FormState, WorkflowResponse } from '../types/workflow'

export default function FlowPage() {
  const { surecId } = useParams<{ surecId: string }>()
  const user = useUserStore((state) => state.user)
  const [data, setData] = useState<WorkflowResponse | null>(null)
  const [formState, setFormState] = useState<FormState>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const initializeForm = useCallback((workflow: WorkflowResponse) => {
    const initialState: FormState = {}
    workflow.form.forEach((field) => {
      const value = field.value ?? null
      initialState[field.id] = value
    })
    setFormState(initialState)
  }, [])

  const loadWorkflow = useCallback(async () => {
    if (!surecId) return
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetchWorkflow(surecId)
      setData(response)
      initializeForm(response)
    } catch {
      setError('Veri alınamadı. Lütfen tekrar deneyin.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [initializeForm, surecId])

  useEffect(() => {
    loadWorkflow()
  }, [loadWorkflow])

  const handleChange = (fieldId: number, value: FormState[number]) => {
    setFormState((prev) => ({
      ...prev,
      [fieldId]: value,
    }))
  }

  const requiredMissing = useMemo(() => {
    if (!data) return []
    return data.form.filter((field) => {
      if (!field.required) return false
      const value = formState[field.id]
      return value === null || value === '' || value === undefined
    })
  }, [data, formState])

  const handleAction = async (actionId: number) => {
    if (!surecId) return

    if (requiredMissing.length > 0) {
      setError('Zorunlu alanları doldurunuz.')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      await sendWorkflowAction({
        surecId: Number(surecId),
        aksiyonId: actionId,
        formData: formState,
      })
      setSuccess('Aksiyon başarıyla gönderildi.')
      await loadWorkflow()
    } catch {
      setError('Aksiyon gönderilemedi. Lütfen tekrar deneyin.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!surecId) {
    return (
      <div className="page flow-workspace-page">
        <div className="card flow-workspace-card">
          <h2>Surec bulunamadi</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="page flow-page flow-workspace-page">
      <div className="card flow-workspace-card">
        <header className="flow-workspace-head">
          <div>
            <p className="eyebrow">Süreç Çalışma Alanı</p>
            <h1>{data?.adimAdi ?? 'yükleniyor...'}</h1>
            <p className="hint">Süreç #{surecId}</p>
          </div>
          <div className="flow-workspace-kpi">
            <span>Adım {data?.adimId ?? '-'}</span>
            <span>{requiredMissing.length} Eksik Zorunlu Alan</span>
          </div>
        </header>

        {loading && <p className="hint">Veri yukleniyor...</p>}
        {error && <p className="error-text">{error}</p>}
        {success && <p className="success-text">{success}</p>}

        {data && (
          <>
            <FileList files={data.files} />

            <section className="form flow-form-grid">
              {data.form.map((field) => (
                <FieldRenderer
                  key={field.id}
                  field={field}
                  value={formState[field.id]}
                  onChange={handleChange}
                  uploadContext={
                    surecId && data
                      ? {
                          surecId: Number(surecId),
                          adimId: data.adimId,
                          aksiyonId: 1,
                          userId: user?.kullaniciId ?? 5,
                        }
                      : undefined
                  }
                />
              ))}
            </section>

            <ActionButtons actions={data.actions} loading={submitting} onAction={handleAction} />
          </>
        )}
      </div>
    </div>
  )
}
