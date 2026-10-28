import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Didactics ships TypeScript source, so Vitest compiles it too rather
    // than handing it to Node as a dependency.
    server: { deps: { inline: ['didactics'] } },
  },
});
