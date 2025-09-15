/**
 * @fileoverview Hubble API service layer providing type-safe access to backend REST APIs.
 * Handles authentication, error handling, and data transformation between frontend and backend formats.
 *
 * @version 1.0.0
 * @author Hubble Development Team
 */

import type { Bookmark, BookmarkGroup } from '@/stores/useBookmarkStore'
import { authService } from './authApi'
import { environmentService } from '@/config/environment'

// Get API URLs from environment configuration
const API_BASE_URL = environmentService.getApiBaseUrl()
const MCP_BASE_URL = environmentService.getMcpBaseUrl()

/**
 * Custom error class for API-related errors with HTTP status information.
 *
 * @class ApiError
 * @extends Error
 * @example
 * ```typescript
 * throw new ApiError(404, 'Resource not found')
 * ```
 */
export class ApiError extends Error {
  /**
   * Creates a new ApiError instance.
   *
   * @param status - HTTP status code (e.g., 404, 500)
   * @param message - Human-readable error message
   */
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Handles HTTP response parsing and error handling.
 * Automatically handles 401 authentication errors by redirecting to login.
 *
 * @template T - Expected response data type
 * @param response - The fetch Response object
 * @returns Promise resolving to parsed JSON data
 * @throws {ApiError} When response status indicates an error
 *
 * @internal
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    // If 401, clear auth state and redirect to login
    if (response.status === 401) {
      authService.setAuthenticated(false)
      window.location.href = '/login'
    }
    throw new ApiError(response.status, `HTTP error! status: ${response.status}`)
  }
  return response.json()
}

/**
 * Gets authentication headers for API requests.
 *
 * @returns Headers object with authentication tokens
 * @internal
 */
function getHeaders(): HeadersInit {
  return authService.getAuthHeaders()
}

/**
 * Gets standardized fetch options with authentication and credentials.
 *
 * @param options - Additional RequestInit options to merge
 * @returns Complete RequestInit configuration for API calls
 * @internal
 */
function getFetchOptions(options: RequestInit = {}): RequestInit {
  return {
    ...options,
    credentials: 'include', // Always include cookies
    headers: {
      ...getHeaders(),
      ...(options.headers || {})
    }
  }
}

/**
 * Type guard to validate backend bookmark data structure.
 *
 * @param data - Raw data from backend API
 * @returns True if data has required bookmark properties
 * @internal
 */
function isValidBackendBookmark(data: any): data is Record<string, any> {
  return data && typeof data === 'object' && data.id && data.title;
}

/**
 * Safely creates a Date object with fallback to current date.
 *
 * @param dateValue - Date string, timestamp, or Date object
 * @returns Valid Date object, current date if parsing fails
 * @internal
 */
function safeCreateDate(dateValue: any): Date {
  if (!dateValue) return new Date();
  const date = new Date(dateValue);
  return isNaN(date.getTime()) ? new Date() : date;
}

/**
 * Transforms backend bookmark data to frontend Bookmark type.
 * Handles field mapping, type conversion, and data validation.
 *
 * @param backendBookmark - Raw bookmark data from backend API
 * @returns Transformed bookmark object matching frontend type
 * @throws {Error} If bookmark data is invalid or missing required fields
 * @internal
 */
function transformBookmark(backendBookmark: any): Bookmark {
  if (!isValidBackendBookmark(backendBookmark)) {
    throw new Error('Invalid bookmark data received from backend');
  }

  // Safely parse tags
  let tags: string[] = [];
  if (Array.isArray(backendBookmark.tags)) {
    tags = backendBookmark.tags.filter(tag => typeof tag === 'string');
  } else if (typeof backendBookmark.tags === 'string') {
    try {
      const parsed = JSON.parse(backendBookmark.tags);
      tags = Array.isArray(parsed) ? parsed.filter(tag => typeof tag === 'string') : [];
    } catch {
      tags = [];
    }
  }

  return {
    id: String(backendBookmark.id),
    title: String(backendBookmark.title || 'Untitled'),
    // Use external_url if available, otherwise fall back to legacy url field
    url: String(backendBookmark.external_url || backendBookmark.url || ''),
    internalUrl: backendBookmark.internal_url ? String(backendBookmark.internal_url) : undefined,
    externalUrl: String(backendBookmark.external_url || backendBookmark.url || ''),
    description: backendBookmark.description ? String(backendBookmark.description) : undefined,
    favicon: backendBookmark.favicon ? String(backendBookmark.favicon) : undefined,
    icon: String(backendBookmark.icon || '🔗'),
    tags,
    groupId: backendBookmark.group_id ? String(backendBookmark.group_id) : 'default',
    environment: backendBookmark.environment || undefined,
    healthStatus: backendBookmark.health_status === 'up' ? 'healthy' :
                  backendBookmark.health_status === 'down' ? 'down' : 'unknown',
    clickCount: typeof backendBookmark.click_count === 'number' ? backendBookmark.click_count : 0,
    lastClicked: backendBookmark.last_accessed ? safeCreateDate(backendBookmark.last_accessed) : undefined,
    createdAt: safeCreateDate(backendBookmark.created_at),
    updatedAt: safeCreateDate(backendBookmark.updated_at || backendBookmark.created_at)
  }
}

