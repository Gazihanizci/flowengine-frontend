import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const navigate = useNavigate()

  return (
    <div className="dashboard">
      <div className="dashboard-card">
        <h1>Workflow Dashboard</h1>
        <p>Flow yönetimi ve tasarımını buradan yapabilirsiniz.</p>
        <button className="button primary" type="button" onClick={() => navigate('/create-flow')}>
          Yeni Flow Oluştur
        </button>
      </div>
    </div>
  )
}