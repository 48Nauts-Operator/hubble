// ABOUTME: Text sanitization utilities for preventing XSS attacks
// ABOUTME: Uses DOMPurify to clean user-generated content

import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks while preserving safe formatting
 * @param dirty - The potentially unsafe HTML string
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  // Configure DOMPurify to be strict but allow basic formatting
  const clean = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    RETURN_DOM_FRAGMENT: false,
  });

  return clean;
}

/**
 * Sanitizes plain text content by escaping HTML entities
 * Use this for text that should never contain HTML
 * @param text - The potentially unsafe text string
 * @returns Escaped text safe for rendering
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Strips all HTML tags from content, leaving only plain text
 * @param html - The HTML string to strip
 * @returns Plain text without any HTML tags
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Use DOMPurify to strip all tags
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });

  return clean.trim();
}

/**
 * React component wrapper for safely rendering sanitized HTML
 * Only use this if you need to render basic HTML formatting
 */
export function createSafeHtmlProps(content: string) {
  return {
    dangerouslySetInnerHTML: {
      __html: sanitizeHtml(content)
    }
  };
}