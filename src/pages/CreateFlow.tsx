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

  const handleCreate = () => {
    const count = Math.max(1, Number(stepCount))
    setFlowName(flowName.trim() || 'Yeni Akış')
    setAciklama(aciklama.trim())
    initializeSteps(count)
    navigate('/builder/1')
  }

  return (
    <div className="create-flow">
      <div className="dashboard-card">
        <h1>Akış Oluştur</h1>
        <p>Akış adı, açıklama ve adım sayısını belirleyin.</p>

        <label>
          <span>Akış Adı</span>
          <input
            className="input"
            value={flowName}
            onChange={(event) => setFlowNameInput(event.target.value)}
            placeholder="Örn: Dosya Gönderim"
          />
        </label>

        <label>
          <span>Açıklama</span>
          <textarea
            className="input"
            rows={3}
            value={aciklama}
            onChange={(event) => setAciklamaInput(event.target.value)}
            placeholder="Akış kısa açıklaması"
          />
        </label>

        <label>
          <span>Adım Sayısı</span>
          <input
            className="input"
            type="number"
            min={1}
            value={stepCount}
            onChange={(event) => setStepCount(Number(event.target.value))}
          />
        </label>

        <button className="button primary" type="button" onClick={handleCreate}>
          Oluştur
        </button>
      </div>
    </div>
  )
}