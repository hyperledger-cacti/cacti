/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_KEY: string
  readonly VITE_SUPABASE_SCHEMA: string
  readonly VITE_SATP_GATEWAY_URL?: string
  readonly VITE_SATP_PROMETHEUS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
