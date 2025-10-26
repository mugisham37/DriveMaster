/**
 * ReputationChannel for real-time reputation updates
 * Handles user reputation tracking with connection management
 */

import { RealtimeConnection } from '../connection'
import { globalConnectionPool } from '../connection-pool'

export interface ReputationUpdate {
  id: string
  uuid: string
  type: string
  value: number
  reason: string
  createdAt: string
  user?: {
    handle: string
    avatarUrl: string
  }
  track?: {
    slug: string
    title: string
    iconUrl: string
  }
  exercise?: {
    slug: string
    title: string
    iconUrl: string
  }
}

export type ReputationEventType = 
  | 'reputation_gained'
  | 'reputation_lost'
  | 'reputation_updated'

export interface ReputationEvent {
  type: ReputationEventType
  data: ReputationUpdate
  timestamp: string
}

export type ReputationEventHandler = () => void

export class ReputationChannel {
  private connection: RealtimeConnection | null = null
  private subscriberId: string
  private onReceive: ReputationEventHandler
  private isSubscribed = false
  private identifier: string

  constructor(onReceive: ReputationEventHandler) {
    this.onReceive = onReceive
    this.subscriberId = `reputation_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    this.identifier = JSON.stringify({ channel: 'ReputationChannel' })
    
    this.subscribe()
  }

  /**
   * Subscribe to the reputation channel
   */
  private async subscribe(): Promise<void> {
    if (this.isSubscribed) {
      return
    }

    const wsUrl = this.buildWebSocketUrl()
    
    try {
      // Check if connection pool is ready
      if (!this.isConnectionPoolReady()) {
        console.error('Connection pool not available for ReputationChannel')
        return
      }

      this.connection = await globalConnectionPool.getConnection(
        wsUrl,
        this.subscriberId,
        {
          reconnectInterval: 1000,
          maxReconnectAttempts: 10,
          heartbeatInterval: 30000
        }
      )

      this.setupConnectionHandlers()
      
      // Send subscription message (ActionCable format)
      this.connection.send({
        command: 'subscribe',
        identifier: this.identifier
      })

      this.isSubscribed = true
      console.log('Subscribed to reputation channel')

    } catch (error) {
      console.error('Failed to subscribe to reputation channel:', error)
      this.connection = null
    }
  }

  /**
   * Disconnect from the channel
   */
  disconnect(): void {
    try {
      if (!this.connection) {
        console.warn('No ReputationChannel subscription to disconnect')
        return
      }

      if (!this.isConnectionPoolReady()) {
        console.warn('Connection pool not available for disconnect')
        return
      }

      // Send unsubscription message
      this.connection.send({
        command: 'unsubscribe',
        identifier: this.identifier
      })

      globalConnectionPool.releaseConnection(
        this.buildWebSocketUrl(),
        this.subscriberId
      )

    } catch (error) {
      console.error('Error disconnecting ReputationChannel:', error)
    } finally {
      this.connection = null
      this.isSubscribed = false
      console.log('Disconnected from reputation channel')
    }
  }

  /**
   * Check if channel is connected
   */
  isConnected(): boolean {
    return this.connection !== null && this.isSubscribed
  }

  /**
   * Check if channel is active
   */
  isActive(): boolean {
    return this.isSubscribed && this.connection?.isReady() === true
  }

  private buildWebSocketUrl(): string {
    const baseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'
    return `${baseUrl}/cable`
  }

  private setupConnectionHandlers(): void {
    if (!this.connection) return

    this.connection.on('message', (event: { data?: unknown }) => {
      if (event.data && typeof event.data === 'object' && event.data !== null) {
        this.handleMessage(event.data as Record<string, unknown>)
      }
    })

    this.connection.on('connected', () => {
      console.log('Reputation channel connection established')
    })

    this.connection.on('disconnected', () => {
      console.log('Reputation channel connection lost')
    })

    this.connection.on('error', (event: { error?: Error }) => {
      console.error('Reputation channel error:', event.error)
    })
  }

  private handleMessage(data: Record<string, unknown>): void {
    try {
      // Handle ActionCable message format
      if (data.type === 'confirm_subscription') {
        console.log('Reputation channel subscription confirmed')
        return
      }

      if (data.type === 'reject_subscription') {
        console.error('Reputation channel subscription rejected')
        return
      }

      // Handle reputation events
      if (data.message) {
        // Call the onReceive callback for any reputation update
        if (this.onReceive) {
          this.onReceive()
        }
      }

    } catch (error) {
      console.error('Error handling reputation message:', error)
    }
  }

  private isConnectionPoolReady(): boolean {
    return !!(globalConnectionPool && typeof globalConnectionPool.getConnection === 'function')
  }
}