import { useState } from 'react'

function AIProviderConfig() {
  const [baseUrl, setBaseUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('Not Connected')
  const [routingMode, setRoutingMode] = useState('Auto-Free')

  const testConnection = () => {
    // Simulate testing the connection
    setTimeout(() => {
      setConnectionStatus('Connected')
    }, 1000)
  }

  const refreshModelIndex = () => {
    // Logic to refresh the model index
    console.log('Refreshing model index')
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] p-4">
      <h1 className="text-2xl font-bold mb-6">AI Provider Config</h1>
      <div className="bg-[var(--surface)] rounded-xl p-4 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]">
        <h2 className="text-lg font-semibold mb-2">Base URL</h2>
        <input
          type="text"
          className="w-full bg-[var(--bg)] text-[var(--ink)] border border-[var(--border)] rounded-lg p-2 mb-4"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
        />
        <h2 className="text-lg font-semibold mb-2">API Key</h2>
        <input
          type="text"
          className="w-full bg-[var(--bg)] text-[var(--ink)] border border-[var(--border)] rounded-lg p-2 mb-4"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <div className="flex justify-between mb-4">
          <button
            className="bg-[var(--accent)] text-[var(--accent-ink)] rounded-lg px-5 py-2.5 font-semibold"
            onClick={testConnection}
          >
            Test Connection
          </button>
          <button
            className="bg-[var(--accent)] text-[var(--accent-ink)] rounded-lg px-5 py-2.5 font-semibold"
            onClick={refreshModelIndex}
          >
            Refresh Model Index
          </button>
        </div>
        <p>Connection Status: {connectionStatus}</p>
      </div>
      <div className="bg-[var(--surface)] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]">
        <h2 className="text-lg font-semibold mb-2">Routing Mode</h2>
        <select
          className="w-full bg-[var(--bg)] text-[var(--ink)] border border-[var(--border)] rounded-lg p-2"
          value={routingMode}
          onChange={(e) => setRoutingMode(e.target.value)}
        >
          <option value="Auto-Free">Auto-Free</option>
          <option value="Auto-Frontier">Auto-Frontier</option>
          <option value="Auto-Small">Auto-Small</option>
          <option value="Auto-Balance">Auto-Balance</option>
          <option value="Single Model">Single Model</option>
        </select>
      </div>
    </div>
  )
}

export default AIProviderConfig
