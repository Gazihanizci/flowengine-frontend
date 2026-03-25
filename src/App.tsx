import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import CreateFlow from './pages/CreateFlow'
import BuilderPage from './pages/BuilderPage'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/create-flow" element={<CreateFlow />} />
          <Route path="/builder/:stepId" element={<BuilderPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App