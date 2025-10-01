import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000,
    hookTimeout: 60000,
    teardownTimeout: 15000,
    include: ['src/e2e-tests/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/**', 'src/**/*.d.ts', 'src/config/**', 'src/utils/test-helpers.ts'],
    },
    reporters: ['verbose'],
    outputFile: {
      json: './coverage/e2e-results.json',
      junit: './coverage/e2e-junit.xml',
    },
    // Run E2E tests sequentially to avoid conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
})
