import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchMe, type MeResponseItem } from '../services/userApi'
import { fetchUnreadNotificationCount } from '../services/notificationApi'
import { fetchMyTasks } from '../services/taskApi'
import { useUserStore } from '../store/userStore'

export default function AppLayout() {
  const navigate = useNavigate()
  const [user, setUserState] = useState<MeResponseItem | null>(null)
  const [taskCount, setTaskCount] = useState(0)
  const [notificationCount, setNotificationCount] = useState(0)
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

  useEffect(() => {
    if (!user || user.rolId === 4) {
      setTaskCount(0)
      return
    }

    let cancelled = false

    const loadTasks = async () => {
      try {
        const tasks = await fetchMyTasks()
        if (!cancelled) {
          setTaskCount(Array.isArray(tasks) ? tasks.length : 0)
        }
      } catch {
        if (!cancelled) {
          setTaskCount(0)
        }
      }
    }

    loadTasks()
    const intervalId = window.setInterval(loadTasks, 30000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [user])

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setNotificationCount(0)
      return
    }

    let cancelled = false

    const loadUnreadCount = async () => {
      try {
        const count = await fetchUnreadNotificationCount()
        if (!cancelled) {
          setNotificationCount(Math.max(0, Number(count) || 0))
        }
      } catch {
        if (!cancelled) {
          setNotificationCount(0)
        }
      }
    }

    loadUnreadCount()
    const intervalId = window.setInterval(loadUnreadCount, 30000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [user])

  const handleLogout = () => {
    clearUser()
    localStorage.removeItem('auth_token')
    navigate('/login')
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">Is Akisi</div>
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
            Gosterge Paneli
          </NavLink>

          <NavLink
            to="/tasks"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span>Gorev Formlari</span>
            {taskCount > 0 ? <span className="nav-badge">{taskCount}</span> : null}
          </NavLink>

          <NavLink
            to="/notifications"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span>Bildirimler</span>
            {notificationCount > 0 ? <span className="nav-badge">{notificationCount}</span> : null}
          </NavLink>

          {user?.rolId === 4 ? (
            <NavLink
              to="/create-flow"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              Akis Olustur
            </NavLink>
          ) : null}
        </nav>

        <button className="button secondary logout-button" onClick={handleLogout}>
          Cikis Yap
        </button>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
