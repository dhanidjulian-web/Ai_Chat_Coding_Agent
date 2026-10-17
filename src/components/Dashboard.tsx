import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function Dashboard() {
  const navigate = useNavigate()
  const [cpuStatus, setCpuStatus] = useState('Loading...')
  const [ramStatus, setRamStatus] = useState('Loading...')
  const [storageStatus, setStorageStatus] = useState('Loading...')
  const [sandboxStatus, setSandboxStatus] = useState('Disconnected')
  const [fallbackModels, setFallbackModels] = useState<string[]>([])
  const [workflowProfile, setWorkflowProfile] = useState('Default')

  useEffect(() => {
    // Simulate fetching system status
    setTimeout(() => {
      setCpuStatus('75%')
      setRamStatus('60%')
      setStorageStatus('45%')
      setSandboxStatus('Connected')
      setFallbackModels(['Model 1', 'Model 2', 'Model 3'])
    }, 1000)
  }, [])

  return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[var(--surface)] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]">
          <h2 className="text-lg font-semibold mb-2">CPU Status</h2>
          <p>{cpuStatus}</p>
        </div>
        <div className="bg-[var(--surface)] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]">
          <h2 className="text-lg font-semibold mb-2">RAM Status</h2>
          <p>{ramStatus}</p>
        </div>
        <div className="bg-[var(--surface)] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]">
          <h2 className="text-lg font-semibold mb-2">Storage Status</h2>
          <p>{storageStatus}</p>
        </div>
        <div className="bg-[var(--surface)] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]">
          <h2 className="text-lg font-semibold mb-2">Sandbox Status</h2>
          <p>{sandboxStatus}</p>
        </div>
      </div>
      <div className="bg-[var(--surface)] rounded-xl p-4 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]">
        <h2 className="text-lg font-semibold mb-2">Fallback Model List</h2>
        <ul className="list-disc pl-5">
          {fallbackModels.map((model, index) => (
            <li key={index}>{model}</li>
          ))}
        </ul>
      </div>
      <div className="bg-[var(--surface)] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]">
        <h2 className="text-lg font-semibold mb-2">Workflow Profile</h2>
        <select
          className="w-full bg-[var(--bg)] text-[var(--ink)] border border-[var(--border)] rounded-lg p-2"
          value={workflowProfile}
          onChange={(e) => setWorkflowProfile(e.target.value)}
        >
          <option value="Default">Default</option>
          <option value="Project">Project</option>
          <option value="Orchestrator">Orchestrator</option>
        </select>
      </div>
    </div>
  )
}

export default Dashboard
