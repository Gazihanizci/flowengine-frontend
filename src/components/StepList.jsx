export default function StepList({ steps, selectedStepId, onSelectStep }) {
  if (!steps.length) {
    return (
      <section className="panel flow-edit-step-list-panel">
        <h2>Adımlar</h2>
        <p className="hint">Henüz adım bulunmuyor.</p>
      </section>
    )
  }

  return (
    <section className="panel flow-edit-step-list-panel">
      <h2>Adımlar</h2>
      <div className="flow-edit-step-list">
        {steps.map((step) => {
          const isSelected = step.stepId === selectedStepId

          return (
            <button
              key={step.stepId}
              type="button"
              className={`flow-edit-step-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectStep(step.stepId)}
            >
              <strong>{step.stepName || 'İsimsiz Adım'}</strong>
              <span>Sıra: {step.stepOrder}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
