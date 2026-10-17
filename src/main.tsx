import AppmintBoundary from "@/lib/appmintBoundary";
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(<AppmintBoundary><React.StrictMode>
    <App />
  </React.StrictMode>,</AppmintBoundary>)
