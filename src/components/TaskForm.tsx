import TaskFieldRenderer from './TaskFieldRenderer'
import type { TaskFormData, TaskFormValue, WorkflowTask } from '../types/task'

interface TaskFormProps {
  task: WorkflowTask | null
  formData: TaskFormData
  submitError: string | null
  submitting: boolean
  onChangeField: (fieldId: number, value: TaskFormValue) => void
  onSubmitAction: (aksiyonId: number) => void
}

export default function TaskForm({
  task,
  formData,
  submitError,
  submitting,
  onChangeField,
  onSubmitAction,
}: TaskFormProps) {
  if (!task) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-sm font-medium text-slate-500">Soldan bir gorev secin.</p>
          <p className="mt-1 text-xs text-slate-400">Secim yapildiginda adim formu burada acilir.</p>
        </div>
      </section>
    )
  }

  const hasButtonBasedAction = task.form.some((field) => {
    if (field.type !== 'BUTTON') return false
    if (typeof field.actionId === 'number') return true
    if (typeof field.value === 'number') return true
    if (typeof field.value === 'string' && !Number.isNaN(Number(field.value))) return true
    if (field.options?.[0]?.value && !Number.isNaN(Number(field.options[0].value))) return true
    return false
  })
  const nextActionId =
    task.actions?.find((action) => {
      const label = action.label.toLowerCase()
      return label.includes('ilerle') || label.includes('devam') || label.includes('onay')
    })?.actionId ?? task.actions?.[0]?.actionId ?? 1
  const finishActionId =
    task.actions?.find((action) => {
      const label = action.label.toLowerCase()
      return (
        label.includes('iptal') ||
        label.includes('reddet') ||
        label.includes('vazgec') ||
        label.includes('cancel')
      )
    })?.actionId ?? 2

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
      <div className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-cyan-50 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Workflow Formu</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">{task.adimAdi}</h2>
            <p className="mt-1 text-sm text-slate-500">Task ID: {task.taskId}</p>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
              {task.form.filter((field) => field.editable).length} Duzenlenebilir
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              {task.form.length} Toplam Alan
            </span>
          </div>
        </div>
      </div>

      <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
        <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700">Duzenlenebilir Alanlar</p>
          <p className="mt-1 text-sm text-cyan-900">Bu alanlar uzerinde degisiklik yapabilirsiniz.</p>
        </div>
        <div className="rounded-xl border border-slate-300 bg-slate-200 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-700">Salt Okunur Alanlar</p>
          <p className="mt-1 text-sm text-slate-700">Bu alanlar onceki adimlardan gelir ve duzenlenemez.</p>
        </div>
      </div>

      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
        }}
      >
        <div className="grid gap-4">
          {task.form.map((field) => (
            <TaskFieldRenderer
              key={field.fieldId}
              field={field}
              value={formData[field.fieldId]}
              onChange={onChangeField}
              onTriggerAction={onSubmitAction}
            />
          ))}
        </div>

        {submitError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {submitError}
          </div>
        ) : null}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-sm font-medium text-slate-700">
            Formu kontrol ettikten sonra aksiyon secin.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => onSubmitAction(nextActionId)}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              {submitting ? 'Gonderiliyor...' : 'Ilerle'}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => onSubmitAction(finishActionId)}
              className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {submitting ? 'Gonderiliyor...' : 'Bitir'}
            </button>
            {(task.actions ?? []).map((action) => {
              const lowerLabel = action.label.toLowerCase()
              const actionClassName = lowerLabel.includes('reddet')
                ? 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300'
                : lowerLabel.includes('onay')
                  ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300'
                  : 'bg-cyan-600 hover:bg-cyan-700 disabled:bg-cyan-300'

              return (
                <button
                  key={action.actionId}
                  type="button"
                  disabled={submitting}
                  onClick={() => onSubmitAction(action.actionId)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed ${actionClassName}`}
                >
                  {submitting ? 'Gonderiliyor...' : action.label}
                </button>
              )
            })}
            {(task.actions ?? []).length === 0 && !hasButtonBasedAction ? (
              <p className="text-sm text-slate-500">Bu adim icin tanimli aksiyon bulunamadi.</p>
            ) : null}
          </div>
        </div>
      </form>
    </section>
  )
}
