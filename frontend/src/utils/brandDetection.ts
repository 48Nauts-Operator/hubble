// ABOUTME: Brand detection and color extraction utilities for automatic logo and theme detection
// ABOUTME: Maps company names to their logos and brand colors for card customization

interface BrandInfo {
  name: string
  logo?: string
  primaryColor?: string
  secondaryColor?: string
  faviconUrl?: string
}

// Popular brand colors and logos
const BRAND_DATABASE: Record<string, BrandInfo> = {
  google: {
    name: 'Google',
    primaryColor: '#4285F4',
    secondaryColor: '#34A853',
    faviconUrl: 'https://www.google.com/favicon.ico'
  },
  cloudflare: {
    name: 'Cloudflare',
    primaryColor: '#F38020',
    secondaryColor: '#FAAD3F',
    faviconUrl: 'https://www.cloudflare.com/favicon.ico'
  },
  github: {
    name: 'GitHub',
    primaryColor: '#24292e',
    secondaryColor: '#0366d6',
    faviconUrl: 'https://github.com/favicon.ico'
  },
  microsoft: {
    name: 'Microsoft',
    primaryColor: '#0078D4',
    secondaryColor: '#40E0D0',
    faviconUrl: 'https://www.microsoft.com/favicon.ico'
  },
  aws: {
    name: 'AWS',
    primaryColor: '#FF9900',
    secondaryColor: '#232F3E',
    faviconUrl: 'https://aws.amazon.com/favicon.ico'
  },
  linkedin: {
    name: 'LinkedIn',
    primaryColor: '#0077B5',
    secondaryColor: '#00A0DC',
    faviconUrl: 'https://www.linkedin.com/favicon.ico'
  },
  twitter: {
    name: 'Twitter',
    primaryColor: '#1DA1F2',
    secondaryColor: '#14171A',
    faviconUrl: 'https://twitter.com/favicon.ico'
  },
  x: {
    name: 'X',
    primaryColor: '#000000',
    secondaryColor: '#1a1a1a',
    faviconUrl: 'https://x.com/favicon.ico'
  },
  facebook: {
    name: 'Facebook',
    primaryColor: '#1877F2',
    secondaryColor: '#42B883',
    faviconUrl: 'https://www.facebook.com/favicon.ico'
  },
  meta: {
    name: 'Meta',
    primaryColor: '#0084FF',
    secondaryColor: '#0064E0',
    faviconUrl: 'https://about.meta.com/favicon.ico'
  },
  youtube: {
    name: 'YouTube',
    primaryColor: '#FF0000',
    secondaryColor: '#282828',
    faviconUrl: 'https://www.youtube.com/favicon.ico'
  },
  netflix: {
    name: 'Netflix',
    primaryColor: '#E50914',
    secondaryColor: '#000000',
    faviconUrl: 'https://www.netflix.com/favicon.ico'
  },
  spotify: {
    name: 'Spotify',
    primaryColor: '#1ED760',
    secondaryColor: '#191414',
    faviconUrl: 'https://www.spotify.com/favicon.ico'
  },
  slack: {
    name: 'Slack',
    primaryColor: '#4A154B',
    secondaryColor: '#611F69',
    faviconUrl: 'https://slack.com/favicon.ico'
  },
  discord: {
    name: 'Discord',
    primaryColor: '#5865F2',
    secondaryColor: '#23272A',
    faviconUrl: 'https://discord.com/favicon.ico'
  },
  notion: {
    name: 'Notion',
    primaryColor: '#000000',
    secondaryColor: '#FFFFFF',
    faviconUrl: 'https://www.notion.so/favicon.ico'
  },
  vercel: {
    name: 'Vercel',
    primaryColor: '#000000',
    secondaryColor: '#FFFFFF',
    faviconUrl: 'https://vercel.com/favicon.ico'
  },
  stripe: {
    name: 'Stripe',
    primaryColor: '#635BFF',
    secondaryColor: '#00D4FF',
    faviconUrl: 'https://stripe.com/favicon.ico'
  },
  openai: {
    name: 'OpenAI',
    primaryColor: '#412991',
    secondaryColor: '#10A37F',
    faviconUrl: 'https://openai.com/favicon.ico'
  },
  anthropic: {
    name: 'Anthropic',
    primaryColor: '#D4A373',
    secondaryColor: '#1A1A1A',
    faviconUrl: 'https://www.anthropic.com/favicon.ico'
  },
  docker: {
    name: 'Docker',
    primaryColor: '#2496ED',
    secondaryColor: '#0DB7ED',
    faviconUrl: 'https://www.docker.com/favicon.ico'
  },
  gitlab: {
    name: 'GitLab',
    primaryColor: '#FC6D26',
    secondaryColor: '#E24329',
    faviconUrl: 'https://gitlab.com/favicon.ico'
  },
  atlassian: {
    name: 'Atlassian',
    primaryColor: '#0052CC',
    secondaryColor: '#2684FF',
    faviconUrl: 'https://www.atlassian.com/favicon.ico'
  },
  jira: {
    name: 'Jira',
    primaryColor: '#0052CC',
    secondaryColor: '#2684FF',
    faviconUrl: 'https://www.atlassian.com/favicon.ico'
  },
  linear: {
    name: 'Linear',
    primaryColor: '#5E6AD2',
    secondaryColor: '#4752C4',
    faviconUrl: 'https://linear.app/favicon.ico'
  },
  figma: {
    name: 'Figma',
    primaryColor: '#F24E1E',
    secondaryColor: '#A259FF',
    faviconUrl: 'https://www.figma.com/favicon.ico'
  },
  adobe: {
    name: 'Adobe',
    primaryColor: '#FF0000',
    secondaryColor: '#000000',
    faviconUrl: 'https://www.adobe.com/favicon.ico'
  },
  dropbox: {
    name: 'Dropbox',
    primaryColor: '#0061FF',
    secondaryColor: '#0051E0',
    faviconUrl: 'https://www.dropbox.com/favicon.ico'
  },
  zoom: {
    name: 'Zoom',
    primaryColor: '#2D8CFF',
    secondaryColor: '#0B5CFF',
    faviconUrl: 'https://zoom.us/favicon.ico'
  }
}

