import { beforeAll, afterAll, vi } from 'vitest'

// Mock environment variables
beforeAll(() => {
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db'
  process.env.JWT_SECRET = 'test_secret'
  process.env.ELASTICSEARCH_URL = 'http://localhost:9200'
})

afterAll(() => {
  vi.clearAllMocks()
})

// Global test utilities
global.createMockUser = (overrides = {}) => ({
  userId: 'user-123',
  email: 'test@example.com',
  role: 'USER',
  ...overrides,
})

global.createMockAdmin = (overrides = {}) => ({
  userId: 'admin-123',
  email: 'admin@example.com',
  role: 'ADMIN',
  ...overrides,
})
