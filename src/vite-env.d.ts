/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL — required. Example: https://xxxx.supabase.co */
  readonly VITE_SUPABASE_URL: string;
  /** Supabase anon (publishable) key — required. Never the service-role key. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
