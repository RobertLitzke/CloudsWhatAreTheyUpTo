/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module 'virtual:courses' {
  const courses: import('../registry').CatalogEntry[];
  export default courses;
}
