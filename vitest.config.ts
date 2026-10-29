import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Didactics ships TypeScript source, so vitest compiles it with ours.
    server: { deps: { inline: ['didactics'] } },
  },
});
