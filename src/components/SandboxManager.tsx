import { useState } from 'react'

function SandboxManager() {
  const [distros, setDistros] = useState<string[]>(['Ubuntu', 'Debian', 'Kali NetHunter'])
  const [selectedDistro, setSelectedDistro] = useState('Ubuntu')

  const launchDistro = () => {
    // Logic to launch the selected distro
    console.log(`Launching ${selectedDistro}`)
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] p-4">
      <h1 className="text-2xl font-bold mb-6">Sandbox Manager</h1>
      <div className="bg-[var(--surface)] rounded-xl p-4 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]">
        <h2 className="text-lg font-semibold mb-2">Distro Environments</h2>
        <select
          className="w-full bg-[var(--bg)] text-[var(--ink)] border border-[var(--border)] rounded-lg p-2 mb-4"
          value={selectedDistro}
          onChange={(e) => setSelectedDistro(e.target.value)}
        >
          {distros.map((distro, index) => (
            <option key={index} value={distro}>
              {distro}
            </option>
          ))}
        </select>
        <button
          className="bg-[var(--accent)] text-[var(--accent-ink)] rounded-lg px-5 py-2.5 font-semibold"
          onClick={launchDistro}
        >
          Launch
        </button>
      </div>
    </div>
  )
}

export default SandboxManager
