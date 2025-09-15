/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_MCP_BASE_URL: string
  readonly VITE_APP_ENV: string
  readonly VITE_APP_VERSION: string
  readonly VITE_WS_URL: string
  readonly VITE_CORS_ORIGINS: string
  // Add more env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}