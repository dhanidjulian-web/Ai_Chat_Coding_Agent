import { useState } from 'react'

function InputOutputManager() {
  const [messages, setMessages] = useState<string[]>(['Message 1', 'Message 2', 'Message 3'])
  const [selectedMessage, setSelectedMessage] = useState('')

  const editMessage = () => {
    // Logic to edit a message
    console.log('Editing message')
  }

  const deleteMessage = () => {
    // Logic to delete a message
    console.log('Deleting message')
  }

  const copyMessage = () => {
    // Logic to copy a message
    console.log('Copying message')
  }

  const resendMessage = () => {
    // Logic to resend a message
    console.log('Resending message')
  }

  const saveMessage = () => {
    // Logic to save a message
    console.log('Saving message')
  }

  const bookmarkMessage = () => {
    // Logic to bookmark a message
    console.log('Bookmarking message')
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] p-4">
      <h1 className="text-2xl font-bold mb-6">Input/Output Manager</h1>
      <div className="bg-[var(--surface)] rounded-xl p-4 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]">
        <h2 className="text-lg font-semibold mb-2">Messages</h2>
        <ul className="list-disc pl-5 mb-4">
          {messages.map((message, index) => (
            <li key={index} onClick={() => setSelectedMessage(message)}>
              {message}
            </li>
          ))}
        </ul>
        <div className="flex justify-between">
          <button
            className="bg-[var(--accent)] text-[var(--accent-ink)] rounded-lg px-5 py-2.5 font-semibold"
            onClick={editMessage}
          >
            Edit
          </button>
          <button
            className="bg-[var(--accent)] text-[var(--accent-ink)] rounded-lg px-5 py-2.5 font-semibold"
            onClick={deleteMessage}
          >
            Delete
          </button>
          <button
            className="bg-[var(--accent)] text-[var(--accent-ink)] rounded-lg px-5 py-2.5 font-semibold"
            onClick={copyMessage}
          >
            Copy
          </button>
          <button
            className="bg-[var(--accent)] text-[var(--accent-ink)] rounded-lg px-5 py-2.5 font-semibold"
            onClick={resendMessage}
          >
            Resend
          </button>
          <button
            className="bg-[var(--accent)] text-[var(--accent-ink)] rounded-lg px-5 py-2.5 font-semibold"
            onClick={saveMessage}
          >
            Save
          </button>
          <button
            className="bg-[var(--accent)] text-[var(--accent-ink)] rounded-lg px-5 py-2.5 font-semibold"
            onClick={bookmarkMessage}
          >
            Bookmark
          </button>
        </div>
      </div>
      {selectedMessage && (
        <div className="bg-[var(--surface)] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]">
          <h2 className="text-lg font-semibold mb-2">Selected Message</h2>
          <p>{selectedMessage}</p>
        </div>
      )}
    </div>
  )
}

export default InputOutputManager
