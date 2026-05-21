import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { fetchMe, type MeResponseItem } from '../services/userApi'
import { fetchUnreadNotificationCount } from '../services/notificationApi'
import { fetchMyTasks } from '../services/taskApi'
import { useUserStore } from '../store/userStore'
import type { WorkflowTask } from '../types/task'
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
  Workflow,
  ChevronDown
} from 'lucide-react'

type ThemeMode = 'light' | 'dark'

function isActionableTask(task: WorkflowTask) {
  const hasEditableField = Array.isArray(task.form) && task.form.some((field) => field.editable)
  const hasAction = Array.isArray(task.actions) && task.actions.length > 0
  return hasEditableField || hasAction
}

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

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const getPageTitle = () => {
    const path = location.pathname
    if (path === '/') return 'Gösterge Paneli'
    if (path === '/tasks') return 'Görev Formları'
    if (path.startsWith('/tasks/')) return 'Görev Detayı'
    if (path === '/issues') return 'Issue Yönetimi'
    if (path === '/issues/create') return 'Yeni Issue Oluştur'
    if (path.startsWith('/issues/')) return 'Issue Detayı'
    if (path === '/pdf-reports') return 'PDF Raporları'
    if (path === '/history') return 'İşlem Geçmişi'
    if (path === '/notifications') return 'Bildirimler'
    if (path === '/flow-map') return 'Flow Treemap'
    if (path === '/create-flow') return 'Akış Oluştur'
    if (path.startsWith('/preview/')) return 'Akış Önizleme'
    if (path.startsWith('/flow-edit/')) return 'Akış Düzenle'
    if (path.startsWith('/flow-live-edit/')) return 'Akış Canlı Düzenle'
    if (path === '/role-management') return 'Rol Yönetimi'
    if (path.startsWith('/builder/')) return 'Akış Tasarımcısı'
    return 'İş Akışı'
  }

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
    if (!user) {
      setTaskCount(0)
      knownTaskIdsRef.current = null
      return
    }

    let cancelled = false

    const loadTasks = async () => {
      try {
        const tasks = await fetchMyTasks()
        if (!cancelled) {
          const taskList = Array.isArray(tasks) ? tasks.filter(isActionableTask) : []

          // Group tasks by surecId to deduplicate active steps belonging to same flow
          const grouped: Record<number, WorkflowTask[]> = {}
          for (const task of taskList) {
            if (!grouped[task.surecId]) {
              grouped[task.surecId] = []
            }
            grouped[task.surecId].push(task)
          }

          const deduplicated: WorkflowTask[] = []
          for (const surecId in grouped) {
            const processTasks = grouped[surecId]
            if (processTasks.length === 1) {
              deduplicated.push(processTasks[0])
            } else {
              // Keep the step that comes first (lowest adimId)
              processTasks.sort((a, b) => a.adimId - b.adimId)
              deduplicated.push(processTasks[0])
            }
          }

          setTaskCount(deduplicated.length)

          const currentIds = new Set(deduplicated.map((task) => task.taskId))
          const previousIds = knownTaskIdsRef.current

          if (previousIds) {
            const newTasks = deduplicated.filter((task) => !previousIds.has(task.taskId))

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
    const intervalId = window.setInterval(loadTasks, 10000)

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
    const intervalId = window.setInterval(loadUnreadCount, 10000)

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

  const isIssueRoute = location.pathname.startsWith('/issues')

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand flex items-center gap-2.5 px-3 py-4 text-xl font-bold tracking-tight text-white border-b border-white/10 mb-2">
          <Workflow className="h-6 w-6 text-blue-400" />
          <span>İş Akışı</span>
        </div>

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

          <NavLink to="/issues" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="flex items-center gap-3">
              <AlertCircle className="h-4.5 w-4.5 opacity-90" />
              <span>Issue Yönetimi</span>
            </span>
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
      </aside>

      <div className="main-container">
        <header className="topbar">
          <div className="topbar-title">
            {getPageTitle()}
          </div>
          
          <div className="topbar-actions">
            <NavLink
              to="/tasks"
              className={({ isActive }) => `topbar-btn ${isActive ? 'active' : ''}`}
              title="Görev Formları"
            >
              <CheckSquare className="h-5 w-5" />
              {taskCount > 0 ? <span className="topbar-badge">{taskCount}</span> : null}
            </NavLink>

            <NavLink
              to="/notifications"
              className={({ isActive }) => `topbar-btn ${isActive ? 'active' : ''}`}
              title="Bildirimler"
            >
              <Bell className="h-5 w-5" />
              {notificationCount > 0 ? <span className="topbar-badge">{notificationCount}</span> : null}
            </NavLink>

            <div className="topbar-divider"></div>

            {user ? (
              <div className="profile-dropdown-wrapper" ref={dropdownRef}>
                <button
                  type="button"
                  className={`profile-trigger ${isDropdownOpen ? 'active' : ''}`}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <div className="profile-avatar">
                    {user.adSoyad.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <span className="profile-name hidden md:block">{user.adSoyad}</span>
                  <ChevronDown className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                </button>

                {isDropdownOpen && (
                  <div className="profile-dropdown">
                    <div className="dropdown-info">
                      <span className="dropdown-info-name">{user.adSoyad}</span>
                      <span className="dropdown-info-role">{user.rolAdi}</span>
                    </div>

                    <div className="dropdown-divider"></div>

                    <button
                      type="button"
                      className="dropdown-item"
                      onClick={() => {
                        handleThemeToggle()
                        setIsDropdownOpen(false)
                      }}
                    >
                      {theme === 'dark' ? (
                        <>
                          <Sun className="h-4 w-4 text-amber-500" />
                          <span>Açık Tema</span>
                        </>
                      ) : (
                        <>
                          <Moon className="h-4 w-4 text-slate-500" />
                          <span>Koyu Tema</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="dropdown-item danger"
                      onClick={() => {
                        handleLogout()
                        setIsDropdownOpen(false)
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Çıkış Yap</span>
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </header>

        <main className={`content ${isIssueRoute ? 'content-full-bleed' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
