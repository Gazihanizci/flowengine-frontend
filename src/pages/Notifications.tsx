import NotificationPanel from '../components/NotificationPanel'

export default function Notifications() {
  return (
    <div className="dashboard">
      <div className="dashboard-shell">
        <div className="dashboard-top">
          <div>
            <h1>Bildirimler</h1>
            <p>Okunmayan bildirimleri yonet, gerekli onay ve red islemlerini buradan yap.</p>
          </div>
        </div>

        <NotificationPanel title="Bildirim Paneli" />
      </div>
    </div>
  )
}
