import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react'

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
        className="button secondary inline-flex items-center gap-1.5"
        type="button"
        onClick={onPrev}
        disabled={isFirst}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Önceki Adım
      </button>
      {isLast ? (
        <button className="button primary inline-flex items-center gap-1.5" type="button" onClick={onFinish}>
          <CheckCircle2 className="h-3.5 w-3.5" />
          Akışı Tamamla
        </button>
      ) : (
        <button className="button primary inline-flex items-center gap-1.5" type="button" onClick={onNext}>
          Sonraki Adım
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}