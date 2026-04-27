import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { fetchMe, type MeResponseItem } from '../services/userApi'
import { fetchUnreadNotificationCount } from '../services/notificationApi'
import { fetchMyTasks } from '../services/taskApi'
import { useUserStore } from '../store/userStore'

type ThemeMode = 'light' | 'dark'

const THEME_KEY = 'ui_theme'

function getInitialTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUserState] = useState<MeResponseItem | null>(null)
  const [taskCount, setTaskCount] = useState(0)
  const [notificationCount, setNotificationCount] = useState(0)
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme())
  const knownTaskIdsRef = useRef<Set<number> | null>(null)
  const setUser = useUserStore((state) => state.setUser)
  const setLoaded = useUserStore((state) => state.setLoaded)
  const clearUser = useUserStore((state) => state.clearUser)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

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
      knownTaskIdsRef.current = null
      return
    }

    let cancelled = false

    const loadTasks = async () => {
      try {
        const tasks = await fetchMyTasks()
        if (!cancelled) {
          const taskList = Array.isArray(tasks) ? tasks : []
          setTaskCount(taskList.length)

          const currentIds = new Set(taskList.map((task) => task.taskId))
          const previousIds = knownTaskIdsRef.current

          if (previousIds) {
            const newTasks = taskList.filter((task) => !previousIds.has(task.taskId))

            if (newTasks.length > 0) {
              const newestTask = newTasks.sort((a, b) => b.taskId - a.taskId)[0]
              const targetPath = `/tasks/${newestTask.taskId}`
              if (location.pathname !== targetPath) {
                navigate(targetPath)
              }
            }
          }

          knownTaskIdsRef.current = currentIds
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
  }, [location.pathname, navigate, user])

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

  const handleThemeToggle = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const isTaskDetailPage = /^\/tasks\/[^/]+$/.test(location.pathname)

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

          {!isTaskDetailPage ? (
            <NavLink
              to="/tasks"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span>Görev Formları</span>
              {taskCount > 0 ? <span className="nav-badge">{taskCount}</span> : null}
            </NavLink>
          ) : null}

          <NavLink
            to="/notifications"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span>Bildirimler</span>
            {notificationCount > 0 ? <span className="nav-badge">{notificationCount}</span> : null}
          </NavLink>

          <NavLink
            to="/pdf-reports"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            PDF Raporları
          </NavLink>

          <NavLink
            to="/history"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            İşlem Geçmişi
          </NavLink>

          {user?.rolId === 4 ? (
            <NavLink
              to="/flow-map"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              Flow Treemap
            </NavLink>
          ) : null}

          {user?.rolId === 4 ? (
            <NavLink
              to="/create-flow"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              Akış Olustur
            </NavLink>
          ) : null}

          {user?.rolId === 4 ? (
            <NavLink
              to="/role-management"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              Rol Yonetimi
            </NavLink>
          ) : null}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="theme-toggle" onClick={handleThemeToggle}>
            Tema: {theme === 'dark' ? 'Koyu' : 'Acik'}
          </button>

          <button className="button secondary logout-button" onClick={handleLogout}>
            Cikis Yap
          </button>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
