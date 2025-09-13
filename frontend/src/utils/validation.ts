// ABOUTME: Input validation utilities for form data sanitization and security
// ABOUTME: Provides comprehensive validation for URLs, text fields, and user inputs

import { sanitizeText, sanitizeHtml } from './sanitize'

// Cache for validation results to improve performance
const validationCache = new Map<string, { result: ValidationResult; timestamp: number }>()
const CACHE_EXPIRY = 60000 // 1 minute
const CACHE_MAX_SIZE = 1000

// Cache management utilities
const getCachedResult = (key: string): ValidationResult | null => {
  const cached = validationCache.get(key)
  if (cached && (Date.now() - cached.timestamp) < CACHE_EXPIRY) {
    return cached.result
  }
  if (cached) {
    validationCache.delete(key) // Remove expired entry
  }
  return null
}

const setCachedResult = (key: string, result: ValidationResult): void => {
  // Clean up cache if it's getting too large
  if (validationCache.size >= CACHE_MAX_SIZE) {
    const oldestKey = validationCache.keys().next().value
    if (oldestKey) {
      validationCache.delete(oldestKey)
    }
  }
  
  validationCache.set(key, {
    result: { ...result }, // Clone to prevent mutations
    timestamp: Date.now()
  })
}

export interface ValidationResult {
  isValid: boolean
  error?: string
  sanitizedValue?: string
}

/**
 * Validates and sanitizes URL inputs
 * @param url - The URL to validate
 * @param allowLocalhost - Whether to allow localhost URLs (default: false)
 * @returns ValidationResult with sanitized URL
 */
export function validateUrl(url: string, allowLocalhost: boolean = false): ValidationResult {
  // Create cache key
  const cacheKey = `url:${url}:${allowLocalhost}`
  
  // Check cache first
  const cachedResult = getCachedResult(cacheKey)
  if (cachedResult) {
    return cachedResult
  }

  if (!url || typeof url !== 'string') {
    const result = { isValid: false, error: 'URL is required' }
    setCachedResult(cacheKey, result)
    return result
  }

  const trimmedUrl = url.trim()
  
  // Check length
  if (trimmedUrl.length > 2048) {
    const result = { isValid: false, error: 'URL is too long (max 2048 characters)' }
    setCachedResult(cacheKey, result)
    return result
  }

  // Basic URL format validation (optimized regex)
  if (!trimmedUrl.match(/^https?:\/\/.+/)) {
    const result = { isValid: false, error: 'URL must start with http:// or https://' }
    setCachedResult(cacheKey, result)
    return result
  }

  try {
    const urlObj = new URL(trimmedUrl)
    
    // Check for dangerous protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      const result = { isValid: false, error: 'Only HTTP and HTTPS URLs are allowed' }
      setCachedResult(cacheKey, result)
      return result
    }
    
    // Check localhost restriction
    if (!allowLocalhost && (
      urlObj.hostname === 'localhost' || 
      urlObj.hostname === '127.0.0.1' ||
      urlObj.hostname.startsWith('192.168.') ||
      urlObj.hostname.startsWith('10.') ||
      urlObj.hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./))
    ) {
      const result = { isValid: false, error: 'Private/localhost URLs not allowed in this field' }
      setCachedResult(cacheKey, result)
      return result
    }
    
    const result = { isValid: true, sanitizedValue: urlObj.toString() }
    setCachedResult(cacheKey, result)
    return result
  } catch (error) {
    const result = { isValid: false, error: 'Invalid URL format' }
    setCachedResult(cacheKey, result)
    return result
  }
}

/**
 * Validates and sanitizes text input
 * @param text - The text to validate
 * @param maxLength - Maximum allowed length
 * @param required - Whether the field is required
 * @param allowHtml - Whether to allow basic HTML (default: false)
 * @returns ValidationResult with sanitized text
 */
export function validateText(
  text: string, 
  maxLength: number = 255, 
  required: boolean = false,
  allowHtml: boolean = false
): ValidationResult {
  if (!text || typeof text !== 'string') {
    if (required) {
      return { isValid: false, error: 'This field is required' }
    }
    return { isValid: true, sanitizedValue: '' }
  }

  const trimmedText = text.trim()
  
  if (required && !trimmedText) {
    return { isValid: false, error: 'This field is required' }
  }

  if (trimmedText.length > maxLength) {
    return { isValid: false, error: `Text is too long (max ${maxLength} characters)` }
  }

  // Sanitize based on HTML allowance
  const sanitizedValue = allowHtml ? sanitizeHtml(trimmedText) : sanitizeText(trimmedText)
  
  return { isValid: true, sanitizedValue }
}

/**
 * Validates and sanitizes tags input
 * @param tagsString - Comma-separated tags string
 * @param maxTags - Maximum number of tags allowed
 * @param maxTagLength - Maximum length per tag
 * @returns ValidationResult with sanitized tags array
 */
export function validateTags(
  tagsString: string, 
  maxTags: number = 10, 
  maxTagLength: number = 50
): ValidationResult {
  if (!tagsString || typeof tagsString !== 'string') {
    return { isValid: true, sanitizedValue: '' }
  }

  const tags = tagsString
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean)
    .slice(0, maxTags) // Limit number of tags

  // Validate each tag
  const sanitizedTags: string[] = []
  for (const tag of tags) {
    if (tag.length > maxTagLength) {
      return { isValid: false, error: `Tag "${tag}" is too long (max ${maxTagLength} characters)` }
    }
    
    // Check for dangerous characters
    if (tag.includes('<') || tag.includes('>') || tag.includes('"') || tag.includes('\'')) {
      return { isValid: false, error: `Tag "${tag}" contains invalid characters` }
    }
    
    sanitizedTags.push(sanitizeText(tag))
  }

  return { isValid: true, sanitizedValue: sanitizedTags.join(',') }
}

