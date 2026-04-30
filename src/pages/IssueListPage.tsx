import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import IssueList from '../components/issues/IssueList'
import { fetchIssues, fetchMyIssues } from '../services/issueApi'
import type { Issue } from '../types/issue'

function IssueListPage() {
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'all' | 'my'>('all')

  useEffect(() => {
    const loadIssues = async () => {
      setLoading(true)
      setError('')
      try {
        const data = mode === 'all' ? await fetchIssues() : await fetchMyIssues()
        setIssues(data)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Issue listesi yuklenemedi.')
      } finally {
        setLoading(false)
      }
    }
    void loadIssues()
  }, [mode])

  return (
    <div className="content">
      <section className="panel">
        <div className="panel-header">
          <h2>Issue Listesi</h2>
          <div className="panel-actions">
            <button className="button secondary" onClick={() => setMode('all')} disabled={mode === 'all'}>
              Tum Issue'lar
            </button>
            <button className="button secondary" onClick={() => setMode('my')} disabled={mode === 'my'}>
              Bana Atananlar
            </button>
            <Link className="button" to="/issues/create">
              Issue Olustur
            </Link>
          </div>
        </div>
        {loading && <p className="hint">Issue'lar yukleniyor...</p>}
        {error && <p className="error-text">{error}</p>}
        {!loading && !error && <IssueList issues={issues} mode={mode} />}
      </section>
    </div>
  )
}

export default IssueListPage
