import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { fetchMe, type MeResponseItem } from '../services/userApi'
import { fetchUnreadNotificationCount } from '../services/notificationApi'
import { fetchMyTasks } from '../services/taskApi'
import { useUserStore } from '../store/userStore'
import { 
  LayoutDashboard, 
  CheckSquare, 
  AlertCircle, 
  Bell, 
  FileText, 
  History, 
  Network, 
  PlusCircle, 
  ShieldAlert, 
  Sun, 
  Moon, 
  LogOut, 
  Workflow 
} from 'lucide-react'

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
  const isIssueRoute = location.pathname.startsWith('/issues')

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand flex items-center gap-2.5 px-3 py-4 text-xl font-bold tracking-tight text-white border-b border-white/10 mb-2">
          <Workflow className="h-6 w-6 text-blue-400" />
          <span>İş Akışı</span>
        </div>

        {user ? (
          <div className="user-card flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-inner mb-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 font-bold text-white shadow-md shadow-blue-500/20 text-xs">
              {user.adSoyad.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[9px] font-bold tracking-widest text-blue-300/80 uppercase leading-none mb-1">{user.rolAdi}</span>
              <strong className="block truncate text-xs font-semibold text-slate-100">{user.adSoyad}</strong>
            </div>
          </div>
        ) : null}

        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="flex items-center gap-3">
              <LayoutDashboard className="h-4.5 w-4.5 opacity-90" />
              <span>Gösterge Paneli</span>
            </span>
          </NavLink>

          {!isTaskDetailPage ? (
            <NavLink
              to="/tasks"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="flex items-center gap-3">
                <CheckSquare className="h-4.5 w-4.5 opacity-90" />
                <span>Görev Formları</span>
              </span>
              {taskCount > 0 ? <span className="nav-badge">{taskCount}</span> : null}
            </NavLink>
          ) : null}

          <NavLink to="/issues" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="flex items-center gap-3">
              <AlertCircle className="h-4.5 w-4.5 opacity-90" />
              <span>Issue Yönetimi</span>
            </span>
          </NavLink>

          <NavLink
            to="/notifications"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="flex items-center gap-3">
              <Bell className="h-4.5 w-4.5 opacity-90" />
              <span>Bildirimler</span>
            </span>
            {notificationCount > 0 ? <span className="nav-badge">{notificationCount}</span> : null}
          </NavLink>

          <NavLink
            to="/pdf-reports"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="flex items-center gap-3">
              <FileText className="h-4.5 w-4.5 opacity-90" />
              <span>PDF Raporları</span>
            </span>
          </NavLink>

          <NavLink
            to="/history"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span className="flex items-center gap-3">
              <History className="h-4.5 w-4.5 opacity-90" />
              <span>İşlem Geçmişi</span>
            </span>
          </NavLink>

          {user?.rolId === 4 ? (
            <NavLink
              to="/flow-map"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="flex items-center gap-3">
                <Network className="h-4.5 w-4.5 opacity-90" />
                <span>Flow Treemap</span>
              </span>
            </NavLink>
          ) : null}

          {user?.rolId === 4 ? (
            <NavLink
              to="/create-flow"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="flex items-center gap-3">
                <PlusCircle className="h-4.5 w-4.5 opacity-90" />
                <span>Akış Oluştur</span>
              </span>
            </NavLink>
          ) : null}

          {user?.rolId === 4 ? (
            <NavLink
              to="/role-management"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="flex items-center gap-3">
                <ShieldAlert className="h-4.5 w-4.5 opacity-90" />
                <span>Rol Yönetimi</span>
              </span>
            </NavLink>
          ) : null}
        </nav>

        <div className="sidebar-footer mt-auto flex flex-col gap-2">
          <button 
            type="button" 
            className="theme-toggle flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-semibold rounded-xl transition duration-150" 
            onClick={handleThemeToggle}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="h-4 w-4 text-amber-400" />
                <span>Açık Tema</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-slate-300" />
                <span>Koyu Tema</span>
              </>
            )}
          </button>

          <button 
            className="logout-button flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-semibold rounded-xl transition duration-150" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      <main className={`content ${isIssueRoute ? 'content-full-bleed' : ''}`}>
        <Outlet />
      </main>
    </div>
  )
}
