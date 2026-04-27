import NotificationPanel from '../components/NotificationPanel'

export default function Notifications() {
  return (
    <div className="dashboard">
      <div className="dashboard-shell">
        <div className="dashboard-top">
          <div>
            <h1>Bildirimler</h1>
            <p>Onay ve reddetme işlemlerini tek ekrandan, öncelik sırasıyla yönetin.</p>
          </div>
        </div>

        <section className="panel notifications-hero">
          <div>
            <p className="notifications-hero-kicker">Bildirim Merkezi</p>
            <h2>İş akışlarındaki kritik taleplerinizi kaçırmayın.</h2>
            <p>
              Solda okunmayan kayıtlar, sağda son bildirim geçmişi yer alır. Flow taleplerini kart üzerinden
              onaylayabilir veya reddedebilirsiniz.
            </p>
          </div>
        </section>

        <NotificationPanel title="Bildirim Paneli" />
      </div>
    </div>
  )
}
