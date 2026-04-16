import type { ReactElement } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import CreateFlow from './pages/CreateFlow'
import BuilderPage from './pages/BuilderPage'
import Login from './pages/Login'
import Register from './pages/Register'
import Notifications from './pages/Notifications'
import FlowMapPage from './pages/FlowMapPage'
import { useUserStore } from './store/userStore'
import FlowPreview from './pages/FlowPreview'
import MyTasks from './pages/MyTasks'
import TaskDetailPage from './pages/TaskDetailPage'
import RoleManagementPage from './pages/RoleManagementPage'
import FileUploadDemo from './pages/FileUploadDemo'
import PdfReportsPage from './pages/PdfReportsPage'
import HistoryPage from './pages/HistoryPage'
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
          <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
          <Route path="/pdf-reports" element={<PdfReportsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/file-upload-demo" element={<FileUploadDemo />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route
            path="/flow-map"
            element={
              <RequireAdmin>
                <FlowMapPage />
              </RequireAdmin>
            }
          />
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
          <Route
            path="/role-management"
            element={
              <RequireAdmin>
                <RoleManagementPage />
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
