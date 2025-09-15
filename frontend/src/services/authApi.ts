// ABOUTME: Authentication API service for login, setup, and session management
// ABOUTME: Handles JWT token storage and auth state management

import { environmentService } from '@/config/environment'

const API_BASE_URL = environmentService.getApiBaseUrl()

export interface AuthStatus {
  enabled: boolean
  configured: boolean
  message: string
}

export interface LoginResponse {
  success: boolean
  expiresAt?: string
}

export interface SetupRequest {
  password: string
  email?: string
}

class AuthService {
  private authenticated: boolean = false

  constructor() {
    // Authentication state will be determined by server response
    // Cookies are handled automatically by the browser
    this.authenticated = false
  }

  // Check if user is authenticated (will be set after successful API calls)
  isAuthenticated(): boolean {
    return this.authenticated
  }

  // Set authentication state
  setAuthenticated(value: boolean): void {
    this.authenticated = value
  }

  // Get auth headers for API requests
  getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }

    // Cookies are sent automatically, no need for Authorization header
    return headers
  }

  // Check auth status (enabled/configured)
  async checkStatus(): Promise<AuthStatus> {
    const response = await fetch(`${API_BASE_URL}/auth/status`, {
      credentials: 'include' // Include cookies
    })
    if (!response.ok) {
      throw new Error('Failed to check auth status')
    }
    return response.json()
  }

  // Setup auth (first-time)
  async setup(data: SetupRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/setup`, {
      method: 'POST',
      credentials: 'include', // Include cookies
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Setup failed')
    }

    const result = await response.json()
    if (result.success) {
      this.setAuthenticated(true)
    }
    return result
  }

  // Login
  async login(password: string, remember: boolean = false): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include', // Include cookies
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({ password, remember })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Login failed')
    }

    const result = await response.json()
    if (result.success) {
      this.setAuthenticated(true)
    }
    return result
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include', // Include cookies
        headers: this.getAuthHeaders()
      })
    } catch (error) {
      console.error('Logout error:', error)
    }
    this.setAuthenticated(false)
  }

  // Verify current auth status
  async verifyAuth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'POST',
        credentials: 'include', // Include cookies
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        this.setAuthenticated(false)
        return false
      }

      const result = await response.json()
      const isValid = result.valid === true
      this.setAuthenticated(isValid)
      return isValid
    } catch (error) {
      console.error('Auth verification error:', error)
      this.setAuthenticated(false)
      return false
    }
  }

  // Alias for verifyAuth (for backward compatibility)
  async verifyToken(): Promise<boolean> {
    return this.verifyAuth()
  }

  // Clear token/authentication (for backward compatibility)
  clearToken(): void {
    this.setAuthenticated(false)
    // Token is in httpOnly cookie, cleared by logout endpoint
  }
}

// Create singleton instance
export const authService = new AuthService()

// Update the existing API services to use auth headers
export function updateApiAuth() {
  const headers = authService.getAuthHeaders()
  // This will be used by other API services
  return headers
}