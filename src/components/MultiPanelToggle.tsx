import { useState } from 'react'

function MultiPanelToggle() {
  const [panels, setPanels] = useState({
    chat: true,
    terminal: true,
    fileManager: true,
    sidebar: true,
    windows: true,
  })

  const togglePanel = (panel: string) => {
    setPanels({ ...panels, [panel]: !panels[panel as keyof typeof panels] })
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] p-4">
      <h1 className="text-2xl font-bold mb-6">Multi-Panel Toggle</h1>
      <div className="bg-[var(--surface)] rounded-xl p-4 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]">
        <h2 className="text-lg font-semibold mb-2">Panel Toggles</h2>
        <div className="grid grid-cols-2 gap-4">
          {Object.keys(panels).map((panel) => (
            <div key={panel} className="flex items-center">
              <input
                type="checkbox"
                id={panel}
                checked={panels[panel as keyof typeof panels]}
                onChange={() => togglePanel(panel)}
                className="mr-2"
              />
              <label htmlFor={panel}>{panel.charAt(0).toUpperCase() + panel.slice(1)}</label>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-[var(--surface)] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]">
        <h2 className="text-lg font-semibold mb-2">Input Bar</h2>
        <input
          type="text"
          className="w-full bg-[var(--bg)] text-[var(--ink)] border border-[var(--border)] rounded-lg p-2"
          placeholder="Type here..."
        />
      </div>
    </div>
  )
}

export default MultiPanelToggle
