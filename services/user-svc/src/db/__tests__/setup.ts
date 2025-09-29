// Jest setup file for database tests
import { jest } from '@jest/globals'

// Extend Jest matchers if needed
declare global {
  namespace jest {
    interface Matchers<R> {
      // Add custom matchers here if needed
    }
  }
}

// Set test timeout
jest.setTimeout(30000)
