import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.tsx'
import { VersionTimeline } from './pages/VersionTimeline.tsx'
import { SharedView } from './pages/SharedView.tsx'
import '@/styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/version" element={<VersionTimeline />} />
        <Route path="/share/:uid" element={<SharedView />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)