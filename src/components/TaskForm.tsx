import TaskFieldRenderer from './TaskFieldRenderer'
import type { TaskFileMap, TaskFormData, TaskFormValue, WorkflowTask } from '../types/task'

interface TaskFormProps {
  task: WorkflowTask | null
  formData: TaskFormData
  files: TaskFileMap
  submitError: string | null
  loadingAction: 'save' | 'submit' | 'cancel' | null
  onChangeField: (fieldId: number, value: TaskFormValue) => void
  onChangeFile: (fieldId: number, file: File | null) => void
  onSave: () => void
  onSubmit: () => void
  onCancel: () => void
}

export default function TaskForm({
  task,
  formData,
  files,
  submitError,
  loadingAction,
  onChangeField,
  onChangeFile,
  onSave,
  onSubmit,
  onCancel,
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

      <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Akis Adi</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{task.akisAdi?.trim() || '-'}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Akis Aciklamasi</p>
          <p className="mt-1 text-sm text-slate-700">{task.akisAciklama?.trim() || '-'}</p>
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
              fileName={files[field.fieldId]?.name}
              onChange={onChangeField}
              onFileChange={onChangeFile}
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
            Kaydet taslak olusturur ve validation atlar. Gonder butonu zorunlu alan kontrolu yapar.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={onSave}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {loadingAction === 'save' ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                  Kaydediliyor...
                </>
              ) : (
                'Kaydet'
              )}
            </button>
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={onCancel}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
            >
              {loadingAction === 'cancel' ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                  Iptal ediliyor...
                </>
              ) : (
                'Formu Iptal Et'
              )}
            </button>
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={onSubmit}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              {loadingAction === 'submit' ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                  Gonderiliyor...
                </>
              ) : (
                'Gonder'
              )}
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}
