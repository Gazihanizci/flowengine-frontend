import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchMe, type MeResponseItem } from '../services/userApi'
import { useUserStore } from '../store/userStore'

export default function AppLayout() {
  const navigate = useNavigate()
  const [user, setUserState] = useState<MeResponseItem | null>(null)
  const setUser = useUserStore((state) => state.setUser)
  const setLoaded = useUserStore((state) => state.setLoaded)
  const clearUser = useUserStore((state) => state.clearUser)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setLoaded(false)
      return
    }

    setLoaded(false)
    fetchMe(token)
      .then((data) => {
        const info = data[0] ?? null
        setUserState(info)
        setUser(info)
      })
      .catch(() => {
        clearUser()
        localStorage.removeItem('auth_token')
        navigate('/login')
      })
  }, [clearUser, navigate, setLoaded, setUser])

  const handleLogout = () => {
    clearUser()
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
          {user?.rolId === 4 ? (
            <NavLink
              to="/create-flow"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              Akış Oluştur
            </NavLink>
          ) : null}
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
