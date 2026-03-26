import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchMe, type MeResponseItem } from '../services/userApi'

export default function AppLayout() {
  const navigate = useNavigate()
  const [user, setUser] = useState<MeResponseItem | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      return
    }

    fetchMe(token)
      .then((data) => {
        setUser(data[0] ?? null)
      })
      .catch(() => {
        localStorage.removeItem('auth_token')
        navigate('/login')
      })
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    navigate('/login')
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">İş Akışı</div>
        {user ? (
          <div className="user-card">
            <span className="user-role">{user.rolAdi}</span>
            <strong>{user.adSoyad}</strong>
          </div>
        ) : null}
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
        <button className="button secondary logout-button" onClick={handleLogout}>
          Çıkış Yap
        </button>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
