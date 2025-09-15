// ABOUTME: Centralized environment configuration service
// ABOUTME: Manages all environment-specific settings and API endpoints

interface EnvironmentConfig {
  apiBaseUrl: string;
  mcpBaseUrl: string;
  wsBaseUrl: string;
  publicDomain: string;
  environment: 'development' | 'staging' | 'production';
  features: {
    authEnabled: boolean;
    discoveryEnabled: boolean;
    sharingEnabled: boolean;
    analyticsEnabled: boolean;
  };
}

class EnvironmentService {
  private config: EnvironmentConfig;

  constructor() {
    this.config = this.loadConfiguration();
  }

  private loadConfiguration(): EnvironmentConfig {
    // Load from environment variables (Vite exposes them as import.meta.env)
    const env = import.meta.env || {};

    // Determine environment with proper validation
    const validEnvironments = ['development', 'uat', 'production', 'staging'] as const;
    const envValue = env.VITE_APP_ENV || 'production';
    const environment: EnvironmentConfig['environment'] = validEnvironments.includes(envValue as any)
      ? envValue as EnvironmentConfig['environment']
      : 'production';
    const isDevelopment = environment === 'development';

    // Get base URLs from environment or use secure defaults
    const apiBaseUrl = env.VITE_API_BASE_URL ||
      (isDevelopment ? 'http://localhost:8889/api' : '/api');

    const mcpBaseUrl = env.VITE_MCP_BASE_URL ||
      (isDevelopment ? 'http://localhost:9900' : '/mcp');

    const wsBaseUrl = env.VITE_WS_BASE_URL ||
      (isDevelopment ? 'ws://localhost:8889' : `wss://${window.location.host}`);

    const publicDomain = env.VITE_PUBLIC_DOMAIN || window.location.host;

    return {
      apiBaseUrl,
      mcpBaseUrl,
      wsBaseUrl,
      publicDomain,
      environment,
      features: {
        authEnabled: env.VITE_AUTH_ENABLED !== 'false',
        discoveryEnabled: env.VITE_DISCOVERY_ENABLED !== 'false',
        sharingEnabled: env.VITE_SHARING_ENABLED !== 'false',
        analyticsEnabled: env.VITE_ANALYTICS_ENABLED !== 'false',
      }
    };
  }

  getApiBaseUrl(): string {
    return this.config.apiBaseUrl;
  }

  getMcpBaseUrl(): string {
    return this.config.mcpBaseUrl;
  }

  getWsBaseUrl(): string {
    return this.config.wsBaseUrl;
  }

  getPublicDomain(): string {
    return this.config.publicDomain;
  }

  getEnvironment(): string {
    return this.config.environment;
  }

  isProduction(): boolean {
    return this.config.environment === 'production';
  }

  isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  isFeatureEnabled(feature: keyof EnvironmentConfig['features']): boolean {
    return this.config.features[feature];
  }

  // Build full API endpoint URL
  buildApiUrl(endpoint: string): string {
    const base = this.getApiBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${cleanEndpoint}`;
  }

  // Build full MCP endpoint URL
  buildMcpUrl(endpoint: string): string {
    const base = this.getMcpBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${base}${cleanEndpoint}`;
  }

  // Get configuration for debugging (masks sensitive values)
  getDebugConfig(): Partial<EnvironmentConfig> {
    return {
      environment: this.config.environment,
      features: this.config.features,
      apiBaseUrl: this.maskUrl(this.config.apiBaseUrl),
      mcpBaseUrl: this.maskUrl(this.config.mcpBaseUrl),
    };
  }

  private maskUrl(url: string): string {
    if (url.includes('localhost') || url.startsWith('/')) {
      return url; // Development URLs are safe to show
    }
    // Mask production URLs
    const urlParts = url.split('.');
    if (urlParts.length > 2) {
      urlParts[0] = '***';
    }
    return urlParts.join('.');
  }
}

// Export singleton instance
export const environmentService = new EnvironmentService();

// Export helper functions for convenience
export const getApiUrl = (endpoint: string) => environmentService.buildApiUrl(endpoint);
export const getMcpUrl = (endpoint: string) => environmentService.buildMcpUrl(endpoint);
export const isProduction = () => environmentService.isProduction();
export const isDevelopment = () => environmentService.isDevelopment();