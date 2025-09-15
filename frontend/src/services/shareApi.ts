// ABOUTME: Share API service for managing shared bookmark views
// ABOUTME: Provides functions for creating, reading, updating, and deleting shared views

import { ApiError } from './api'
import { authService } from './authApi'

// Use relative URL for production, localhost for development
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8889/api'
  : '/api'

export interface SharePermissions {
  canAdd: boolean
  canEdit: boolean
  canDelete: boolean
}

export interface ShareAccess {
  expiresAt?: Date
  maxUses?: number
  currentUses: number
}

export interface ShareAppearance {
  theme: 'light' | 'dark' | 'system'
  title?: string
  description?: string
  showDescription: boolean
  showTags: boolean
  showEnvironment: boolean
}

export interface SharedView {
  id: string
  uid: string
  name: string
  description?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
  isPublic: boolean
  permissions: SharePermissions
  access: ShareAccess
  appearance: ShareAppearance
  selectedGroups: string[]
  selectedBookmarks: string[]
  lastAccessedAt?: Date
  shareUrl: string
}

export interface CreateShareRequest {
  name: string
  description?: string
  isPublic: boolean
  permissions: SharePermissions
  access: {
    expiresAt?: string
    maxUses?: number
  }
  appearance: Omit<ShareAppearance, 'showDescription' | 'showTags' | 'showEnvironment'> & {
    showDescription: boolean
    showTags: boolean
    showEnvironment: boolean
  }
  selectedGroups: string[]
  selectedBookmarks: string[]
}

export interface UpdateShareRequest extends Partial<CreateShareRequest> {}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    // If 401, clear token and redirect to login
    if (response.status === 401) {
      authService.clearToken()
      window.location.href = '/login'
    }
    const errorText = await response.text()
    throw new ApiError(response.status, errorText || `HTTP error! status: ${response.status}`)
  }
  return response.json()
}

// Type guards for API responses
function isValidShareResponse(data: any): data is Record<string, any> {
  return data && typeof data === 'object' && (data.id || data.uid)
}

function isValidSharesResponse(data: any): data is Record<string, any> {
  return data && typeof data === 'object' && (Array.isArray(data) || Array.isArray(data.shares))
}

// Transform backend share data to frontend format
function transformShare(backendShare: any): SharedView {
  // Always use the actual origin for share URLs
  const baseUrl = window.location.origin

  // Parse permissions - handle both object and individual fields
  const permissions = backendShare.permissions ? (
    typeof backendShare.permissions === 'string' 
      ? JSON.parse(backendShare.permissions)
      : backendShare.permissions
  ) : {
    canAddBookmarks: backendShare.can_add || false,
    canEditBookmarks: backendShare.can_edit || false,
    canDeleteBookmarks: backendShare.can_delete || false
  }

  // Parse branding if it exists
  const branding = backendShare.branding ? (
    typeof backendShare.branding === 'string'
      ? JSON.parse(backendShare.branding)
      : backendShare.branding
  ) : null

  return {
    id: backendShare.id,
    uid: backendShare.uid,
    name: backendShare.name,
    description: backendShare.description,
    createdBy: backendShare.created_by,
    createdAt: new Date(backendShare.created_at),
    updatedAt: new Date(backendShare.updated_at || backendShare.created_at),
    isPublic: backendShare.access_type === 'public',
    permissions: {
      canAdd: permissions.canAddBookmarks || false,
      canEdit: permissions.canEditBookmarks || false,
      canDelete: permissions.canDeleteBookmarks || false
    },
    access: {
      expiresAt: backendShare.expires_at ? new Date(backendShare.expires_at) : undefined,
      maxUses: backendShare.max_uses,
      currentUses: backendShare.current_uses || 0
    },
    appearance: {
      theme: backendShare.theme || 'system',
      title: branding?.title || backendShare.custom_title,
      description: branding?.subtitle || backendShare.custom_description,
      showDescription: backendShare.show_description !== false,
      showTags: backendShare.show_tags !== false,
      showEnvironment: backendShare.show_environment !== false
    },
    selectedGroups: Array.isArray(backendShare.included_groups) 
      ? backendShare.included_groups 
      : (backendShare.included_groups ? JSON.parse(backendShare.included_groups) : []),
    selectedBookmarks: Array.isArray(backendShare.selected_bookmarks) 
      ? backendShare.selected_bookmarks 
      : (backendShare.selected_bookmarks ? JSON.parse(backendShare.selected_bookmarks) : []),
    lastAccessedAt: backendShare.last_accessed_at ? new Date(backendShare.last_accessed_at) : undefined,
    shareUrl: backendShare.share_url || `${baseUrl}/share/${backendShare.uid}`
  }
}

