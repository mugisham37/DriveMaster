/**
 * TestRunChannel for real-time test run updates
 * Handles exercise test execution feedback for submissions
 */

import { RealtimeConnection } from '../connection'
import { globalConnectionPool } from '../connection-pool'
import { camelizeKeys } from 'humps'

export interface TestRun {
  id: string
  uuid: string
  submissionUuid: string
  status: 'queued' | 'running' | 'passed' | 'failed' | 'errored' | 'cancelled'
  message?: string
  messageHtml?: string
  output?: string
  outputHtml?: string
  tests?: Array<{
    name: string
    status: 'pass' | 'fail' | 'error'
    message?: string
    output?: string
    index: number
  }>
  createdAt: string
  updatedAt: string
  links?: {
    self: string
    cancel?: string
  }
}

export type TestRunEventType = 
  | 'test_run_created'
  | 'test_run_updated'
  | 'test_run_completed'
  | 'test_run_failed'
  | 'test_run_cancelled'

export interface TestRunEvent {
  type: TestRunEventType
  data: TestRun
  timestamp: string
}

export type TestRunEventHandler = (updatedTestRun: TestRun) => void

export class TestRunChannel {
  private connection: RealtimeConnection | null = null
  private testRun: TestRun
  private subscriberId: string
  private onReceive: TestRunEventHandler
  private isSubscribed = false

  constructor(testRun: TestRun, onReceive: TestRunEventHandler) {
    this.testRun = testRun
    this.onReceive = onReceive
    this.subscriberId = `test_run_${testRun.submissionUuid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    this.subscribe()
  }

  /**
   * Subscribe to the test run channel
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
          channel: 'Submission::TestRunsChannel',
          submission_uuid: this.testRun.submissionUuid
        })
      })

      this.isSubscribed = true
      console.log(`Subscribed to test run channel: ${this.testRun.submissionUuid}`)

    } catch (error) {
      console.error('Failed to subscribe to test run channel:', error)
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
        channel: 'Submission::TestRunsChannel',
        submission_uuid: this.testRun.submissionUuid
      })
    })

    globalConnectionPool.releaseConnection(
      this.buildWebSocketUrl(),
      this.subscriberId
    )

    this.connection = null
    this.isSubscribed = false

    console.log(`Disconnected from test run channel: ${this.testRun.submissionUuid}`)
  }

  /**
   * Check if channel is active
   */
  isActive(): boolean {
    return this.isSubscribed && this.connection?.isReady() === true
  }

  /**
   * Cancel the test run
   */
  cancelTestRun(): void {
    if (!this.isSubscribed || !this.connection) {
      throw new Error('Not subscribed to test run channel')
    }

    this.connection.send({
      command: 'message',
      identifier: JSON.stringify({
        channel: 'Submission::TestRunsChannel',
        submission_uuid: this.testRun.submissionUuid
      }),
      data: JSON.stringify({
        action: 'cancel_test_run'
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
      console.log(`Test run channel connection established: ${this.testRun.submissionUuid}`)
    })

    this.connection.on('disconnected', () => {
      console.log(`Test run channel connection lost: ${this.testRun.submissionUuid}`)
    })

    this.connection.on('error', (event) => {
      console.error(`Test run channel error: ${this.testRun.submissionUuid}`, event.error)
    })
  }

  private handleMessage(data: Record<string, unknown>): void {
    try {
      // Handle ActionCable message format
      if (data.type === 'confirm_subscription') {
        console.log(`Test run channel subscription confirmed: ${this.testRun.submissionUuid}`)
        return
      }

      if (data.type === 'reject_subscription') {
        console.error(`Test run channel subscription rejected: ${this.testRun.submissionUuid}`)
        return
      }

      // Handle test run events with camelCase conversion and type checking
      if (data.message) {
        const formattedResponse = camelizeKeys(data.message)
        
        // Validate and type check the test run data
        if (this.isValidTestRun(formattedResponse)) {
          this.onReceive(formattedResponse as TestRun)
        } else {
          console.error('Invalid test run data received:', formattedResponse)
        }
      }

    } catch (error) {
      console.error('Error handling test run message:', error)
    }
  }

  private isValidTestRun(data: unknown): data is TestRun {
    return (
      data !== null &&
      data !== undefined &&
      typeof data === 'object' &&
      'uuid' in data &&
      'submissionUuid' in data &&
      'status' in data &&
      typeof (data as Record<string, unknown>).uuid === 'string' &&
      typeof (data as Record<string, unknown>).submissionUuid === 'string' &&
      typeof (data as Record<string, unknown>).status === 'string' &&
      ['queued', 'running', 'passed', 'failed', 'errored', 'cancelled'].includes((data as Record<string, unknown>).status as string)
    )
  }
}