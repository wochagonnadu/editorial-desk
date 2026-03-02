// PATH: apps/web/src/vite-env.d.ts
// WHAT: Vite environment type declarations for frontend builds
// WHY:  Enables typed access to import.meta.env variables
// RELEVANT: apps/web/src/services/api/client.ts,apps/web/vite.config.ts

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
