/**
 * MentorRequestChannel for real-time mentor request updates
 * Handles mentoring system real-time updates (cancelled/pending/fulfilled)
 */

import { RealtimeConnection } from '../connection'
import { globalConnectionPool } from '../connection-pool'
import { camelizeKeys } from 'humps'

export interface MentorSessionRequest {
  uuid: string
  status: 'cancelled' | 'pending' | 'fulfilled'
  trackSlug: string
  exerciseSlug: string
  studentHandle: string
  createdAt: string
  updatedAt: string
}

export interface MentorRequestChannelResponse {
  mentorRequest: {
    uuid: string
    status: 'cancelled' | 'pending' | 'fulfilled'
    trackSlug?: string
    exerciseSlug?: string
    studentHandle?: string
    mentorHandle?: string
    updatedAt?: string
  }
}

export type MentorRequestEventType = 
  | 'request_created'
  | 'request_cancelled'
  | 'request_fulfilled'
  | 'mentor_assigned'

export interface MentorRequestEvent {
  type: MentorRequestEventType
  data: MentorRequestChannelResponse
  timestamp: string
}

export type MentorRequestEventHandler = (response: MentorRequestChannelResponse) => void

function camelizeKeysAs<T>(object: Record<string, unknown>): T {
  return camelizeKeys(object) as unknown as T
}

export class MentorRequestChannel {
  private connection: RealtimeConnection | null = null
  private request: MentorSessionRequest
  private subscriberId: string
  private onReceive: MentorRequestEventHandler
  private isSubscribed = false

  constructor(
    request: MentorSessionRequest,
    onReceive: MentorRequestEventHandler
  ) {
    this.request = request
    this.onReceive = onReceive
    this.subscriberId = `mentor_request_${request.uuid}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    
    this.subscribe()
  }

  /**
   * Subscribe to the mentor request channel
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
          channel: 'MentorRequestChannel',
          uuid: this.request.uuid
        })
      })

      this.isSubscribed = true
      console.log(`Subscribed to mentor request channel: ${this.request.uuid}`)

    } catch (error) {
      console.error('Failed to subscribe to mentor request channel:', error)
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
        channel: 'MentorRequestChannel',
        uuid: this.request.uuid
      })
    })

    globalConnectionPool.releaseConnection(
      this.buildWebSocketUrl(),
      this.subscriberId
    )

    this.connection = null
    this.isSubscribed = false

    console.log(`Disconnected from mentor request channel: ${this.request.uuid}`)
  }

  /**
   * Check if channel is active
   */
  isActive(): boolean {
    return this.isSubscribed && this.connection?.isReady() === true
  }

  /**
   * Cancel the mentor request
   */
  cancelRequest(): void {
    if (!this.isSubscribed || !this.connection) {
      throw new Error('Not subscribed to mentor request channel')
    }

    this.connection.send({
      command: 'message',
      identifier: JSON.stringify({
        channel: 'MentorRequestChannel',
        uuid: this.request.uuid
      }),
      data: JSON.stringify({
        action: 'cancel_request'
      })
    })
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
      console.log(`Mentor request channel connection established: ${this.request.uuid}`)
    })

    this.connection.on('disconnected', () => {
      console.log(`Mentor request channel connection lost: ${this.request.uuid}`)
    })

    this.connection.on('error', (event: { error?: Error }) => {
      console.error(`Mentor request channel error: ${this.request.uuid}`, event.error)
    })
  }

  private handleMessage(data: Record<string, unknown>): void {
    try {
      // Handle ActionCable message format
      if (data.type === 'confirm_subscription') {
        console.log(`Mentor request channel subscription confirmed: ${this.request.uuid}`)
        return
      }

      if (data.type === 'reject_subscription') {
        console.error(`Mentor request channel subscription rejected: ${this.request.uuid}`)
        return
      }

      // Handle mentor request events with camelCase conversion
      if (data.message) {
        const response = camelizeKeysAs<MentorRequestChannelResponse>(data.message as Record<string, unknown>)
        
        // Validate the response
        if (this.isValidMentorRequestResponse(response)) {
          this.onReceive(response)
        } else {
          console.error('Invalid mentor request response received:', response)
        }
      }

    } catch (error) {
      console.error('Error handling mentor request message:', error)
    }
  }

  private isValidMentorRequestResponse(data: unknown): data is MentorRequestChannelResponse {
    return (
      data !== null &&
      data !== undefined &&
      typeof data === 'object' &&
      'mentorRequest' in data &&
      typeof (data as Record<string, unknown>).mentorRequest === 'object' &&
      (data as Record<string, unknown>).mentorRequest !== null &&
      'uuid' in ((data as Record<string, unknown>).mentorRequest as Record<string, unknown>) &&
      'status' in ((data as Record<string, unknown>).mentorRequest as Record<string, unknown>) &&
      typeof ((data as Record<string, unknown>).mentorRequest as Record<string, unknown>).uuid === 'string' &&
      typeof ((data as Record<string, unknown>).mentorRequest as Record<string, unknown>).status === 'string' &&
      ['cancelled', 'pending', 'fulfilled'].includes(((data as Record<string, unknown>).mentorRequest as Record<string, unknown>).status as string)
    )
  }
}