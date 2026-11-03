/** package.json's version, injected by Vite (see `define` in vite.config.ts). */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** `pd` builds ship the public-domain riffs only. */
  readonly VITE_RIFFS?: string;
}
