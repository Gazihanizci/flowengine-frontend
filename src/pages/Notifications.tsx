import NotificationPanel from '../components/NotificationPanel'

export default function Notifications() {
  return (
    <div className="dashboard">
      <div className="dashboard-shell">
        <div className="dashboard-top">
          <div>
            <h1>Bildirimler</h1>
            <p>Onay süreçlerinizi, sistem uyarılarını ve bekleyen aksiyonlarınızı buradan yönetin.</p>
          </div>
        </div>

        <NotificationPanel />
      </div>
    </div>
  )
}
