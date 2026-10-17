import { useState } from 'react'

function ProfileManager() {
  const [settings, setSettings] = useState<string[]>(['Setting 1', 'Setting 2', 'Setting 3'])

  const manageSettings = () => {
    // Logic to manage settings
    console.log('Managing settings')
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] p-4">
      <h1 className="text-2xl font-bold mb-6">Profile Manager</h1>
      <div className="bg-[var(--surface)] rounded-xl p-4 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]">
        <h2 className="text-lg font-semibold mb-2">Settings</h2>
        <ul className="list-disc pl-5">
          {settings.map((setting, index) => (
            <li key={index}>{setting}</li>
          ))}
        </ul>
      </div>
      <button
        className="bg-[var(--accent)] text-[var(--accent-ink)] rounded-lg px-5 py-2.5 font-semibold"
        onClick={manageSettings}
      >
        Manage
      </button>
    </div>
  )
}

export default ProfileManager
