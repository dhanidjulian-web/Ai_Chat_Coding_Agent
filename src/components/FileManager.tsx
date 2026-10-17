import { useState } from 'react'

function FileManager() {
  const [files, setFiles] = useState<string[]>(['File 1', 'File 2', 'File 3'])
  const [selectedFile, setSelectedFile] = useState('')

  const importFile = () => {
    // Logic to import a file
    console.log('Importing file')
  }

  const exportFile = () => {
    // Logic to export a file
    console.log('Exporting file')
  }

  const newFolder = () => {
    // Logic to create a new folder
    console.log('Creating new folder')
  }

  const newFile = () => {
    // Logic to create a new file
    console.log('Creating new file')
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] p-4">
      <h1 className="text-2xl font-bold mb-6">File Manager</h1>
      <div className="bg-[var(--surface)] rounded-xl p-4 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]">
        <h2 className="text-lg font-semibold mb-2">Files</h2>
        <ul className="list-disc pl-5 mb-4">
          {files.map((file, index) => (
            <li key={index} onClick={() => setSelectedFile(file)}>
              {file}
            </li>
          ))}
        </ul>
        <div className="flex justify-between">
          <button
            className="bg-[var(--accent)] text-[var(--accent-ink)] rounded-lg px-5 py-2.5 font-semibold"
            onClick={importFile}
          >
            Import
          </button>
          <button
            className="bg-[var(--accent)] text-[var(--accent-ink)] rounded-lg px-5 py-2.5 font-semibold"
            onClick={exportFile}
          >
            Export
          </button>
          <button
            className="bg-[var(--accent)] text-[var(--accent-ink)] rounded-lg px-5 py-2.5 font-semibold"
            onClick={newFolder}
          >
            New Folder
          </button>
          <button
            className="bg-[var(--accent)] text-[var(--accent-ink)] rounded-lg px-5 py-2.5 font-semibold"
            onClick={newFile}
          >
            New File
          </button>
        </div>
      </div>
      {selectedFile && (
        <div className="bg-[var(--surface)] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.24)]">
          <h2 className="text-lg font-semibold mb-2">Selected File</h2>
          <p>{selectedFile}</p>
        </div>
      )}
    </div>
  )
}

export default FileManager
