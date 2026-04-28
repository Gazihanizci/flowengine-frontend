import { useEffect, useState } from 'react'

const CANCEL_BEHAVIORS = ['PROPAGATE', 'CANCEL', 'IGNORE']

function toNullableNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export default function StepEditPanel({ step, loading, onSave }) {
  const [form, setForm] = useState({
    stepName: '',
    stepOrder: 1,
    requiredApprovalCount: 0,
    externalFlowEnabled: false,
    externalFlowId: '',
    waitForExternalFlowCompletion: false,
    resumeParentAfterSubFlow: false,
    cancelBehavior: 'PROPAGATE',
  })
  const [initialForm, setInitialForm] = useState(null)

  useEffect(() => {
    if (!step) return

    const nextForm = {
      stepName: step.stepName || '',
      stepOrder: Number(step.stepOrder ?? 1),
      requiredApprovalCount: Number(step.requiredApprovalCount ?? 0),
      externalFlowEnabled: Boolean(step.externalFlowEnabled),
      externalFlowId: step.externalFlowId ?? '',
      waitForExternalFlowCompletion: Boolean(step.waitForExternalFlowCompletion),
      resumeParentAfterSubFlow: Boolean(step.resumeParentAfterSubFlow),
      cancelBehavior: step.cancelBehavior || 'PROPAGATE',
    }
    setForm(nextForm)
    setInitialForm(nextForm)
  }, [step])

  const stepDirty = JSON.stringify(form) !== JSON.stringify(initialForm)

  if (!step) {
    return (
      <section className="panel">
        <h2>Adım Düzenleme</h2>
        <p className="hint">Düzenlemek için sol listeden bir adım seçin.</p>
      </section>
    )
  }

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()

    onSave(step.stepId, {
      stepName: form.stepName.trim(),
      stepOrder: Number(form.stepOrder),
      requiredApprovalCount: Number(form.requiredApprovalCount),
      externalFlowEnabled: Boolean(form.externalFlowEnabled),
      externalFlowId: toNullableNumber(form.externalFlowId),
      waitForExternalFlowCompletion: Boolean(form.waitForExternalFlowCompletion),
      resumeParentAfterSubFlow: Boolean(form.resumeParentAfterSubFlow),
      cancelBehavior: form.cancelBehavior,
    })
  }

  return (
    <section className="panel">
      <h2>Adım Düzenleme</h2>
      <form className="flow-edit-grid" onSubmit={handleSubmit}>
        <label>
          Adım Adı
          <input
            className="input"
            value={form.stepName}
            onChange={(event) => updateForm('stepName', event.target.value)}
            required
          />
        </label>
        <label>
          Adım Sırası
          <input
            className="input"
            type="number"
            min={1}
            value={form.stepOrder}
            onChange={(event) => updateForm('stepOrder', event.target.value)}
            required
          />
        </label>
        <label>
          Gerekli Onay Sayısı
          <input
            className="input"
            type="number"
            min={0}
            value={form.requiredApprovalCount}
            onChange={(event) => updateForm('requiredApprovalCount', event.target.value)}
            required
          />
        </label>
        <label>
          Harici Akış ID
          <input
            className="input"
            type="number"
            min={1}
            value={form.externalFlowId}
            onChange={(event) => updateForm('externalFlowId', event.target.value)}
          />
        </label>
        <label>
          İptal Davranışı
          <select
            className="input"
            value={form.cancelBehavior}
            onChange={(event) => updateForm('cancelBehavior', event.target.value)}
          >
            {CANCEL_BEHAVIORS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.externalFlowEnabled}
            onChange={(event) => updateForm('externalFlowEnabled', event.target.checked)}
          />
          Harici akış etkin
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.waitForExternalFlowCompletion}
            onChange={(event) => updateForm('waitForExternalFlowCompletion', event.target.checked)}
          />
          Harici akışın tamamlanmasını bekle
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.resumeParentAfterSubFlow}
            onChange={(event) => updateForm('resumeParentAfterSubFlow', event.target.checked)}
          />
          Alt akış sonrası ana akışa dön
        </label>

        <button className="button" type="submit" disabled={loading || !stepDirty}>
          {loading ? (
            <span className="flow-edit-loading-line">
              <span className="flow-edit-spinner" />
              Güncelleniyor...
            </span>
          ) : (
            'Adımı Güncelle'
          )}
        </button>
      </form>
    </section>
  )
}
