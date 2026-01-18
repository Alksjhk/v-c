/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_DEFAULT_API_URL: string
  readonly VITE_API_TIMEOUT: string
  readonly VITE_NODE_ENV: string
  readonly VITE_ENABLE_LOGGING: string
  readonly VITE_ENABLE_DEBUG: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}