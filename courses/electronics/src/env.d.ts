/** package.json's version, injected by Vite (see `define` in vite.config.ts). */
declare const __APP_VERSION__: string;

/** The words written in Circuitry's code, scanned by Didactics' build (didactics/vite). */
declare module 'virtual:didactics/code-text' {
  const code: import('didactics/code-text').CodeText;
  export default code;
}