/**
 * Type guard to validate backend group data structure.
 *
 * @param data - Raw data from backend API
 * @returns True if data has required group properties
 * @internal
 */
function isValidBackendGroup(data: any): data is Record<string, any> {
  return data && typeof data === 'object' && data.id && data.name;
}

/**
 * Transforms backend group data to frontend BookmarkGroup type.
 * Handles field mapping, type conversion, and data validation.
 *
 * @param backendGroup - Raw group data from backend API
 * @returns Transformed group object matching frontend type
 * @throws {Error} If group data is invalid or missing required fields
 * @internal
 */
function transformGroup(backendGroup: any): BookmarkGroup {
  if (!isValidBackendGroup(backendGroup)) {
    throw new Error('Invalid group data received from backend');
  }

  return {
    id: String(backendGroup.id),
    name: String(backendGroup.name || 'Unnamed Group'),
    description: backendGroup.description ? String(backendGroup.description) : undefined,
    icon: String(backendGroup.icon || '📁'),
    color: String(backendGroup.color || '#d946ef'),
    parentId: backendGroup.parent_id ? String(backendGroup.parent_id) : undefined,
    bookmarks: [], // Will be populated separately
    subgroups: [], // Will be populated separately
    createdAt: safeCreateDate(backendGroup.created_at),
    updatedAt: safeCreateDate(backendGroup.updated_at || backendGroup.created_at)
  }
}

/**
 * Bookmark API service for managing bookmarks in the Hubble application.
 * Provides CRUD operations and data synchronization with the backend.
 *
 * @namespace bookmarkApi
 * @example
 * ```typescript
 * import { bookmarkApi } from '@/services/api'
 *
 * // Get all bookmarks
 * const bookmarks = await bookmarkApi.getAllBookmarks()
 *
 * // Create a new bookmark
 * const newBookmark = await bookmarkApi.createBookmark({
 *   title: 'Example Site',
 *   url: 'https://example.com',
 *   groupId: 'production',
 *   tags: ['webapp', 'external']
 * })
 * ```
 */