/**
 * Validates emoji or URL icon input
 * @param icon - The icon string (emoji or URL)
 * @returns ValidationResult with sanitized icon
 */
export function validateIcon(icon: string): ValidationResult {
  if (!icon || typeof icon !== 'string') {
    return { isValid: true, sanitizedValue: '' }
  }

  const trimmedIcon = icon.trim()
  
  if (trimmedIcon.length > 200) {
    return { isValid: false, error: 'Icon is too long (max 200 characters)' }
  }

  // If it's a URL, validate it
  if (trimmedIcon.startsWith('http://') || trimmedIcon.startsWith('https://')) {
    const urlValidation = validateUrl(trimmedIcon)
    if (!urlValidation.isValid) {
      return { isValid: false, error: `Invalid icon URL: ${urlValidation.error}` }
    }
    return { isValid: true, sanitizedValue: urlValidation.sanitizedValue }
  }
  
  // For emoji or simple text, just sanitize
  return { isValid: true, sanitizedValue: sanitizeText(trimmedIcon) }
}

/**
 * Validates environment value
 * @param environment - The environment string
 * @returns ValidationResult with validated environment
 */
export function validateEnvironment(environment: string): ValidationResult {
  const validEnvironments = ['production', 'staging', 'uat', 'development', 'local']
  
  if (!environment || typeof environment !== 'string') {
    return { isValid: true, sanitizedValue: 'production' }
  }

  const trimmedEnv = environment.trim().toLowerCase()
  
  if (!validEnvironments.includes(trimmedEnv)) {
    return { isValid: false, error: 'Invalid environment value' }
  }

  return { isValid: true, sanitizedValue: trimmedEnv }
}

/**
 * Comprehensive bookmark form validation
 * @param formData - The form data to validate
 * @returns Object with validation results for each field
 */
export interface BookmarkFormData {
  title: string
  externalUrl?: string
  internalUrl?: string
  url?: string
  description?: string
  tags?: string
  icon?: string
  environment?: string
}

export interface BookmarkValidationResult {
  isValid: boolean
  errors: Record<string, string>
  sanitizedData: Partial<BookmarkFormData>
}

export function validateBookmarkForm(formData: BookmarkFormData): BookmarkValidationResult {
  const errors: Record<string, string> = {}
  const sanitizedData: Partial<BookmarkFormData> = {}

  // Validate title
  const titleValidation = validateText(formData.title, 200, true)
  if (!titleValidation.isValid) {
    errors.title = titleValidation.error!
  } else {
    sanitizedData.title = titleValidation.sanitizedValue
  }

  // Validate external URL
  if (formData.externalUrl) {
    const externalUrlValidation = validateUrl(formData.externalUrl)
    if (!externalUrlValidation.isValid) {
      errors.externalUrl = externalUrlValidation.error!
    } else {
      sanitizedData.externalUrl = externalUrlValidation.sanitizedValue
    }
  }

  // Validate internal URL (allow localhost)
  if (formData.internalUrl) {
    const internalUrlValidation = validateUrl(formData.internalUrl, true)
    if (!internalUrlValidation.isValid) {
      errors.internalUrl = internalUrlValidation.error!
    } else {
      sanitizedData.internalUrl = internalUrlValidation.sanitizedValue
    }
  }

  // Validate URL (for single URL mode)
  if (formData.url) {
    const urlValidation = validateUrl(formData.url, true)
    if (!urlValidation.isValid) {
      errors.url = urlValidation.error!
    } else {
      sanitizedData.url = urlValidation.sanitizedValue
    }
  }

  // Validate description
  if (formData.description) {
    const descValidation = validateText(formData.description, 1000, false, true)
    if (!descValidation.isValid) {
      errors.description = descValidation.error!
    } else {
      sanitizedData.description = descValidation.sanitizedValue
    }
  }

  // Validate tags
  if (formData.tags) {
    const tagsValidation = validateTags(formData.tags)
    if (!tagsValidation.isValid) {
      errors.tags = tagsValidation.error!
    } else {
      sanitizedData.tags = tagsValidation.sanitizedValue as string
    }
  }

  // Validate icon
  if (formData.icon) {
    const iconValidation = validateIcon(formData.icon)
    if (!iconValidation.isValid) {
      errors.icon = iconValidation.error!
    } else {
      sanitizedData.icon = iconValidation.sanitizedValue
    }
  }

  // Validate environment
  if (formData.environment) {
    const envValidation = validateEnvironment(formData.environment)
    if (!envValidation.isValid) {
      errors.environment = envValidation.error!
    } else {
      sanitizedData.environment = envValidation.sanitizedValue
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitizedData
  }
}

/**
 * Cache management utilities
 */
export const validationCacheUtils = {
  clear: () => validationCache.clear(),
  size: () => validationCache.size,
  // Clear expired entries
  cleanup: () => {
    const now = Date.now()
    for (const [key, cached] of validationCache.entries()) {
      if ((now - cached.timestamp) >= CACHE_EXPIRY) {
        validationCache.delete(key)
      }
    }
  }
}

// Periodic cache cleanup (every 5 minutes)
if (typeof window !== 'undefined') {
  setInterval(() => {
    validationCacheUtils.cleanup()
  }, 5 * 60 * 1000)
}