// ABOUTME: Protected route wrapper that requires authentication
// ABOUTME: Redirects to login if user is not authenticated

import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { authService } from '@/services/authApi'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [authEnabled, setAuthEnabled] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      // First check if auth is enabled
      const status = await authService.checkStatus()
      
      if (!status.enabled) {
        // Auth is disabled, allow access
        setAuthEnabled(false)
        setIsAuthenticated(true)
        return
      }

      if (!status.configured) {
        // Auth not configured, redirect to login for setup
        setIsAuthenticated(false)
        return
      }

      // Check if we have a valid token
      if (authService.isAuthenticated()) {
        const isValid = await authService.verifyToken()
        setIsAuthenticated(isValid)
      } else {
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setIsAuthenticated(false)
    }
  }

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  // Not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Authenticated or auth disabled, render children
  return <>{children}</>
}