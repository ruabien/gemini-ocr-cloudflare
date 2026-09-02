/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  /**
   * LEXOCR benchmark telemetry gate (client). Build-time flag.
   * Default OFF. No query/header/user-controllable enablement.
   */
  readonly VITE_LEXOCR_BENCH_TELEMETRY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