export const bookmarkApi = {
  /**
   * Retrieves all bookmarks from the server.
   *
   * @returns Promise resolving to array of bookmarks
   * @throws {ApiError} When the request fails or returns invalid data
   * @throws {Error} When authentication fails or network error occurs
   *
   * @example
   * ```typescript
   * try {
   *   const bookmarks = await bookmarkApi.getAllBookmarks()
   *   console.log(`Found ${bookmarks.length} bookmarks`)
   * } catch (error) {
   *   console.error('Failed to load bookmarks:', error.message)
   * }
   * ```
   */
  async getAllBookmarks(): Promise<Bookmark[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/bookmarks`, getFetchOptions())
      const data = await handleResponse<{ bookmarks: any[] } | any[]>(response)
      // Handle both paginated response and direct array
      const bookmarksData = Array.isArray(data) ? data : (data.bookmarks || [])

      // Filter out invalid bookmarks and log errors
      const validBookmarks: Bookmark[] = []
      bookmarksData.forEach((bookmark, index) => {
        try {
          validBookmarks.push(transformBookmark(bookmark))
        } catch (error) {
          console.error(`Failed to transform bookmark at index ${index}:`, error, bookmark)
        }
      })

      return validBookmarks
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error)
      throw new Error('Unable to load bookmarks. Please try again later.')
    }
  },

  /**
   * Creates a new bookmark on the server.
   *
   * @param bookmark - Bookmark data without system-generated fields
   * @returns Promise resolving to the created bookmark with server-generated fields
   * @throws {Error} When required fields are missing or invalid
   * @throws {ApiError} When the server request fails
   *
   * @example
   * ```typescript
   * const newBookmark = await bookmarkApi.createBookmark({
   *   title: 'My App Dashboard',
   *   url: 'https://dashboard.myapp.com',
   *   externalUrl: 'https://dashboard.myapp.com',
   *   internalUrl: 'http://192.168.1.100:3000',
   *   groupId: 'production',
   *   environment: 'production',
   *   tags: ['dashboard', 'monitoring'],
   *   icon: '📊',
   *   description: 'Main application dashboard'
   * })
   * ```
   */
  async createBookmark(bookmark: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>): Promise<Bookmark> {
    try {
      // Validate required fields
      if (!bookmark.title?.trim()) {
        throw new Error('Bookmark title is required')
      }
      if (!bookmark.url?.trim()) {
        throw new Error('Bookmark URL is required')
      }

      // Map frontend field names to backend field names
      const backendBookmark = {
        title: bookmark.title.trim(),
        url: bookmark.url.trim(),
        internal_url: bookmark.internalUrl?.trim() || undefined,
        external_url: bookmark.externalUrl?.trim() || undefined,
        description: bookmark.description?.trim() || '',
        group_id: bookmark.groupId || 'default',
        tags: Array.isArray(bookmark.tags) ? bookmark.tags : [],
        icon: bookmark.icon || '🔗',
        environment: bookmark.environment,
        click_count: typeof bookmark.clickCount === 'number' ? bookmark.clickCount : 0
      }

      const response = await fetch(`${API_BASE_URL}/bookmarks`, getFetchOptions({
        method: 'POST',
        body: JSON.stringify(backendBookmark)
      }))
      const data = await handleResponse<any>(response)
      return transformBookmark(data)
    } catch (error) {
      console.error('Failed to create bookmark:', error)
      throw error instanceof Error ? error : new Error('Unable to create bookmark')
    }
  },

  /**
   * Updates an existing bookmark on the server.
   *
   * @param id - Unique identifier of the bookmark to update
   * @param bookmark - Partial bookmark data with fields to update
   * @returns Promise resolving to the updated bookmark
   * @throws {Error} When bookmark ID is missing or invalid
   * @throws {ApiError} When the server request fails
   */
  async updateBookmark(id: string, bookmark: Partial<Bookmark>): Promise<Bookmark> {
    try {
      if (!id?.trim()) {
        throw new Error('Bookmark ID is required')
      }

      // Map frontend field names to backend field names with validation
      const backendBookmark: any = {}
      if (bookmark.title !== undefined) {
        const title = bookmark.title?.trim()
        if (title) backendBookmark.title = title
      }
      if (bookmark.url !== undefined) {
        const url = bookmark.url?.trim()
        if (url) backendBookmark.url = url
      }
      if (bookmark.internalUrl !== undefined) {
        const internalUrl = bookmark.internalUrl?.trim()
        if (internalUrl) backendBookmark.internal_url = internalUrl
      }
      if (bookmark.externalUrl !== undefined) {
        const externalUrl = bookmark.externalUrl?.trim()
        if (externalUrl) backendBookmark.external_url = externalUrl
      }
      if (bookmark.description !== undefined) {
        backendBookmark.description = bookmark.description?.trim() || ''
      }
      if (bookmark.groupId !== undefined) {
        backendBookmark.group_id = bookmark.groupId || 'default'
      }
      if (bookmark.tags !== undefined) {
        backendBookmark.tags = Array.isArray(bookmark.tags) ? bookmark.tags : []
      }
      if (bookmark.icon !== undefined) {
        backendBookmark.icon = bookmark.icon || '🔗'
      }
      if (bookmark.environment !== undefined) {
        backendBookmark.environment = bookmark.environment
      }
      if (bookmark.healthStatus !== undefined) {
        backendBookmark.health_status = bookmark.healthStatus === 'healthy' ? 'up' :
                                       bookmark.healthStatus === 'down' ? 'down' : 'unknown'
      }

      const response = await fetch(`${API_BASE_URL}/bookmarks/${encodeURIComponent(id)}`, getFetchOptions({
        method: 'PUT',
        body: JSON.stringify(backendBookmark)
      }))
      const data = await handleResponse<any>(response)
      return transformBookmark(data)
    } catch (error) {
      console.error('Failed to update bookmark:', error)
      throw error instanceof Error ? error : new Error('Unable to update bookmark')
    }
  },

  /**
   * Deletes a bookmark from the server.
   *
   * @param id - Unique identifier of the bookmark to delete
   * @returns Promise that resolves when deletion is complete
   * @throws {Error} When bookmark ID is missing
   * @throws {ApiError} When the server request fails
   */
  async deleteBookmark(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/bookmarks/${id}`, getFetchOptions({
      method: 'DELETE'
    }))
    if (!response.ok) {
      throw new ApiError(response.status, `HTTP error! status: ${response.status}`)
    }
  },

  async searchBookmarks(query: string): Promise<Bookmark[]> {
    const response = await fetch(`${API_BASE_URL}/bookmarks/search?q=${encodeURIComponent(query)}`, getFetchOptions())
    const data = await handleResponse<any[]>(response)
    return data.map(transformBookmark)
  }
}

