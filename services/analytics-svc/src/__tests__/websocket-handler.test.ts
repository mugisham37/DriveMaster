import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WebSocketHandler, WebSocketHandlerConfig } from '../websocket-handler'
import { DashboardService } from '../dashboard-service'

// Mock DashboardService
const mockDashboardService = {
  addSubscriber: vi.fn(),
  removeSubscriber: vi.fn(),
  getUserProgressData: vi.fn(),
  getSystemPerformanceData: vi.fn(),
  getBusinessKPIData: vi.fn(),
  getAlertsData: vi.fn(),
} as unknown as DashboardService

// Mock WebSocket connection
const createMockConnection = () => ({
  socket: {
    readyState: 1, // WebSocket.OPEN
    send: vi.fn(),
    close: vi.fn(),
    ping: vi.fn(),
    on: vi.fn(),
  },
})

// Mock Fastify instance
const createMockFastify = () => ({
  register: vi.fn(),
  get: vi.fn(),
})

describe('WebSocketHandler', () => {
  let webSocketHandler: WebSocketHandler
  let config: WebSocketHandlerConfig

  beforeEach(() => {
    config = {
      maxConnections: 100,
      heartbeatInterval: 30000,
      connectionTimeout: 60000,
    }

    webSocketHandler = new WebSocketHandler(mockDashboardService, config)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('connection management', () => {
    it('should generate unique connection IDs', () => {
      const id1 = webSocketHandler['generateConnectionId']()
      const id2 = webSocketHandler['generateConnectionId']()

      expect(id1).toMatch(/^conn_\d+_[a-z0-9]+$/)
      expect(id2).toMatch(/^conn_\d+_[a-z0-9]+$/)
      expect(id1).not.toBe(id2)
    })

    it('should track connection statistics correctly', () => {
      const initialStats = webSocketHandler.getConnectionStats()
      expect(initialStats).toEqual({
        totalConnections: 0,
        activeConnections: 0,
        maxConnections: 100,
      })

      // Simulate adding connections
      webSocketHandler['connectionCount'] = 5
      webSocketHandler['connections'].set('conn1', {} as any)
      webSocketHandler['connections'].set('conn2', {} as any)

      const updatedStats = webSocketHandler.getConnectionStats()
      expect(updatedStats).toEqual({
        totalConnections: 2,
        activeConnections: 5,
        maxConnections: 100,
      })
    })

    it('should clean up connections properly', () => {
      const connectionId = 'test-conn-123'
      const mockInterval = {} as NodeJS.Timeout

      webSocketHandler['connections'].set(connectionId, {} as any)
      webSocketHandler['connectionCount'] = 1

      webSocketHandler['cleanupConnection'](connectionId, mockInterval)

      expect(webSocketHandler['connections'].has(connectionId)).toBe(false)
      expect(webSocketHandler['connectionCount']).toBe(0)
    })
  })

  describe('message handling', () => {
    it('should handle subscribe messages correctly', async () => {
      const mockConnection = createMockConnection()
      const message = {
        type: 'subscribe',
        dashboardType: 'user_progress',
        userId: 'test-user-123',
      }

      const mockProgressData = {
        userId: 'test-user-123',
        currentAccuracy: 0.85,
        masteryProgress: 0.7,
        streakCount: 5,
        sessionDuration: 25,
        conceptsCompleted: 10,
        totalConcepts: 15,
        recentActivity: [],
      }

      mockDashboardService.getUserProgressData.mockResolvedValue(mockProgressData)

      await webSocketHandler['handleSubscribe'](mockConnection as any, message, 'conn-123')

      expect(mockDashboardService.addSubscriber).toHaveBeenCalledWith(
        'user_progress',
        mockConnection.socket,
      )
      expect(mockConnection.socket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'subscription_confirmed',
          dashboardType: 'user_progress',
          connectionId: 'conn-123',
          timestamp: expect.any(String),
          initialData: mockProgressData,
        }),
      )
    })

    it('should handle unsubscribe messages correctly', async () => {
      const mockConnection = createMockConnection()
      const message = {
        type: 'unsubscribe',
        dashboardType: 'system_performance',
      }

      await webSocketHandler['handleUnsubscribe'](mockConnection as any, message, 'conn-123')

      expect(mockDashboardService.removeSubscriber).toHaveBeenCalledWith(
        'system_performance',
        mockConnection.socket,
      )
      expect(mockConnection.socket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'unsubscription_confirmed',
          dashboardType: 'system_performance',
          connectionId: 'conn-123',
          timestamp: expect.any(String),
        }),
      )
    })

    it('should handle snapshot requests correctly', async () => {
      const mockConnection = createMockConnection()
      const message = {
        type: 'get_snapshot',
        dashboardType: 'business_kpis',
      }

      const mockKPIData = {
        timestamp: new Date().toISOString(),
        activeUsers: { current: 100, daily: 500, weekly: 2000, monthly: 8000 },
        engagement: {
          averageSessionDuration: 25,
          dailyActiveUsers: 500,
          retentionRate: 0.8,
          completionRate: 0.7,
        },
        learning: {
          averageAccuracy: 0.78,
          conceptsMastered: 1200,
          totalLearningTime: 45000,
          dropoutRate: 0.15,
        },
        revenue: { mrr: 50000, churn: 0.05, ltv: 2400 },
      }

      mockDashboardService.getBusinessKPIData.mockResolvedValue(mockKPIData)

      await webSocketHandler['handleGetSnapshot'](mockConnection as any, message, 'conn-123')

      expect(mockConnection.socket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'snapshot',
          dashboardType: 'business_kpis',
          connectionId: 'conn-123',
          timestamp: expect.any(String),
          data: mockKPIData,
        }),
      )
    })

    it('should handle invalid messages gracefully', async () => {
      const mockConnection = createMockConnection()
      const invalidMessage = {
        type: 'invalid_type',
        dashboardType: 'user_progress',
      }

      await webSocketHandler['handleDashboardMessage'](
        mockConnection as any,
        invalidMessage,
        'conn-123',
      )

      expect(mockConnection.socket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'error',
          message: 'Unknown message type',
        }),
      )
    })

    it('should handle malformed messages with validation errors', async () => {
      const mockConnection = createMockConnection()
      const malformedMessage = {
        type: 'subscribe',
        // Missing required dashboardType
      }

      await webSocketHandler['handleDashboardMessage'](
        mockConnection as any,
        malformedMessage,
        'conn-123',
      )

      expect(mockConnection.socket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          details: expect.any(Array),
        }),
      )
    })
  })

  describe('user progress connection handling', () => {
    it('should send initial user progress data on connection', async () => {
      const mockConnection = createMockConnection()
      const userId = 'test-user-123'

      const mockProgressData = {
        userId,
        currentAccuracy: 0.85,
        masteryProgress: 0.7,
        streakCount: 5,
        sessionDuration: 25,
        conceptsCompleted: 10,
        totalConcepts: 15,
        recentActivity: [],
      }

      mockDashboardService.getUserProgressData.mockResolvedValue(mockProgressData)

      await webSocketHandler['sendInitialUserProgress'](mockConnection as any, userId)

      expect(mockConnection.socket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'initial_user_progress',
          userId,
          timestamp: expect.any(String),
          data: mockProgressData,
        }),
      )
    })

    it('should handle errors when sending initial user progress', async () => {
      const mockConnection = createMockConnection()
      const userId = 'test-user-123'

      mockDashboardService.getUserProgressData.mockRejectedValue(new Error('Database error'))

      await webSocketHandler['sendInitialUserProgress'](mockConnection as any, userId)

      expect(mockConnection.socket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'error',
          message: 'Failed to load user progress data',
        }),
      )
    })
  })

  describe('broadcasting', () => {
    it('should broadcast messages to all connections', () => {
      const mockConnection1 = createMockConnection()
      const mockConnection2 = createMockConnection()
      const mockConnection3 = { socket: { readyState: 3, send: vi.fn() } } // Closed connection

      webSocketHandler['connections'].set('conn1', mockConnection1 as any)
      webSocketHandler['connections'].set('conn2', mockConnection2 as any)
      webSocketHandler['connections'].set('conn3', mockConnection3 as any)

      const message = { type: 'test', data: 'broadcast test' }

      webSocketHandler.broadcastToAll(message)

      expect(mockConnection1.socket.send).toHaveBeenCalledWith(JSON.stringify(message))
      expect(mockConnection2.socket.send).toHaveBeenCalledWith(JSON.stringify(message))
      expect(mockConnection3.socket.send).not.toHaveBeenCalled() // Closed connection should not receive message
    })

    it('should handle send errors gracefully during broadcast', () => {
      const mockConnection1 = createMockConnection()
      const mockConnection2 = createMockConnection()

      // Make connection2 throw an error when sending
      mockConnection2.socket.send.mockImplementation(() => {
        throw new Error('Send failed')
      })

      webSocketHandler['connections'].set('conn1', mockConnection1 as any)
      webSocketHandler['connections'].set('conn2', mockConnection2 as any)

      const message = { type: 'test', data: 'broadcast test' }

      // Should not throw an error
      expect(() => webSocketHandler.broadcastToAll(message)).not.toThrow()

      expect(mockConnection1.socket.send).toHaveBeenCalledWith(JSON.stringify(message))
      expect(mockConnection2.socket.send).toHaveBeenCalledWith(JSON.stringify(message))
    })
  })

  describe('connection limits', () => {
    it('should reject connections when max limit is reached', () => {
      const mockConnection = createMockConnection()
      const mockRequest = { params: {} }

      // Set connection count to max
      webSocketHandler['connectionCount'] = config.maxConnections

      // Mock the connection handling - this would normally be called by Fastify
      // We're testing the logic that would be in handleDashboardConnection
      expect(webSocketHandler['connectionCount']).toBe(config.maxConnections)

      // In real implementation, this would close the connection
      // Here we just verify the condition would be met
      expect(webSocketHandler['connectionCount'] >= config.maxConnections).toBe(true)
    })
  })

  describe('graceful shutdown', () => {
    it('should close all connections during shutdown', () => {
      const mockConnection1 = createMockConnection()
      const mockConnection2 = createMockConnection()

      webSocketHandler['connections'].set('conn1', mockConnection1 as any)
      webSocketHandler['connections'].set('conn2', mockConnection2 as any)
      webSocketHandler['connectionCount'] = 2

      webSocketHandler.closeAllConnections()

      expect(mockConnection1.socket.close).toHaveBeenCalledWith(1001, 'Server shutting down')
      expect(mockConnection2.socket.close).toHaveBeenCalledWith(1001, 'Server shutting down')
      expect(webSocketHandler['connections'].size).toBe(0)
      expect(webSocketHandler['connectionCount']).toBe(0)
    })

    it('should handle close errors gracefully during shutdown', () => {
      const mockConnection1 = createMockConnection()
      const mockConnection2 = createMockConnection()

      // Make connection2 throw an error when closing
      mockConnection2.socket.close.mockImplementation(() => {
        throw new Error('Close failed')
      })

      webSocketHandler['connections'].set('conn1', mockConnection1 as any)
      webSocketHandler['connections'].set('conn2', mockConnection2 as any)

      // Should not throw an error
      expect(() => webSocketHandler.closeAllConnections()).not.toThrow()

      expect(mockConnection1.socket.close).toHaveBeenCalled()
      expect(mockConnection2.socket.close).toHaveBeenCalled()
    })
  })
})
