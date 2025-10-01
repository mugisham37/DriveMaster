/**
 * Test Helper Utilities
 * Common utilities for integration and e2e tests
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { TEST_CONFIG } from '../config/test-config'

export class TestClient {
  private client: AxiosInstance
  private authToken?: string

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: TEST_CONFIG.timeouts.default,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error(
          `API Error: ${error.response?.status} - ${error.response?.data?.message || error.message}`,
        )
        return Promise.reject(error)
      },
    )
  }

  async authenticate(email: string, password: string): Promise<string> {
    const response = await this.client.post('/auth/login', { email, password })
    this.authToken = response.data.token
    this.client.defaults.headers.common['Authorization'] = `Bearer ${this.authToken}`
    return this.authToken
  }

  async get(url: string): Promise<AxiosResponse> {
    return this.client.get(url)
  }

  async post(url: string, data?: any): Promise<AxiosResponse> {
    return this.client.post(url, data)
  }

  async put(url: string, data?: any): Promise<AxiosResponse> {
    return this.client.put(url, data)
  }

  async delete(url: string): Promise<AxiosResponse> {
    return this.client.delete(url)
  }

  setAuthToken(token: string): void {
    this.authToken = token
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  clearAuth(): void {
    this.authToken = undefined
    delete this.client.defaults.headers.common['Authorization']
  }
}

export class PerformanceMonitor {
  private startTime: number = 0
  private metrics: Array<{ operation: string; duration: number; timestamp: number }> = []

  start(): void {
    this.startTime = Date.now()
  }

  end(operation: string): number {
    const duration = Date.now() - this.startTime
    this.metrics.push({
      operation,
      duration,
      timestamp: Date.now(),
    })
    return duration
  }

  getMetrics() {
    return this.metrics
  }

  getAverageResponseTime(): number {
    if (this.metrics.length === 0) return 0
    const total = this.metrics.reduce((sum, metric) => sum + metric.duration, 0)
    return total / this.metrics.length
  }

  getP95ResponseTime(): number {
    if (this.metrics.length === 0) return 0
    const sorted = this.metrics.map((m) => m.duration).sort((a, b) => a - b)
    const index = Math.ceil(sorted.length * 0.95) - 1
    return sorted[index]
  }

  reset(): void {
    this.metrics = []
  }
}

export async function waitForService(url: string, maxAttempts: number = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await axios.get(`${url}/health`, { timeout: 2000 })
      return true
    } catch (error) {
      console.log(`Waiting for service at ${url}... (attempt ${i + 1}/${maxAttempts})`)
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }
  return false
}

export async function waitForAllServices(): Promise<boolean> {
  const services = Object.values(TEST_CONFIG.services)
  const results = await Promise.all(services.map((url) => waitForService(url)))
  return results.every((result) => result)
}

export function generateTestUser(suffix: string = '') {
  const timestamp = Date.now()
  return {
    email: `test-${timestamp}${suffix}@drivemaster.com`,
    password: 'TestPassword123!',
    firstName: `Test${suffix}`,
    lastName: `User${timestamp}`,
  }
}

export function generateTestContent() {
  const timestamp = Date.now()
  return {
    title: `Test Content ${timestamp}`,
    description: `Test description for content ${timestamp}`,
    type: 'question',
    difficulty: 'medium',
    category: 'traffic-signs',
    content: {
      question: `What does this traffic sign mean? (Test ${timestamp})`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 0,
      explanation: 'This is a test explanation.',
    },
  }
}

export async function cleanupTestData(client: TestClient): Promise<void> {
  try {
    // Clean up test users, content, etc.
    // Implementation depends on your cleanup endpoints
    await client.delete('/test/cleanup')
  } catch (error) {
    console.warn('Cleanup failed:', error)
  }
}
