// ABOUTME: Secure favicon service that uses backend proxy to prevent SSRF
// ABOUTME: Includes client-side caching and fallback mechanisms

import { environmentService } from '@/config/environment'

const API_BASE_URL = environmentService.getApiBaseUrl()

// Client-side cache for favicon URLs
const faviconCache = new Map<string, { url: string; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

export interface FaviconResponse {
  favicon: string
}

export class FaviconService {
  /**
   * Get a favicon URL for a domain through our secure proxy
   * @param domain The domain to get favicon for
   * @returns The favicon URL or null if not available
   */
  async getFavicon(domain: string): Promise<string | null> {
    try {
      // Check cache first
      const cacheKey = domain.toLowerCase()
      const cached = faviconCache.get(cacheKey)

      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.url
      }

      // Fetch from our secure backend proxy
      const response = await fetch(
        `${API_BASE_URL}/favicon?domain=${encodeURIComponent(domain)}`,
        {
          credentials: 'include',
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        }
      )

      if (!response.ok) {
        console.error(`Failed to fetch favicon for ${domain}:`, response.status)
        return null
      }

      const data: FaviconResponse = await response.json()

      if (data.favicon) {
        // Cache the result
        faviconCache.set(cacheKey, {
          url: data.favicon,
          timestamp: Date.now()
        })

        // Clean old cache entries if cache is getting large
        if (faviconCache.size > 500) {
          this.cleanCache()
        }

        return data.favicon
      }

      return null
    } catch (error) {
      console.error(`Error fetching favicon for ${domain}:`, error)
      return null
    }
  }

  /**
   * Validate a favicon URL through our backend
   * @param url The URL to validate
   * @returns Validation result
   */
  async validateFaviconUrl(url: string): Promise<{
    valid: boolean
    error?: string
    sanitizedUrl?: string
  }> {
    try {
      const response = await fetch(`${API_BASE_URL}/favicon/validate`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ url })
      })

      if (!response.ok) {
        return { valid: false, error: 'Validation request failed' }
      }

      return await response.json()
    } catch (error) {
      console.error('Error validating favicon URL:', error)
      return { valid: false, error: 'Network error during validation' }
    }
  }

  /**
   * Get favicon for a full URL (extracts domain automatically)
   * @param url The full URL
   * @returns The favicon URL or null
   */
  async getFaviconForUrl(url: string): Promise<string | null> {
    try {
      const domain = new URL(url).hostname
      return this.getFavicon(domain)
    } catch {
      return null
    }
  }

  /**
   * Clean expired entries from the cache
   */
  private cleanCache(): void {
    const now = Date.now()
    const expired: string[] = []

    faviconCache.forEach((value, key) => {
      if (now - value.timestamp > CACHE_TTL) {
        expired.push(key)
      }
    })

    expired.forEach(key => faviconCache.delete(key))
  }

  /**
   * Clear the entire favicon cache
   */
  clearCache(): void {
    faviconCache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; oldestEntry: number | null } {
    let oldestTimestamp: number | null = null

    faviconCache.forEach(value => {
      if (!oldestTimestamp || value.timestamp < oldestTimestamp) {
        oldestTimestamp = value.timestamp
      }
    })

    return {
      size: faviconCache.size,
      oldestEntry: oldestTimestamp
    }
  }
}

// Export singleton instance
export const faviconService = new FaviconService()