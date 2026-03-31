import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TaskForm from '../components/TaskForm'
import TaskList from '../components/TaskList'
import { fetchFlowDetail, fetchFlows } from '../services/flowApi'
import type { FlowDetailResponse, FlowListItem } from '../services/flowApi'
import { fetchMyTasks, submitTaskAction } from '../services/taskApi'
import { useUserStore } from '../store/userStore'
import type { TaskFormData, WorkflowTask } from '../types/task'

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

  const [tasks, setTasks] = useState<WorkflowTask[]>([])
  const [taskLoading, setTaskLoading] = useState(false)
  const [taskError, setTaskError] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [taskFormData, setTaskFormData] = useState<TaskFormData>({})
  const [taskSubmitLoading, setTaskSubmitLoading] = useState(false)
  const [taskSubmitError, setTaskSubmitError] = useState<string | null>(null)
  const [taskSuccessMessage, setTaskSuccessMessage] = useState<string | null>(null)

  const selectedTask = useMemo(
    () => tasks.find((task) => task.taskId === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  )

  useEffect(() => {
    let mounted = true

    const load = async () => {
      if (!isAdmin) {
        setLoading(false)
        return
      }

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
  }, [isAdmin])

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
      } catch (err) {
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

  const formatIds = (ids?: number[]) => {
    if (!ids || ids.length === 0) return '-'
    return ids.join(', ')
  }

  const loadTasks = async () => {
    setTaskLoading(true)
    setTaskError(null)

    try {
      const data = await fetchMyTasks()
      setTasks(Array.isArray(data) ? data : [])
    } catch (err) {
      setTaskError('Gorevler alinamadi.')
    } finally {
      setTaskLoading(false)
    }
  }

  useEffect(() => {
    if (!isLoaded || isAdmin) return
    loadTasks()
  }, [isLoaded, isAdmin])

  useEffect(() => {
    if (!selectedTaskId) return

    const exists = tasks.some((task) => task.taskId === selectedTaskId)
    if (!exists) {
      setSelectedTaskId(null)
      setTaskFormData({})
    }
  }, [tasks, selectedTaskId])

  useEffect(() => {
    if (!taskSuccessMessage) return

    const timer = window.setTimeout(() => {
      setTaskSuccessMessage(null)
    }, 2500)

    return () => {
      window.clearTimeout(timer)
    }
  }, [taskSuccessMessage])

  const handleTaskSelect = (task: WorkflowTask) => {
    setSelectedTaskId(task.taskId)
    setTaskSubmitError(null)

    const initialData: TaskFormData = {}
    task.form.forEach((field) => {
      initialData[field.fieldId] = field.type === 'CHECKBOX' ? false : ''
    })

    setTaskFormData(initialData)
  }

  const handleTaskFieldChange = (fieldId: number, value: TaskFormData[number]) => {
    setTaskFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }))
  }

  const handleTaskAction = async (aksiyonId: 1 | 2) => {
    if (!selectedTask) return

    setTaskSubmitLoading(true)
    setTaskSubmitError(null)

    try {
      await submitTaskAction(selectedTask.taskId, {
        aksiyonId,
        formData: taskFormData,
      })

      setTaskSuccessMessage('Islem basariyla tamamlandi.')
      setSelectedTaskId(null)
      setTaskFormData({})
      await loadTasks()
    } catch (err) {
      setTaskSubmitError('Aksiyon gonderilemedi.')
    } finally {
      setTaskSubmitLoading(false)
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

  return (
    <div className="dashboard">
      <div className="dashboard-shell">
        <div className="dashboard-top">
          <div>
            <h1>{isAdmin ? 'Is Akisi Paneli' : 'Workflow Dashboard'}</h1>
            <p>
              {isAdmin
                ? 'Akislari yonetin, adimlari ve form alanlarini inceleyin.'
                : 'Uzerinizdeki gorevleri secin, formu doldurun ve aksiyon alin.'}
            </p>
          </div>
          {isAdmin ? (
            <button
              className="button primary"
              type="button"
              onClick={() => navigate('/create-flow')}
            >
              Yeni Akis Olustur
            </button>
          ) : null}
        </div>

        {isAdmin ? (
          <>
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
                <strong>{flowDetail?.steps.reduce((sum, step) => sum + step.fields.length, 0) ?? 0}</strong>
              </div>
            </div>

            <div className="dashboard-grid">
              <section className="panel flow-list-panel">
                <div className="panel-header">
                  <h2>Akislar</h2>
                  <span>{flows.length} kayit</span>
                </div>

                {loading && <p className="hint">Yukleniyor...</p>}
                {error && <p className="error-text">{error}</p>}

                {!loading && !error && flows.length === 0 && (
                  <p className="hint">Henuz kayitli akis yok.</p>
                )}

                {!loading && !error && flows.length > 0 && (
                  <div className="flow-list-scroll">
                    <div className="flow-list-head">
                      <span>ID</span>
                      <span>Akis Adi</span>
                      <span>Aciklama</span>
                    </div>
                    <div className="flow-list">
                      {flows.map((flow) => (
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
                          <span>{formatIds(field.roleIds)}</span>
                          <span>{formatIds(field.userIds)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
        ) : (
          <section className="space-y-4">
            {taskSuccessMessage ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {taskSuccessMessage}
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
              <TaskList
                tasks={tasks}
                selectedTaskId={selectedTaskId}
                loading={taskLoading}
                error={taskError}
                onSelectTask={handleTaskSelect}
                onRetry={loadTasks}
              />

              <TaskForm
                task={selectedTask}
                formData={taskFormData}
                submitError={taskSubmitError}
                submitting={taskSubmitLoading}
                onChangeField={handleTaskFieldChange}
                onSubmitAction={handleTaskAction}
              />
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
