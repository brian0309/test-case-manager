/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MODE: string;
  readonly VITE_API_URL?: string;
  readonly VITE_DEV_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
