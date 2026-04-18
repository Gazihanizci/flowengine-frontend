import NotificationPanel from '../components/NotificationPanel'

export default function Notifications() {
  return (
    <div className="dashboard">
      <div className="dashboard-shell">
        <div className="dashboard-top">
          <div>
            <h1>Bildirimler</h1>
            <p>Onay ve reddetme islemlerini tek ekrandan, oncelik sirasiyla yonetin.</p>
          </div>
        </div>

        <section className="panel notifications-hero">
          <div>
            <p className="notifications-hero-kicker">Bildirim Merkezi</p>
            <h2>Is akislarindaki kritik taleplerinizi kacirmayin.</h2>
            <p>
              Solda okunmayan kayitlar, sagda son bildirim gecmisi yer alir. Flow taleplerini kart uzerinden
              onaylayabilir veya reddedebilirsiniz.
            </p>
          </div>
        </section>

        <NotificationPanel title="Bildirim Paneli" />
      </div>
    </div>
  )
}