export function detectBrandFromUrl(url: string): BrandInfo | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    
    // Check each brand to see if it matches the hostname
    for (const [key, brand] of Object.entries(BRAND_DATABASE)) {
      if (hostname.includes(key)) {
        return brand
      }
    }
    
    // Special cases for domains that don't match the key
    if (hostname.includes('x.com') || hostname.includes('twitter.com')) {
      return BRAND_DATABASE.x
    }
    if (hostname.includes('meta.com') || hostname.includes('facebook.com')) {
      return BRAND_DATABASE.meta
    }
    if (hostname.includes('openai.com') || hostname.includes('chatgpt.com')) {
      return BRAND_DATABASE.openai
    }
    
    return null
  } catch {
    return null
  }
}

export function detectBrandFromTitle(title: string): BrandInfo | null {
  const lowerTitle = title.toLowerCase()
  
  for (const [key, brand] of Object.entries(BRAND_DATABASE)) {
    if (lowerTitle.includes(key) || lowerTitle.includes(brand.name.toLowerCase())) {
      return brand
    }
  }
  
  return null
}

export function getBrandColors(url: string, title: string): { primary?: string; secondary?: string } {
  const brandFromUrl = detectBrandFromUrl(url)
  const brandFromTitle = brandFromUrl || detectBrandFromTitle(title)
  
  if (brandFromTitle) {
    return {
      primary: brandFromTitle.primaryColor,
      secondary: brandFromTitle.secondaryColor
    }
  }
  
  return {}
}

export function getEnhancedFaviconUrl(url: string, title: string): string | null {
  const brand = detectBrandFromUrl(url) || detectBrandFromTitle(title)

  if (brand?.faviconUrl) {
    return brand.faviconUrl
  }

  // Use our secure server-side favicon proxy to prevent SSRF attacks
  try {
    const domain = new URL(url).hostname
    // This will be proxied through our backend with proper validation
    return `/api/favicon?domain=${encodeURIComponent(domain)}`
  } catch {
    return null
  }
}

// Get a subtle gradient based on brand colors
export function getBrandGradient(url: string, title: string, isDark: boolean): string {
  const colors = getBrandColors(url, title)
  
  if (colors.primary) {
    const opacity = isDark ? '20' : '15'
    return `linear-gradient(135deg, ${colors.primary}${opacity} 0%, transparent 100%)`
  }
  
  return ''
}