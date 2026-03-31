import type { ReactElement } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import CreateFlow from './pages/CreateFlow'
import BuilderPage from './pages/BuilderPage'
import Login from './pages/Login'
import Register from './pages/Register'
import { useUserStore } from './store/userStore'
import FlowPreview from './pages/FlowPreview'
import MyTasks from './pages/MyTasks'
import './App.css'

function RequireAuth({ children }: { children: ReactElement }) {
  const token = localStorage.getItem('auth_token')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

function RequireAdmin({ children }: { children: ReactElement }) {
  const user = useUserStore((state) => state.user)
  const isLoaded = useUserStore((state) => state.isLoaded)

  if (!isLoaded) {
    return (
      <div className="content">
        <p className="hint">Yetki bilgileri yükleniyor...</p>
      </div>
    )
  }

  if (user?.rolId !== 4) {
    return <Navigate to="/" replace />
  }

  return children
}

function RedirectIfAuthed({ children }: { children: ReactElement }) {
  const token = localStorage.getItem('auth_token')
  if (token) {
    return <Navigate to="/" replace />
  }
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <RedirectIfAuthed>
              <Login />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/register"
          element={
            <RedirectIfAuthed>
              <Register />
            </RedirectIfAuthed>
          }
        />
        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<MyTasks />} />
          <Route
            path="/preview/:flowId"
            element={
              <RequireAdmin>
                <FlowPreview />
              </RequireAdmin>
            }
          />
          <Route
            path="/create-flow"
            element={
              <RequireAdmin>
                <CreateFlow />
              </RequireAdmin>
            }
          />
          <Route path="/builder/:stepId" element={<BuilderPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
