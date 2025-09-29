import { FastifyInstance } from 'fastify'
import { SocketStream } from '@fastify/websocket'
import { DashboardService, DashboardMessageSchema } from './dashboard-service'
import { z } from 'zod'

export interface WebSocketHandlerConfig {
  maxConnections: number
  heartbeatInterval: number
  connectionTimeout: number
}

export class WebSocketHandler {
  private dashboardService: DashboardService
  private config: WebSocketHandlerConfig
  private connections: Map<string, SocketStream> = new Map()
  private connectionCount = 0

  constructor(dashboardService: DashboardService, config: WebSocketHandlerConfig) {
    this.dashboardService = dashboardService
    this.config = config
  }

  // Register WebSocket routes with Fastify
  registerRoutes(fastify: FastifyInstance): void {
    const self = this

    // Dashboard WebSocket endpoint
    fastify.register(async function (fastify) {
      fastify.get('/ws/dashboard', { websocket: true }, (connection, req) => {
        self.handleDashboardConnection(connection, req)
      })

      // User-specific progress WebSocket
      fastify.get('/ws/user/:userId/progress', { websocket: true }, (connection, req) => {
        self.handleUserProgressConnection(connection, req)
      })
    })
  }

  // Handle dashboard WebSocket connections
  private handleDashboardConnection(connection: SocketStream, request: any): void {
    const connectionId = this.generateConnectionId()

    // Check connection limits
    if (this.connectionCount >= this.config.maxConnections) {
      connection.socket.close(1013, 'Server overloaded')
      return
    }

    this.connections.set(connectionId, connection)
    this.connectionCount++

    console.log(`Dashboard WebSocket connected: ${connectionId}`)

    // Set up heartbeat
    const heartbeatInterval = setInterval(() => {
      if (connection.socket.readyState === 1) {
        // WebSocket.OPEN
        connection.socket.ping()
      } else {
        this.cleanupConnection(connectionId, heartbeatInterval)
      }
    }, this.config.heartbeatInterval)

    // Handle incoming messages
    connection.socket.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString())
        await this.handleDashboardMessage(connection, data, connectionId)
      } catch (error) {
        console.error('Invalid WebSocket message:', error)
        connection.socket.send(
          JSON.stringify({
            type: 'error',
            message: 'Invalid message format',
          }),
        )
      }
    })

    // Handle connection close
    connection.socket.on('close', () => {
      this.cleanupConnection(connectionId, heartbeatInterval)
    })

    // Handle connection errors
    connection.socket.on('error', (error) => {
      console.error(`WebSocket error for ${connectionId}:`, error)
      this.cleanupConnection(connectionId, heartbeatInterval)
    })

    // Send initial connection confirmation
    connection.socket.send(
      JSON.stringify({
        type: 'connection_established',
        connectionId,
        timestamp: new Date().toISOString(),
      }),
    )
  }

  // Handle user progress WebSocket connections
  private handleUserProgressConnection(connection: SocketStream, request: any): void {
    const connectionId = this.generateConnectionId()
    const userId = (request.params as any).userId

    if (!userId) {
      connection.socket.close(1008, 'User ID required')
      return
    }

    this.connections.set(connectionId, connection)
    this.connectionCount++

    console.log(`User progress WebSocket connected: ${connectionId} for user ${userId}`)

    // Set up heartbeat
    const heartbeatInterval = setInterval(() => {
      if (connection.socket.readyState === 1) {
        connection.socket.ping()
      } else {
        this.cleanupConnection(connectionId, heartbeatInterval)
      }
    }, this.config.heartbeatInterval)

    // Subscribe to user progress updates
    this.dashboardService.addSubscriber('user_progress', connection.socket)

    // Send initial user progress data
    void this.sendInitialUserProgress(connection, userId)

    // Set up periodic user progress updates
    const progressUpdateInterval = setInterval(async () => {
      if (connection.socket.readyState === 1) {
        try {
          const progressData = await this.dashboardService.getUserProgressData(userId)
          connection.socket.send(
            JSON.stringify({
              type: 'user_progress_update',
              userId,
              timestamp: new Date().toISOString(),
              data: progressData,
            }),
          )
        } catch (error) {
          console.error(`Failed to send user progress update for ${userId}:`, error)
        }
      }
    }, 30000) // Update every 30 seconds

    // Handle connection close
    connection.socket.on('close', () => {
      clearInterval(progressUpdateInterval)
      this.dashboardService.removeSubscriber('user_progress', connection.socket)
      this.cleanupConnection(connectionId, heartbeatInterval)
    })

    // Handle connection errors
    connection.socket.on('error', (error) => {
      console.error(`User progress WebSocket error for ${connectionId}:`, error)
      clearInterval(progressUpdateInterval)
      this.dashboardService.removeSubscriber('user_progress', connection.socket)
      this.cleanupConnection(connectionId, heartbeatInterval)
    })
  }

  // Handle dashboard messages
  private async handleDashboardMessage(
    connection: SocketStream,
    message: any,
    connectionId: string,
  ): Promise<void> {
    try {
      const validatedMessage = DashboardMessageSchema.parse(message)

      switch (validatedMessage.type) {
        case 'subscribe':
          await this.handleSubscribe(connection, validatedMessage, connectionId)
          break

        case 'unsubscribe':
          await this.handleUnsubscribe(connection, validatedMessage, connectionId)
          break

        case 'get_snapshot':
          await this.handleGetSnapshot(connection, validatedMessage, connectionId)
          break

        default:
          connection.socket.send(
            JSON.stringify({
              type: 'error',
              message: 'Unknown message type',
            }),
          )
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        connection.socket.send(
          JSON.stringify({
            type: 'error',
            message: 'Invalid message format',
            details: error.errors,
          }),
        )
      } else {
        console.error('Error handling dashboard message:', error)
        connection.socket.send(
          JSON.stringify({
            type: 'error',
            message: 'Internal server error',
          }),
        )
      }
    }
  }

  // Handle subscription requests
  private async handleSubscribe(
    connection: SocketStream,
    message: any,
    connectionId: string,
  ): Promise<void> {
    const { dashboardType, filters, userId } = message

    // Add subscriber to dashboard service
    this.dashboardService.addSubscriber(dashboardType, connection.socket)

    // Send initial data based on dashboard type
    let initialData: any

    switch (dashboardType) {
      case 'user_progress':
        if (!userId) {
          connection.socket.send(
            JSON.stringify({
              type: 'error',
              message: 'User ID required for user progress dashboard',
            }),
          )
          return
        }
        initialData = await this.dashboardService.getUserProgressData(userId)
        break

      case 'system_performance':
        initialData = await this.dashboardService.getSystemPerformanceData()
        break

      case 'business_kpis':
        initialData = await this.dashboardService.getBusinessKPIData()
        break

      case 'alerts':
        initialData = await this.dashboardService.getAlertsData()
        break

      default:
        connection.socket.send(
          JSON.stringify({
            type: 'error',
            message: 'Unknown dashboard type',
          }),
        )
        return
    }

    // Send subscription confirmation with initial data
    connection.socket.send(
      JSON.stringify({
        type: 'subscription_confirmed',
        dashboardType,
        connectionId,
        timestamp: new Date().toISOString(),
        initialData,
      }),
    )

    console.log(`Connection ${connectionId} subscribed to ${dashboardType}`)
  }

  // Handle unsubscription requests
  private async handleUnsubscribe(
    connection: SocketStream,
    message: any,
    connectionId: string,
  ): Promise<void> {
    const { dashboardType } = message

    // Remove subscriber from dashboard service
    this.dashboardService.removeSubscriber(dashboardType, connection.socket)

    // Send unsubscription confirmation
    connection.socket.send(
      JSON.stringify({
        type: 'unsubscription_confirmed',
        dashboardType,
        connectionId,
        timestamp: new Date().toISOString(),
      }),
    )

    console.log(`Connection ${connectionId} unsubscribed from ${dashboardType}`)
  }

  // Handle snapshot requests
  private async handleGetSnapshot(
    connection: SocketStream,
    message: any,
    connectionId: string,
  ): Promise<void> {
    const { dashboardType, filters, userId } = message

    let snapshotData: any

    try {
      switch (dashboardType) {
        case 'user_progress':
          if (!userId) {
            throw new Error('User ID required for user progress snapshot')
          }
          snapshotData = await this.dashboardService.getUserProgressData(userId)
          break

        case 'system_performance':
          snapshotData = await this.dashboardService.getSystemPerformanceData()
          break

        case 'business_kpis':
          snapshotData = await this.dashboardService.getBusinessKPIData()
          break

        case 'alerts':
          snapshotData = await this.dashboardService.getAlertsData()
          break

        default:
          throw new Error('Unknown dashboard type')
      }

      // Send snapshot data
      connection.socket.send(
        JSON.stringify({
          type: 'snapshot',
          dashboardType,
          connectionId,
          timestamp: new Date().toISOString(),
          data: snapshotData,
        }),
      )
    } catch (error) {
      connection.socket.send(
        JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to get snapshot',
        }),
      )
    }
  }

  // Send initial user progress data
  private async sendInitialUserProgress(connection: SocketStream, userId: string): Promise<void> {
    try {
      const progressData = await this.dashboardService.getUserProgressData(userId)
      connection.socket.send(
        JSON.stringify({
          type: 'initial_user_progress',
          userId,
          timestamp: new Date().toISOString(),
          data: progressData,
        }),
      )
    } catch (error) {
      console.error(`Failed to send initial user progress for ${userId}:`, error)
      connection.socket.send(
        JSON.stringify({
          type: 'error',
          message: 'Failed to load user progress data',
        }),
      )
    }
  }

  // Generate unique connection ID
  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Clean up connection
  private cleanupConnection(connectionId: string, heartbeatInterval: NodeJS.Timeout): void {
    clearInterval(heartbeatInterval)
    this.connections.delete(connectionId)
    this.connectionCount--
    console.log(`WebSocket connection cleaned up: ${connectionId}`)
  }

  // Get connection statistics
  getConnectionStats(): {
    totalConnections: number
    activeConnections: number
    maxConnections: number
  } {
    return {
      totalConnections: this.connections.size,
      activeConnections: this.connectionCount,
      maxConnections: this.config.maxConnections,
    }
  }

  // Broadcast message to all connections
  broadcastToAll(message: any): void {
    const messageStr = JSON.stringify(message)

    for (const [connectionId, connection] of this.connections) {
      try {
        if (connection.socket.readyState === 1) {
          // WebSocket.OPEN
          connection.socket.send(messageStr)
        }
      } catch (error) {
        console.error(`Failed to broadcast to connection ${connectionId}:`, error)
      }
    }
  }

  // Broadcast message to specific dashboard type subscribers
  broadcastToDashboard(dashboardType: string, message: any): void {
    // This would be handled by the DashboardService's broadcastUpdate method
    // This method is here for completeness and future extensibility
  }

  // Close all connections (for graceful shutdown)
  closeAllConnections(): void {
    for (const [connectionId, connection] of this.connections) {
      try {
        connection.socket.close(1001, 'Server shutting down')
      } catch (error) {
        console.error(`Failed to close connection ${connectionId}:`, error)
      }
    }
    this.connections.clear()
    this.connectionCount = 0
  }
}
