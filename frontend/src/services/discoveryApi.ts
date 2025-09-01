// ABOUTME: API client for Docker discovery service
// ABOUTME: Handles scanning, preview, and importing of discovered containers

// Note: ApiResponse type will be defined inline

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Use the same URL pattern as the main API service
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:8889'
  : '';

export interface DiscoveredService {
  id: string;
  name: string;
  image: string;
  status: string;
  created: Date;
  labels: Record<string, string>;
  environment: Record<string, string>;
  ports: Array<{
    container: string;
    host: string;
    ip: string;
  }>;
  urls: string[];
  detected_type: string;
  suggested_group: string;
  has_reverse_proxy?: boolean;
  bookmark_data: {
    title: string;
    url: string;
    internalUrl?: string;
    description: string;
    icon: string;
    tags: string[];
    environment: string;
    container_id: string;
    container_name: string;
    auto_discovered: boolean;
    discovered_at: string;
  };
}

export interface DiscoveryStatus {
  success: boolean;
  docker_available: boolean;
  containers_running: number;
  containers_total: number;
  last_scan: string | null;
  error?: string;
}

export interface ScanResult {
  success: boolean;
  count: number;
  services: DiscoveredService[];
  timestamp: string;
  error?: string;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  details: {
    imported: Array<{
      service_id: string;
      bookmark_id: string;
      title: string;
      url: string;
    }>;
    failed: Array<{
      service_id: string;
      name: string;
      error: string;
    }>;
  };
}

export interface PreviewResult {
  success: boolean;
  preview: Array<{
    service_id: string;
    bookmark_title: string;
    bookmark_url: string;
    group_name: string;
    service_type: string;
    environment: string;
    already_exists: boolean;
  }>;
}

class DiscoveryApi {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE}/api/discovery`;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error(`Discovery API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Get discovery service status
  async getStatus(): Promise<DiscoveryStatus> {
    return this.request<DiscoveryStatus>('/status');
  }

  // Scan for Docker containers
  async scanContainers(): Promise<ScanResult> {
    return this.request<ScanResult>('/scan');
  }

  // Preview what would be imported
  async previewImport(services: DiscoveredService[]): Promise<PreviewResult> {
    return this.request<PreviewResult>('/preview', {
      method: 'POST',
      body: JSON.stringify({ services }),
    });
  }

  // Import selected services as bookmarks
  async importServices(services: DiscoveredService[]): Promise<ImportResult> {
    return this.request<ImportResult>('/import', {
      method: 'POST',
      body: JSON.stringify({ services }),
    });
  }

  // Start monitoring Docker events
  async startMonitoring(): Promise<ApiResponse> {
    return this.request<ApiResponse>('/monitor/start', {
      method: 'POST',
    });
  }
}

export const discoveryApi = new DiscoveryApi();