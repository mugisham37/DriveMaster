import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [],
  },
  esbuild: {
    target: 'es2022',
  },
  resolve: {
    alias: {
      '@drivemaster/shared-config': resolve(__dirname, '../../packages/shared-config/src'),
      '@drivemaster/redis-client': resolve(__dirname, '../../packages/redis-client/src'),
      '@drivemaster/kafka-client': resolve(__dirname, '../../packages/kafka-client/src'),
      '@drivemaster/es-client': resolve(__dirname, '../../packages/es-client/src'),
      '@drivemaster/telemetry': resolve(__dirname, '../../packages/telemetry/src'),
    },
  },
})
