import type { Bookmark, BookmarkGroup } from '@/stores/useBookmarkStore'

// Use relative URL for production, localhost for development
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:8889/api'
  : '/api'
const MCP_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:9900'
  : '/mcp'

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new ApiError(response.status, `HTTP error! status: ${response.status}`)
  }
  return response.json()
}

// Transform backend bookmark data to frontend format
function transformBookmark(backendBookmark: any): Bookmark {
  return {
    id: backendBookmark.id,
    title: backendBookmark.title,
    // Use external_url if available, otherwise fall back to legacy url field
    url: backendBookmark.external_url || backendBookmark.url,
    internalUrl: backendBookmark.internal_url,
    externalUrl: backendBookmark.external_url || backendBookmark.url,
    description: backendBookmark.description,
    favicon: backendBookmark.favicon,
    icon: backendBookmark.icon,
    tags: Array.isArray(backendBookmark.tags) ? backendBookmark.tags : [],
    groupId: backendBookmark.group_id,
    environment: backendBookmark.environment,
    healthStatus: backendBookmark.health_status === 'up' ? 'healthy' : 
                  backendBookmark.health_status === 'down' ? 'down' : 'unknown',
    clickCount: backendBookmark.click_count || 0,
    lastClicked: backendBookmark.last_accessed ? new Date(backendBookmark.last_accessed) : undefined,
    createdAt: new Date(backendBookmark.created_at),
    updatedAt: new Date(backendBookmark.updated_at || backendBookmark.created_at)
  }
}

// Transform backend group data to frontend format
function transformGroup(backendGroup: any): BookmarkGroup {
  return {
    id: backendGroup.id,
    name: backendGroup.name,
    description: backendGroup.description,
    icon: backendGroup.icon,
    color: backendGroup.color,
    parentId: backendGroup.parent_id,
    bookmarks: [], // Will be populated separately
    subgroups: [], // Will be populated separately
    createdAt: new Date(backendGroup.created_at),
    updatedAt: new Date(backendGroup.updated_at || backendGroup.created_at)
  }
}

// Bookmark API
export const bookmarkApi = {
  async getAllBookmarks(): Promise<Bookmark[]> {
    const response = await fetch(`${API_BASE_URL}/bookmarks`)
    const data = await handleResponse<{ bookmarks: any[] } | any[]>(response)
    // Handle both paginated response and direct array
    const bookmarksData = Array.isArray(data) ? data : (data.bookmarks || [])
    return bookmarksData.map(transformBookmark)
  },

  async createBookmark(bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>): Promise<Bookmark> {
    // Map frontend field names to backend field names
    const backendBookmark = {
      title: bookmark.title,
      url: bookmark.url,
      internal_url: bookmark.internalUrl,
      external_url: bookmark.externalUrl,
      description: bookmark.description || '',
      group_id: bookmark.groupId || 'default', // Map groupId to group_id
      tags: bookmark.tags || [],
      icon: bookmark.icon || '🔗',
      environment: bookmark.environment,
      click_count: bookmark.clickCount || 0
    }
    
    const response = await fetch(`${API_BASE_URL}/bookmarks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendBookmark)
    })
    const data = await handleResponse<any>(response)
    return transformBookmark(data)
  },

  async updateBookmark(id: string, bookmark: Partial<Bookmark>): Promise<Bookmark> {
    // Map frontend field names to backend field names
    const backendBookmark: any = {}
    if (bookmark.title !== undefined) backendBookmark.title = bookmark.title
    if (bookmark.url !== undefined) backendBookmark.url = bookmark.url
    if (bookmark.internalUrl !== undefined) backendBookmark.internal_url = bookmark.internalUrl
    if (bookmark.externalUrl !== undefined) backendBookmark.external_url = bookmark.externalUrl
    if (bookmark.description !== undefined) backendBookmark.description = bookmark.description
    if (bookmark.groupId !== undefined) backendBookmark.group_id = bookmark.groupId
    if (bookmark.tags !== undefined) backendBookmark.tags = bookmark.tags
    if (bookmark.icon !== undefined) backendBookmark.icon = bookmark.icon
    if (bookmark.environment !== undefined) backendBookmark.environment = bookmark.environment
    if (bookmark.healthStatus !== undefined) {
      backendBookmark.health_status = bookmark.healthStatus === 'healthy' ? 'up' :
                                     bookmark.healthStatus === 'down' ? 'down' : 'unknown'
    }
    
    const response = await fetch(`${API_BASE_URL}/bookmarks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendBookmark)
    })
    const data = await handleResponse<any>(response)
    return transformBookmark(data)
  },

  async deleteBookmark(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/bookmarks/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      throw new ApiError(response.status, `HTTP error! status: ${response.status}`)
    }
  },

  async searchBookmarks(query: string): Promise<Bookmark[]> {
    const response = await fetch(`${API_BASE_URL}/bookmarks/search?q=${encodeURIComponent(query)}`)
    const data = await handleResponse<any[]>(response)
    return data.map(transformBookmark)
  }
}

// Group API
export const groupApi = {
  async getAllGroups(): Promise<BookmarkGroup[]> {
    const response = await fetch(`${API_BASE_URL}/groups`)
    const data = await handleResponse<any[]>(response)
    return data.map(transformGroup)
  },

  async createGroup(group: Omit<BookmarkGroup, 'id' | 'bookmarks' | 'createdAt' | 'updatedAt'>): Promise<BookmarkGroup> {
    // Map frontend field names to backend field names if needed
    const backendGroup = {
      name: group.name,
      parent_id: group.parentId || null,
      icon: group.icon || '📁',
      description: group.description || '',
      color: group.color || '#d946ef',
      sort_order: 0
    }
    
    const response = await fetch(`${API_BASE_URL}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendGroup)
    })
    const data = await handleResponse<any>(response)
    return transformGroup(data)
  },

  async updateGroup(id: string, group: Partial<BookmarkGroup>): Promise<BookmarkGroup> {
    // Map frontend field names to backend field names
    const backendGroup: any = {}
    if (group.name !== undefined) backendGroup.name = group.name
    if (group.parentId !== undefined) backendGroup.parent_id = group.parentId
    if (group.icon !== undefined) backendGroup.icon = group.icon
    if (group.description !== undefined) backendGroup.description = group.description
    if (group.color !== undefined) backendGroup.color = group.color
    
    const response = await fetch(`${API_BASE_URL}/groups/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendGroup)
    })
    const data = await handleResponse<any>(response)
    return transformGroup(data)
  },

  async deleteGroup(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/groups/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      throw new ApiError(response.status, `HTTP error! status: ${response.status}`)
    }
  }
}

// MCP Server API
export const mcpApi = {
  async getServerStatus(): Promise<{ status: string; version?: string }> {
    const response = await fetch(`${MCP_BASE_URL}/status`)
    return handleResponse<{ status: string; version?: string }>(response)
  },

  async executeCommand(command: string, args?: any): Promise<any> {
    const response = await fetch(`${MCP_BASE_URL}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, args })
    })
    return handleResponse<any>(response)
  }
}

export { ApiError }