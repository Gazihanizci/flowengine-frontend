import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFlowStore } from '../store/flowStore'

export default function CreateFlow() {
  const navigate = useNavigate()
  const setFlowName = useFlowStore((state) => state.setFlowName)
  const setAciklama = useFlowStore((state) => state.setAciklama)
  const initializeSteps = useFlowStore((state) => state.initializeSteps)

  const [flowName, setFlowNameInput] = useState('')
  const [aciklama, setAciklamaInput] = useState('')
  const [stepCount, setStepCount] = useState(1)
  const [formError, setFormError] = useState<string | null>(null)

  const handleCreate = () => {
    if (!flowName.trim() || !aciklama.trim()) {
      setFormError('Akis adi ve aciklama bos birakilamaz.')
      return
    }

    const count = Math.max(1, Number(stepCount))
    setFormError(null)
    setFlowName(flowName.trim())
    setAciklama(aciklama.trim())
    initializeSteps(count)
    navigate('/builder/1')
  }

  return (
    <div className="create-flow">
      <div className="w-full max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-[1fr,1.25fr]">
          <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-[0_20px_45px_rgba(2,6,23,0.35)]">
            <div className="pointer-events-none absolute -right-14 -top-14 h-40 w-40 rounded-full bg-cyan-400/20 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-10 left-16 h-28 w-28 rounded-full bg-sky-400/25 blur-2xl" />

            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Flow Designer</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">Akis Olustur</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Bu ekranda akis kimligini tanimlarsin. Sonraki adimda her step icin form alanlarini ve
                gecis davranislarini detaylandirirsin.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/20 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-300">Durum</p>
                  <p className="mt-1 text-lg font-semibold">Taslak</p>
                </div>
                <div className="rounded-xl border border-white/20 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-300">Baslangic Adimi</p>
                  <p className="mt-1 text-lg font-semibold">Adim 1</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_35px_rgba(15,23,42,0.08)]">
            <div className="mb-5 border-b border-slate-100 pb-4">
              <h2 className="text-2xl font-semibold text-slate-900">Akis Bilgileri</h2>
              <p className="mt-1 text-sm text-slate-500">Akis adi, aciklama ve adim sayisini belirleyin.</p>
            </div>

            <div className="grid gap-4">
              <label>
                <span>Akis Adi</span>
                <input
                  className="input"
                  value={flowName}
                  onChange={(event) => setFlowNameInput(event.target.value)}
                  placeholder="Orn: Dosya Gonderim"
                />
              </label>

              <label>
                <span>Aciklama</span>
                <textarea
                  className="input"
                  rows={4}
                  value={aciklama}
                  onChange={(event) => setAciklamaInput(event.target.value)}
                  placeholder="Akisin kapsamini ve is amacini yazin"
                />
              </label>

              <label>
                <span>Adim Sayisi</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    onClick={() => setStepCount((prev) => Math.max(1, prev - 1))}
                  >
                    -
                  </button>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={stepCount}
                    onChange={(event) => setStepCount(Math.max(1, Number(event.target.value) || 1))}
                  />
                  <button
                    type="button"
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    onClick={() => setStepCount((prev) => prev + 1)}
                  >
                    +
                  </button>
                </div>
              </label>
            </div>

            {formError ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button className="button secondary" type="button" onClick={() => navigate('/')}>
                Vazgec
              </button>
              <button className="button primary" type="button" onClick={handleCreate}>
                Tasarima Gec
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
