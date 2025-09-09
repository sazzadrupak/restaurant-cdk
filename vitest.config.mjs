import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['./tests/steps/init.mjs'],
    environment: 'node',
    include: ['**/*.test.mjs'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
