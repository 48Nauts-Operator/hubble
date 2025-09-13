// ABOUTME: Authentication API service for login, setup, and session management
// ABOUTME: Handles JWT token storage and auth state management

const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8889/api'
  : '/api'

const TOKEN_KEY = 'hubble_auth_token'

export interface AuthStatus {
  enabled: boolean
  configured: boolean
  message: string
}

export interface LoginResponse {
  success: boolean
  token: string
  expiresAt: string
}

export interface SetupRequest {
  password: string
  email?: string
}

class AuthService {
  private token: string | null = null

  constructor() {
    // Load token from localStorage on init
    this.token = localStorage.getItem(TOKEN_KEY)
  }

  // Get stored token
  getToken(): string | null {
    return this.token
  }

  // Set token and store in localStorage
  setToken(token: string): void {
    this.token = token
    localStorage.setItem(TOKEN_KEY, token)
  }

  // Clear token
  clearToken(): void {
    this.token = null
    localStorage.removeItem(TOKEN_KEY)
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.token
  }

  // Get auth headers for API requests
  getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    return headers
  }

  // Check auth status (enabled/configured)
  async checkStatus(): Promise<AuthStatus> {
    const response = await fetch(`${API_BASE_URL}/auth/status`)
    if (!response.ok) {
      throw new Error('Failed to check auth status')
    }
    return response.json()
  }

  // Setup auth (first-time)
  async setup(data: SetupRequest): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/setup`, {
      method: 'POST',
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
    if (result.token) {
      this.setToken(result.token)
    }
    return result
  }

  // Login
  async login(password: string, remember: boolean = false): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
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
    if (result.token) {
      this.setToken(result.token)
    }
    return result
  }

  // Logout
  async logout(): Promise<void> {
    if (this.token) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: this.getAuthHeaders()
        })
      } catch (error) {
        console.error('Logout error:', error)
      }
    }
    this.clearToken()
  }

  // Verify current token
  async verifyToken(): Promise<boolean> {
    if (!this.token) {
      return false
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      })
      
      if (!response.ok) {
        this.clearToken()
        return false
      }
      
      const result = await response.json()
      return result.valid === true
    } catch (error) {
      console.error('Token verification error:', error)
      return false
    }
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