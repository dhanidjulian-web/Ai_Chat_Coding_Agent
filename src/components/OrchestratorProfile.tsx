import { useState } from 'react'

function OrchestratorProfile() {
  const [prompt, setPrompt] = useState('')
  const [routingMode, setRoutingMode] = useState('Auto-Free')
  const [skills, setSkills] = useState<string[]>(['Skill 1', 'Skill 2', 'Skill 3'])

  const saveProfile = () => {
    // Logic to save the profile
    console.log('Saving profile')
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] p-4">
      <h1 className="text-2xl font-bold mb-6">Orchestrator Profile</h1>
      <div className="bg-[var(--surface)] rounded-xl p-4 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]">
        <h2 className="text-lg font-semibold mb-2">Prompt</h2>
        <textarea
          className="w-full bg-[var(--bg)] text-[var(--ink)] border border-[var(--border)] rounded-lg p-2 mb-4"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <h2 className="text-lg font-semibold mb-2">Routing Mode</h2>
        <select
          className="w-full bg-[var(--bg)] text-[var(--ink)] border border-[var(--border)] rounded-lg p-2 mb-4"
          value={routingMode}
          onChange={(e) => setRoutingMode(e.target.value)}
        >
          <option value="Auto-Free">Auto-Free</option>
          <option value="Auto-Frontier">Auto-Frontier</option>
          <option value="Auto-Small">Auto-Small</option>
          <option value="Auto-Balance">Auto-Balance</option>
          <option value="Single Model">Single Model</option>
        </select>
        <h2 className="text-lg font-semibold mb-2">Skills</h2>
        <ul className="list-disc pl-5 mb-4">
          {skills.map((skill, index) => (
            <li key={index}>{skill}</li>
          ))}
        </ul>
        <button
          className="bg-[var(--accent)] text-[var(--accent-ink)] rounded-lg px-5 py-2.5 font-semibold"
          onClick={saveProfile}
        >
          Save
        </button>
      </div>
    </div>
  )
}

export default OrchestratorProfile
