import { useState } from 'react'

function ConnectionManager() {
  const [connections, setConnections] = useState<string[]>(['Google', 'GitHub', 'Vercel'])
  const [selectedConnection, setSelectedConnection] = useState('Google')

  const login = () => {
    // Logic to login to the selected connection
    console.log(`Logging in to ${selectedConnection}`)
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] p-4">
      <h1 className="text-2xl font-bold mb-6">Connection Manager</h1>
      <div className="bg-[var(--surface)] rounded-xl p-4 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]">
        <h2 className="text-lg font-semibold mb-2">Connections</h2>
        <select
          className="w-full bg-[var(--bg)] text-[var(--ink)] border border-[var(--border)] rounded-lg p-2 mb-4"
          value={selectedConnection}
          onChange={(e) => setSelectedConnection(e.target.value)}
        >
          {connections.map((connection, index) => (
            <option key={index} value={connection}>
              {connection}
            </option>
          ))}
        </select>
        <button
          className="bg-[var(--accent)] text-[var(--accent-ink)] rounded-lg px-5 py-2.5 font-semibold"
          onClick={login}
        >
          Login
        </button>
      </div>
    </div>
  )
}

export default ConnectionManager
