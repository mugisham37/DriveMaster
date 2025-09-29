import { describe, it, expect } from '@jest/globals'

// Mock environment variables for testing
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret'
process.env.REDIS_HOST = 'localhost'
process.env.REDIS_PORT = '6379'
process.env.DB_HOST = 'localhost'
process.env.DB_PORT = '5432'
process.env.DB_NAME = 'drivemaster_test'
process.env.DB_USER = 'test_user'
process.env.DB_PASSWORD = 'test_password'

// Simple test to satisfy Jest requirement
describe('Test Setup', () => {
  it('should have test environment configured', () => {
    expect(process.env.NODE_ENV).toBe('test')
  })
})
