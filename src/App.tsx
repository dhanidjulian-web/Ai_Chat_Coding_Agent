import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import Terminal from './components/Terminal'
import SandboxManager from './components/SandboxManager'
import AIProviderConfig from './components/AIProviderConfig'
import FileManager from './components/FileManager'
import PackageManager from './components/PackageManager'
import MultiPanelToggle from './components/MultiPanelToggle'
import AISuggest from './components/AISuggest'
import ConnectionManager from './components/ConnectionManager'
import OrchestratorProfile from './components/OrchestratorProfile'
import ProfileManager from './components/ProfileManager'
import InputOutputManager from './components/InputOutputManager'
import SessionHistory from './components/SessionHistory'

function App() {
  const [count, setCount] = useState(0)

  return (
    <BrowserRouter basename={(typeof location!=='undefined'&&location.pathname.indexOf('/assets/www')===0?'/assets/www':'/')}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/terminal" element={<Terminal />} />
        <Route path="/sandbox-manager" element={<SandboxManager />} />
        <Route path="/ai-provider-config" element={<AIProviderConfig />} />
        <Route path="/file-manager" element={<FileManager />} />
        <Route path="/package-manager" element={<PackageManager />} />
        <Route path="/multi-panel-toggle" element={<MultiPanelToggle />} />
        <Route path="/ai-suggest" element={<AISuggest />} />
        <Route path="/connection-manager" element={<ConnectionManager />} />
        <Route path="/orchestrator-profile" element={<OrchestratorProfile />} />
        <Route path="/profile-manager" element={<ProfileManager />} />
        <Route path="/input-output-manager" element={<InputOutputManager />} />
        <Route path="/session-history" element={<SessionHistory />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