// Group API
/**
 * Group API service for managing bookmark groups in the Hubble application.
 * Provides operations for organizing bookmarks into hierarchical categories.
 *
 * @namespace groupApi
 * @example
 * ```typescript
 * import { groupApi } from '@/services/api'
 *
 * // Get all groups
 * const groups = await groupApi.getAllGroups()
 * ```
 */
export const groupApi = {
  /**
   * Retrieves all bookmark groups from the server.
   *
   * @returns Promise resolving to array of bookmark groups
   * @throws {ApiError} When the request fails or returns invalid data
   * @throws {Error} When authentication fails or network error occurs
   */
  async getAllGroups(): Promise<BookmarkGroup[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/groups`, getFetchOptions())
      const data = await handleResponse<any[]>(response)

      // Filter out invalid groups and log errors
      const validGroups: BookmarkGroup[] = []
      data.forEach((group, index) => {
        try {
          validGroups.push(transformGroup(group))
        } catch (error) {
          console.error(`Failed to transform group at index ${index}:`, error, group)
        }
      })

      return validGroups
    } catch (error) {
      console.error('Failed to fetch groups:', error)
      throw new Error('Unable to load groups. Please try again later.')
    }
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
    
    const response = await fetch(`${API_BASE_URL}/groups`, getFetchOptions({
      method: 'POST',
      body: JSON.stringify(backendGroup)
    }))
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
    
    const response = await fetch(`${API_BASE_URL}/groups/${id}`, getFetchOptions({
      method: 'PUT',
      body: JSON.stringify(backendGroup)
    }))
    const data = await handleResponse<any>(response)
    return transformGroup(data)
  },

  async deleteGroup(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/groups/${id}`, getFetchOptions({
      method: 'DELETE'
    }))
    if (!response.ok) {
      throw new ApiError(response.status, `HTTP error! status: ${response.status}`)
    }
  },

  async reorderGroups(groups: { id: string; sort_order: number }[]): Promise<BookmarkGroup[]> {
    const response = await fetch(`${API_BASE_URL}/groups/reorder`, getFetchOptions({
      method: 'PUT',
      body: JSON.stringify({ groups })
    }))
    const data = await handleResponse<any[]>(response)
    return data.map(transformGroup)
  }
}

// MCP Server API
/**
 * MCP API service for interacting with the Model Context Protocol server.
 * Enables external integrations and programmatic bookmark management.
 *
 * @namespace mcpApi
 * @example
 * ```typescript
 * import { mcpApi } from '@/services/api'
 *
 * // Check MCP server status
 * const status = await mcpApi.getServerStatus()
 *
 * // Execute MCP command
 * const result = await mcpApi.executeCommand('add_bookmark', {
 *   title: 'Example',
 *   url: 'https://example.com'
 * })
 * ```
 */
export const mcpApi = {
  /**
   * Gets the status of the MCP server.
   *
   * @returns Promise resolving to server status information
   * @throws {ApiError} When the MCP server is unreachable
   */
  async getServerStatus(): Promise<{ status: string; version?: string }> {
    const response = await fetch(`${MCP_BASE_URL}/status`, getFetchOptions())
    return handleResponse<{ status: string; version?: string }>(response)
  },

  /**
   * Executes a command on the MCP server.
   *
   * @param command - Name of the MCP command to execute
   * @param args - Optional arguments for the command
   * @returns Promise resolving to command execution result
   * @throws {ApiError} When command execution fails
   */
  async executeCommand(command: string, args?: any): Promise<any> {
    const response = await fetch(`${MCP_BASE_URL}/execute`, getFetchOptions({
      method: 'POST',
      body: JSON.stringify({ command, args })
    }))
    return handleResponse<any>(response)
  }
}

// ApiError is already exported above