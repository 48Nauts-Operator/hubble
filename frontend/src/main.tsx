import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { VersionTimeline } from './pages/VersionTimeline.tsx'
import '@/styles/globals.css'

// Simple routing based on pathname
const pathname = window.location.pathname

const AppRouter = () => {
  if (pathname === '/version') {
    return <VersionTimeline />
  }
  return <App />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>,
)