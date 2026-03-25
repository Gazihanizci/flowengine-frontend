import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchFlows } from '../services/flowApi'
import type { FlowListItem } from '../services/flowApi'

export default function Dashboard() {
  const navigate = useNavigate()
  const [flows, setFlows] = useState<FlowListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        setLoading(true)
        const data = await fetchFlows()
        if (mounted) {
          setFlows(data)
        }
      } catch (err) {
        if (mounted) {
          setError('Akış listesi alınamadı.')
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
  }, [])

  return (
    <div className="dashboard">
      <div className="dashboard-card">
        <div className="dashboard-header">
          <div>
            <h1>İş Akışı Paneli</h1>
            <p>Akış yönetimi ve tasarımı buradan yapılır.</p>
          </div>
          <button
            className="button primary"
            type="button"
            onClick={() => navigate('/create-flow')}
          >
            Yeni Akış Oluştur
          </button>
        </div>

        <div className="flow-list">
          {loading && <p className="hint">Yükleniyor...</p>}
          {error && <p className="error-text">{error}</p>}

          {!loading && !error && flows.length === 0 && (
            <p className="hint">Henüz kayıtlı akış yok.</p>
          )}

          {!loading && !error && flows.length > 0 && (
            <div className="flow-grid">
              {flows.map((flow) => (
                <div key={flow.akisId} className="flow-card">
                  <div>
                    <h3>{flow.akisAdi}</h3>
                    <p>{flow.aciklama}</p>
                  </div>
                  <span className={`flow-status ${flow.aktif ? 'active' : 'passive'}`}>
                    {flow.aktif ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}