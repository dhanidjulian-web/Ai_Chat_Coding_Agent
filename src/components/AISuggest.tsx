import { useState } from 'react'

function AISuggest() {
  const [suggestions, setSuggestions] = useState<string[]>(['Suggestion 1', 'Suggestion 2', 'Suggestion 3'])

  const generateSuggestions = () => {
    // Logic to generate AI suggestions
    console.log('Generating suggestions')
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] p-4">
      <h1 className="text-2xl font-bold mb-6">AI Suggest</h1>
      <div className="bg-[var(--surface)] rounded-xl p-4 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]">
        <h2 className="text-lg font-semibold mb-2">Suggestions</h2>
        <ul className="list-disc pl-5">
          {suggestions.map((suggestion, index) => (
            <li key={index}>{suggestion}</li>
          ))}
        </ul>
      </div>
      <button
        className="bg-[var(--accent)] text-[var(--accent-ink)] rounded-lg px-5 py-2.5 font-semibold"
        onClick={generateSuggestions}
      >
        Generate
      </button>
    </div>
  )
}

export default AISuggest
