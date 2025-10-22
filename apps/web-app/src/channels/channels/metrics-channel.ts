/**
 * MetricsChannel for real-time metrics tracking
 * Handles performance and analytics data with camelCase conversion
 */

import { RealtimeConnection } from '../connection'
import { globalConnectionPool } from '../connection-pool'
import { camelizeKeys } from 'humps'

export interface Metric {
  id: string
  type: 'start_solution_metric' | 'publish_solution_metric' | 'complete_exercise_metric' | 'user_activity_metric'
  coordinates?: [number, number] // [latitude, longitude]
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
  user?: {
    handle: string
    avatarUrl: string
    flair?: string
  }
  createdAt: string
  value?: number
  metadata?: Record<string, unknown>
}

export interface MetricsChannelResponse {
  metric: Metric
}

export type MetricsEventType = 
  | 'metric_created'
  | 'metric_updated'
  | 'metric_aggregated'

export interface MetricsEvent {
  type: MetricsEventType
  data: Metric
  timestamp: string
}

export type MetricsEventHandler = (metric: Metric) => void

function camelizeKeysAs<T>(object: Record<string, unknown>): T {
  return camelizeKeys(object) as unknown as T
}

export class MetricsChannel {
  private connection: RealtimeConnection | null = null
  private subscriberId: string
  private onReceive: MetricsEventHandler
  private isSubscribed = false

  constructor(onReceive: MetricsEventHandler) {
    this.onReceive = onReceive
    this.subscriberId = `metrics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    this.subscribe()
  }

  /**
   * Subscribe to the metrics channel
   */
  private async subscribe(): Promise<void> {
    if (this.isSubscribed) {
      return
    }

    const wsUrl = this.buildWebSocketUrl()
    
    try {
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
        identifier: JSON.stringify({
          channel: 'MetricsChannel'
        })
      })

      this.isSubscribed = true
      console.log('Subscribed to metrics channel')

    } catch (error) {
      console.error('Failed to subscribe to metrics channel:', error)
      throw error
    }
  }

  /**
   * Disconnect from the channel
   */
  disconnect(): void {
    if (!this.isSubscribed || !this.connection) {
      return
    }

    // Send unsubscription message
    this.connection.send({
      command: 'unsubscribe',
      identifier: JSON.stringify({
        channel: 'MetricsChannel'
      })
    })

    globalConnectionPool.releaseConnection(
      this.buildWebSocketUrl(),
      this.subscriberId
    )

    this.connection = null
    this.isSubscribed = false

    console.log('Disconnected from metrics channel')
  }

  /**
   * Check if channel is active
   */
  isActive(): boolean {
    return this.isSubscribed && this.connection?.isReady() === true
  }

  /**
   * Send a metric to the channel
   */
  sendMetric(metric: Partial<Metric>): void {
    if (!this.isSubscribed || !this.connection) {
      throw new Error('Not subscribed to metrics channel')
    }

    this.connection.send({
      command: 'message',
      identifier: JSON.stringify({
        channel: 'MetricsChannel'
      }),
      data: JSON.stringify({
        action: 'send_metric',
        metric: metric
      })
    })
  }

  private buildWebSocketUrl(): string {
    const baseUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'
    return `${baseUrl}/cable`
  }

  private setupConnectionHandlers(): void {
    if (!this.connection) return

    this.connection.on('message', (event) => {
      if (event.data) {
        this.handleMessage(event.data)
      }
    })

    this.connection.on('connected', () => {
      console.log('Metrics channel connection established')
    })

    this.connection.on('disconnected', () => {
      console.log('Metrics channel connection lost')
    })

    this.connection.on('error', (event) => {
      console.error('Metrics channel error:', event.error)
    })
  }

  private handleMessage(data: Record<string, unknown>): void {
    try {
      // Handle ActionCable message format
      if (data.type === 'confirm_subscription') {
        console.log('Metrics channel subscription confirmed')
        return
      }

      if (data.type === 'reject_subscription') {
        console.error('Metrics channel subscription rejected')
        return
      }

      // Handle metrics events with camelCase conversion
      if (data.message && (data.message as Record<string, unknown>).metric) {
        if (!this.onReceive) {
          return
        }

        const metric = camelizeKeysAs<Metric>((data.message as Record<string, unknown>).metric as Record<string, unknown>)
        
        // Validate the metric
        if (this.isValidMetric(metric)) {
          this.onReceive(metric)
        } else {
          console.error('Invalid metric received:', metric)
        }
      }

    } catch (error) {
      console.error('Error handling metrics message:', error)
    }
  }

  private isValidMetric(data: unknown): data is Metric {
    return (
      data !== null &&
      data !== undefined &&
      typeof data === 'object' &&
      'id' in data &&
      'type' in data &&
      'createdAt' in data &&
      typeof (data as Record<string, unknown>).id === 'string' &&
      typeof (data as Record<string, unknown>).type === 'string' &&
      typeof (data as Record<string, unknown>).createdAt === 'string'
    )
  }
}