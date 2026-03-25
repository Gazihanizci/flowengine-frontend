interface StepNavigationProps {
  currentStep: number
  totalSteps: number
  onPrev: () => void
  onNext: () => void
  onFinish: () => void
}

export default function StepNavigation({
  currentStep,
  totalSteps,
  onPrev,
  onNext,
  onFinish,
}: StepNavigationProps) {
  const isFirst = currentStep <= 1
  const isLast = currentStep >= totalSteps

  return (
    <div className="step-navigation">
      <button
        className="button secondary"
        type="button"
        onClick={onPrev}
        disabled={isFirst}
      >
        Önceki Adım
      </button>
      {isLast ? (
        <button className="button primary" type="button" onClick={onFinish}>
          Akışı Tamamla
        </button>
      ) : (
        <button className="button primary" type="button" onClick={onNext}>
          Sonraki Adım
        </button>
      )}
    </div>
  )
}