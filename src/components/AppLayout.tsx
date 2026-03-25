import { NavLink, Outlet } from 'react-router-dom'

export default function AppLayout() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">İş Akışı</div>
        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            Gösterge Paneli
          </NavLink>
          <NavLink
            to="/create-flow"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            Akış Oluştur
          </NavLink>
        </nav>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}