// Transform frontend share data to backend format
function transformShareForBackend(share: CreateShareRequest | UpdateShareRequest): any {
  const result: any = {
    name: share.name,
    description: share.description,
    access_type: share.isPublic ? 'public' : 'restricted',
    included_groups: share.selectedGroups || [],
    excluded_groups: [],
    included_tags: [],
    environments: [],
    permissions: {
      canAddBookmarks: share.permissions?.canAdd || false,
      canEditBookmarks: share.permissions?.canEdit || false,
      canDeleteBookmarks: share.permissions?.canDelete || false,
      canCreateGroups: false,
      canSeeAnalytics: false
    },
    theme: share.appearance?.theme === 'system' ? 'auto' : (share.appearance?.theme || 'auto'),
    layout: 'grid'
  }

  // Only add expires_at and max_uses if they have values
  if (share.access?.expiresAt) {
    result.expires_at = share.access.expiresAt
  }
  if (share.access?.maxUses) {
    result.max_uses = share.access.maxUses
  }

  // Only add branding if title or description exists
  if (share.appearance?.title || share.appearance?.description) {
    result.branding = {
      title: share.appearance?.title || '',
      subtitle: share.appearance?.description || ''
    }
  }

  return result
}

export const shareApi = {
  async getAllShares(): Promise<SharedView[]> {
    const response = await fetch(`${API_BASE_URL}/shares`, {
      headers: authService.getAuthHeaders()
    })
    const data = await handleResponse<unknown>(response)

    if (!isValidSharesResponse(data)) {
      throw new Error('Invalid shares response format')
    }

    // Handle both array and object with shares property
    const shares = Array.isArray(data) ? data : (data.shares || [])
    return shares.map(transformShare)
  },

  async createShare(share: CreateShareRequest): Promise<SharedView> {
    const response = await fetch(`${API_BASE_URL}/shares`, {
      method: 'POST',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify(transformShareForBackend(share))
    })
    const data = await handleResponse<unknown>(response)

    if (!isValidShareResponse(data)) {
      throw new Error('Invalid share response format')
    }

    return transformShare(data)
  },

  async getShare(id: string): Promise<SharedView> {
    const response = await fetch(`${API_BASE_URL}/shares/${id}`, {
      headers: authService.getAuthHeaders()
    })
    const data = await handleResponse<unknown>(response)

    if (!isValidShareResponse(data)) {
      throw new Error('Invalid share response format')
    }

    return transformShare(data)
  },

  async updateShare(id: string, share: UpdateShareRequest): Promise<SharedView> {
    const response = await fetch(`${API_BASE_URL}/shares/${id}`, {
      method: 'PUT',
      headers: authService.getAuthHeaders(),
      body: JSON.stringify(transformShareForBackend(share))
    })
    const data = await handleResponse<unknown>(response)

    if (!isValidShareResponse(data)) {
      throw new Error('Invalid share response format')
    }

    return transformShare(data)
  },

  async deleteShare(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/shares/${id}`, {
      method: 'DELETE',
      headers: authService.getAuthHeaders()
    })
    if (!response.ok) {
      throw new ApiError(response.status, `HTTP error! status: ${response.status}`)
    }
  },

  async getPublicShare(uid: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/public/share/${uid}`)
    const data = await handleResponse<unknown>(response)

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid public share response format')
    }

    return data
  },

  async getShareAnalytics(id: string): Promise<{
    totalViews: number
    uniqueVisitors: number
    lastAccessed?: Date
    dailyViews: { date: string; views: number }[]
  }> {
    const response = await fetch(`${API_BASE_URL}/shares/${id}/analytics`, {
      headers: authService.getAuthHeaders()
    })
    const data = await handleResponse<unknown>(response)

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid analytics response format')
    }

    const analyticsData = data as Record<string, any>
    return {
      totalViews: typeof analyticsData.totalViews === 'number' ? analyticsData.totalViews : 0,
      uniqueVisitors: typeof analyticsData.uniqueVisitors === 'number' ? analyticsData.uniqueVisitors : 0,
      lastAccessed: analyticsData.lastAccessed ? new Date(analyticsData.lastAccessed) : undefined,
      dailyViews: Array.isArray(analyticsData.dailyViews) ? analyticsData.dailyViews : []
    }
  }
}