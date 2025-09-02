import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.tsx'
import { VersionTimeline } from './pages/VersionTimeline.tsx'
import { SharedView } from './pages/SharedView.tsx'
import { Login } from './pages/Login.tsx'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'
import '@/styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/share/:uid" element={<SharedView />} />
        <Route path="/" element={
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        } />
        <Route path="/version" element={
          <ProtectedRoute>
            <VersionTimeline />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)