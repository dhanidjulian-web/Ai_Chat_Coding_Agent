import { useState } from 'react'

function SessionHistory() {
  const [sessions, setSessions] = useState<string[]>(['Session 1', 'Session 2', 'Session 3'])
  const [selectedSession, setSelectedSession] = useState('')

  const newSession = () => {
    // Logic to create a new session
    console.log('Creating new session')
  }

  const deleteSession = () => {
    // Logic to delete a session
    console.log('Deleting session')
  }

  const bookmarksManager = () => {
    // Logic to open the bookmarks manager
    console.log('Opening bookmarks manager')
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] p-4">
      <h1 className="text-2xl font-bold mb-6">Session History</h1>
      <div className="bg-[var(--surface)] rounded-xl p-4 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]">
        <h2 className="text-lg font-semibold mb-2">Sessions</h2>
        <ul className="list-disc pl-5 mb-4">
          {sessions.map((session, index) => (
            <li key={index} onClick={() => setSelectedSession(session)}>
              {session}
            </li>
          ))}
        </ul>
        <div className="flex justify-between">
          <button
            className="bg-[var(--accent)] text-[var(--accent-ink)] rounded-lg px-5 py-2.5 font-semibold"
            onClick={newSession}
          >
            New Session
          </button>
          <button
            className="bg-[var(--accent)] text-[var(--accent-ink)] rounded-lg px-5 py-2.5 font-semibold"
            onClick={deleteSession}
          >
            Delete
          </button>
          <button
            className="bg-[var(--accent)] text-[var(--accent-ink)] rounded-lg px-5 py-2.5 font-semibold"
            onClick={bookmarksManager}
          >
            Bookmarks Manager
          </button>
        </div>
      </div>
      {selectedSession && (
        <div className="bg-[var(--surface)] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]">
          <h2 className="text-lg font-semibold mb-2">Selected Session</h2>
          <p>{selectedSession}</p>
        </div>
      )}
    </div>
  )
}

export default SessionHistory
