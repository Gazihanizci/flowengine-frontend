import TaskFieldRenderer from './TaskFieldRenderer'
import type { TaskFormData, WorkflowTask } from '../types/task'

interface TaskFormProps {
  task: WorkflowTask | null
  formData: TaskFormData
  submitError: string | null
  submitting: boolean
  onChangeField: (fieldId: number, value: TaskFormData[number]) => void
  onSubmitAction: (aksiyonId: 1 | 2) => void
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
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-center text-sm text-slate-500">Soldan bir gorev secin.</p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Workflow Formu</p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">{task.adimAdi}</h2>
        <p className="mt-1 text-sm text-slate-500">Task ID: {task.taskId}</p>
      </div>

      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmitAction(1)
        }}
      >
        <div className="grid gap-4">
          {task.form.map((field) => (
            <TaskFieldRenderer
              key={field.fieldId}
              field={field}
              value={formData[field.fieldId]}
              onChange={onChangeField}
            />
          ))}
        </div>

        {submitError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {submitError}
          </div>
        ) : null}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-3 text-sm text-slate-600">Formu kontrol ettikten sonra aksiyon secin.</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {submitting ? 'Gonderiliyor...' : 'Onayla'}
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => onSubmitAction(2)}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
            >
              {submitting ? 'Gonderiliyor...' : 'Reddet'}
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}
