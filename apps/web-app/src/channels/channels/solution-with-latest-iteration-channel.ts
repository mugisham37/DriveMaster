/**
 * SolutionWithLatestIterationChannel for combined solution and iteration updates
 * Handles exercise solution tracking with iterations
 */

import { RealtimeConnection } from '../connection'
import { globalConnectionPool } from '../connection-pool'
import { camelizeKeys } from 'humps'
import { Iteration } from './iteration-channel'
import { Solution } from './solution-channel'

export interface SolutionWithLatestIterationResponse {
  solution: Solution
  iteration: Iteration
}

export type SolutionWithLatestIterationEventType = 
  | 'solution_iteration_updated'
  | 'latest_iteration_changed'
  | 'solution_status_changed'

export interface SolutionWithLatestIterationEvent {
  type: SolutionWithLatestIterationEventType
  data: SolutionWithLatestIterationResponse
  timestamp: string
}

export type SolutionWithLatestIterationEventHandler = (response: SolutionWithLatestIterationResponse) => void

export class SolutionWithLatestIterationChannel {
  private connection: RealtimeConnection | null = null
  private solution: Solution
  private subscriberId: string
  private onReceive: SolutionWithLatestIterationEventHandler
  private isSubscribed = false

  constructor(
    solution: Solution,
    onReceive: SolutionWithLatestIterationEventHandler
  ) {
    this.solution = solution
    this.onReceive = onReceive
    this.subscriberId = `solution_with_latest_iteration_${solution.uuid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    this.subscribe()
  }

  /**
   * Subscribe to the solution with latest iteration channel
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
          channel: 'SolutionWithLatestIterationChannel',
          uuid: this.solution.uuid
        })
      })

      this.isSubscribed = true
      console.log(`Subscribed to solution with latest iteration channel: ${this.solution.uuid}`)

    } catch (error) {
      console.error('Failed to subscribe to solution with latest iteration channel:', error)
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
        channel: 'SolutionWithLatestIterationChannel',
        uuid: this.solution.uuid
      })
    })

    globalConnectionPool.releaseConnection(
      this.buildWebSocketUrl(),
      this.subscriberId
    )

    this.connection = null
    this.isSubscribed = false

    console.log(`Disconnected from solution with latest iteration channel: ${this.solution.uuid}`)
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

    this.connection.on('message', (event) => {
      if (event.data) {
        this.handleMessage(event.data)
      }
    })

    this.connection.on('connected', () => {
      console.log(`Solution with latest iteration channel connection established: ${this.solution.uuid}`)
    })

    this.connection.on('disconnected', () => {
      console.log(`Solution with latest iteration channel connection lost: ${this.solution.uuid}`)
    })

    this.connection.on('error', (event) => {
      console.error(`Solution with latest iteration channel error: ${this.solution.uuid}`, event.error)
    })
  }

  private handleMessage(data: Record<string, unknown>): void {
    try {
      // Handle ActionCable message format
      if (data.type === 'confirm_subscription') {
        console.log(`Solution with latest iteration channel subscription confirmed: ${this.solution.uuid}`)
        return
      }

      if (data.type === 'reject_subscription') {
        console.error(`Solution with latest iteration channel subscription rejected: ${this.solution.uuid}`)
        return
      }

      // Handle solution with iteration events with camelCase conversion
      if (data.message) {
        const response = camelizeKeys(data.message) as SolutionWithLatestIterationResponse
        
        // Validate the response
        if (this.isValidResponse(response)) {
          this.onReceive(response)
        } else {
          console.error('Invalid solution with latest iteration response received:', response)
        }
      }

    } catch (error) {
      console.error('Error handling solution with latest iteration message:', error)
    }
  }

  private isValidResponse(data: unknown): data is SolutionWithLatestIterationResponse {
    const obj = data as Record<string, unknown>
    return (
      data !== null &&
      data !== undefined &&
      typeof data === 'object' &&
      'solution' in obj &&
      'iteration' in obj &&
      typeof obj.solution === 'object' &&
      typeof obj.iteration === 'object' &&
      obj.solution !== null &&
      obj.iteration !== null
    )
  }
}