import { useState } from 'react'

function PackageManager() {
  const [searchTerm, setSearchTerm] = useState('')
  const [packages, setPackages] = useState<string[]>(['Package 1', 'Package 2', 'Package 3'])

  const searchPackages = () => {
    // Logic to search for packages
    console.log(`Searching for: ${searchTerm}`)
  }

  const installPackage = (pkg: string) => {
    // Logic to install a package
    console.log(`Installing: ${pkg}`)
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] p-4">
      <h1 className="text-2xl font-bold mb-6">Package Manager</h1>
      <div className="bg-[var(--surface)] rounded-xl p-4 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]">
        <h2 className="text-lg font-semibold mb-2">Search</h2>
        <div className="flex">
          <input
            type="text"
            className="flex-1 bg-[var(--bg)] text-[var(--ink)] border border-[var(--border)] rounded-lg p-2 mr-2"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchPackages()}
          />
          <button
            className="bg-[var(--accent)] text-[var(--accent-ink)] rounded-lg px-5 py-2.5 font-semibold"
            onClick={searchPackages}
          >
            Search
          </button>
        </div>
      </div>
      <div className="bg-[var(--surface)] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]">
        <h2 className="text-lg font-semibold mb-2">Packages</h2>
        <ul className="list-disc pl-5">
          {packages.map((pkg, index) => (
            <li key={index} className="flex justify-between items-center mb-2">
              <span>{pkg}</span>
              <button
                className="bg-[var(--accent)] text-[var(--accent-ink)] rounded-lg px-5 py-2.5 font-semibold"
                onClick={() => installPackage(pkg)}
              >
                Install
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default PackageManager
