import { useState } from 'react'

function Terminal() {
  const [sessions, setSessions] = useState<string[]>(['Session 1', 'Session 2'])
  const [command, setCommand] = useState('')
  const [output, setOutput] = useState<string[]>([])

  const executeCommand = () => {
    if (command.trim() !== '') {
      setOutput([...output, `$ ${command}`, `Output for: ${command}`])
      setCommand('')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] p-4">
      <h1 className="text-2xl font-bold mb-6">Terminal</h1>
      <div className="bg-[var(--surface)] rounded-xl p-4 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]">
        <h2 className="text-lg font-semibold mb-2">Terminal Sessions</h2>
        <ul className="list-disc pl-5">
          {sessions.map((session, index) => (
            <li key={index}>{session}</li>
          ))}
        </ul>
      </div>
      <div className="bg-[var(--surface)] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]">
        <h2 className="text-lg font-semibold mb-2">Command Line</h2>
        <div className="h-64 overflow-y-auto mb-4">
          {output.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
        <div className="flex">
          <input
            type="text"
            className="flex-1 bg-[var(--bg)] text-[var(--ink)] border border-[var(--border)] rounded-lg p-2 mr-2"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && executeCommand()}
          />
          <button
            className="bg-[var(--accent)] text-[var(--accent-ink)] rounded-lg px-5 py-2.5 font-semibold"
            onClick={executeCommand}
          >
            Execute
          </button>
        </div>
      </div>
    </div>
  )
}

export default Terminal
