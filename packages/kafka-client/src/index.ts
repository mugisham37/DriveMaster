import { Kafka, KafkaConfig, Producer, Consumer, Admin, EachMessagePayload } from 'kafkajs'

export interface KafkaClientConfig extends KafkaConfig {
  retryOptions?: {
    retries?: number
    initialRetryTime?: number
    maxRetryTime?: number
  }
}

export interface EventSchema {
  type: string
  version: string
  schema: any
}

export interface DeadLetterQueueConfig {
  topic: string
  maxRetries: number
  retryDelayMs: number
}

export interface EventProcessorConfig {
  groupId: string
  topics: string[]
  deadLetterQueue?: DeadLetterQueueConfig
  batchSize?: number
  sessionTimeout?: number
  heartbeatInterval?: number
}

export class KafkaEventProcessor {
  private kafka: Kafka
  private producer: Producer | null = null
  private consumer: Consumer | null = null
  private admin: Admin | null = null
  private schemas: Map<string, EventSchema> = new Map()
  private messageHandlers: Map<string, (payload: EachMessagePayload) => Promise<void>> = new Map()
  private dlqConfig: DeadLetterQueueConfig | undefined

  constructor(config: KafkaClientConfig) {
    this.kafka = new Kafka({
      ...config,
      retry: config.retryOptions || {
        retries: 5,
        initialRetryTime: 300,
        maxRetryTime: 30000,
      },
    })
  }

  async initialize(): Promise<void> {
    this.producer = this.kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000,
    })

    this.admin = this.kafka.admin()

    await this.producer.connect()
    await this.admin.connect()
  }

  async createConsumer(config: EventProcessorConfig): Promise<void> {
    this.consumer = this.kafka.consumer({
      groupId: config.groupId,
      sessionTimeout: config.sessionTimeout || 30000,
      heartbeatInterval: config.heartbeatInterval || 3000,
      maxBytesPerPartition: 1048576, // 1MB
      retry: {
        retries: 5,
        initialRetryTime: 300,
      },
    })

    this.dlqConfig = config.deadLetterQueue

    await this.consumer.connect()
    await this.consumer.subscribe({
      topics: config.topics,
      fromBeginning: false,
    })
  }

  registerSchema(eventType: string, schema: EventSchema): void {
    this.schemas.set(eventType, schema)
  }

  registerHandler(topic: string, handler: (payload: EachMessagePayload) => Promise<void>): void {
    this.messageHandlers.set(topic, handler)
  }

  async startProcessing(): Promise<void> {
    if (!this.consumer) {
      throw new Error('Consumer not initialized. Call createConsumer first.')
    }

    await this.consumer.run({
      partitionsConsumedConcurrently: 3,
      eachMessage: async (payload) => {
        const { topic, partition, message } = payload
        let retryCount = 0
        const maxRetries = this.dlqConfig?.maxRetries || 3

        while (retryCount <= maxRetries) {
          try {
            // Validate message schema if registered
            const messageValue = message.value?.toString()
            if (messageValue) {
              const event = JSON.parse(messageValue)
              await this.validateEventSchema(event)
            }

            // Process message with registered handler
            const handler = this.messageHandlers.get(topic)
            if (handler) {
              await handler(payload)
            }

            break // Success, exit retry loop
          } catch (error) {
            retryCount++
            console.error(
              `Error processing message (attempt ${retryCount}/${maxRetries + 1}):`,
              error,
            )

            if (retryCount > maxRetries) {
              // Send to dead letter queue
              await this.sendToDeadLetterQueue(payload, error as Error)
            } else {
              // Wait before retry
              await this.delay(this.dlqConfig?.retryDelayMs || 1000 * retryCount)
            }
          }
        }
      },
    })
  }

  async publishEvent(topic: string, event: any, key?: string): Promise<void> {
    if (!this.producer) {
      throw new Error('Producer not initialized. Call initialize first.')
    }

    // Validate event schema if registered
    await this.validateEventSchema(event)

    const message = {
      key: key || event.id || event.eventId,
      value: JSON.stringify(event),
      timestamp: Date.now().toString(),
      headers: {
        'event-type': event.type || 'unknown',
        'event-version': event.version || '1.0',
        'correlation-id': event.correlationId || this.generateCorrelationId(),
      },
    }

    await this.producer.send({
      topic,
      messages: [message],
    })
  }

  async publishBatch(topic: string, events: any[]): Promise<void> {
    if (!this.producer) {
      throw new Error('Producer not initialized. Call initialize first.')
    }

    const messages = events.map((event) => ({
      key: event.id || event.eventId || this.generateCorrelationId(),
      value: JSON.stringify(event),
      timestamp: Date.now().toString(),
      headers: {
        'event-type': event.type || 'unknown',
        'event-version': event.version || '1.0',
        'correlation-id': event.correlationId || this.generateCorrelationId(),
      },
    }))

    await this.producer.send({
      topic,
      messages,
    })
  }

  async createTopics(
    topics: Array<{ topic: string; numPartitions?: number; replicationFactor?: number }>,
  ): Promise<void> {
    if (!this.admin) {
      throw new Error('Admin client not initialized. Call initialize first.')
    }

    await this.admin.createTopics({
      topics: topics.map((t) => ({
        topic: t.topic,
        numPartitions: t.numPartitions || 3,
        replicationFactor: t.replicationFactor || 1,
        configEntries: [
          { name: 'cleanup.policy', value: 'delete' },
          { name: 'retention.ms', value: '604800000' }, // 7 days
          { name: 'segment.ms', value: '86400000' }, // 1 day
        ],
      })),
    })
  }

  async enableEventReplay(topic: string, fromTimestamp?: Date): Promise<void> {
    if (!this.consumer || !this.admin) {
      throw new Error('Consumer and Admin not initialized')
    }

    const topicMetadata = await this.admin.fetchTopicMetadata({ topics: [topic] })
    const topicInfo = topicMetadata.topics.find((t) => t.name === topic)

    if (!topicInfo) {
      throw new Error(`Topic ${topic} not found`)
    }

    const partitions = topicInfo.partitions

    for (const partition of partitions) {
      if (fromTimestamp) {
        const offsets = await this.admin.fetchTopicOffsetsByTimestamp(
          topic,
          fromTimestamp.getTime(),
        )
        const partitionOffset = offsets[partition.partitionId]
        await this.consumer.seek({
          topic,
          partition: partition.partitionId,
          offset: partitionOffset?.offset || '0',
        })
      } else {
        await this.consumer.seek({
          topic,
          partition: partition.partitionId,
          offset: '0',
        })
      }
    }
  }

  private async validateEventSchema(event: any): Promise<void> {
    const eventType = event.type
    if (!eventType) return

    const schema = this.schemas.get(eventType)
    if (!schema) return

    // Basic validation - in production, use a proper schema validation library
    if (schema.version !== event.version) {
      throw new Error(`Schema version mismatch. Expected: ${schema.version}, Got: ${event.version}`)
    }
  }

  private async sendToDeadLetterQueue(payload: EachMessagePayload, error: Error): Promise<void> {
    if (!this.dlqConfig || !this.producer) return

    const dlqMessage = {
      key: payload.message.key?.toString() || 'unknown',
      value: JSON.stringify({
        originalTopic: payload.topic,
        originalPartition: payload.partition,
        originalOffset: payload.message.offset,
        originalMessage: payload.message.value?.toString(),
        error: error.message,
        timestamp: new Date().toISOString(),
        retryCount: this.dlqConfig.maxRetries,
      }),
      headers: {
        ...payload.message.headers,
        'dlq-reason': 'max-retries-exceeded',
        'dlq-timestamp': Date.now().toString(),
      },
    }

    await this.producer.send({
      topic: this.dlqConfig.topic,
      messages: [dlqMessage],
    })
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  async disconnect(): Promise<void> {
    if (this.consumer) await this.consumer.disconnect()
    if (this.producer) await this.producer.disconnect()
    if (this.admin) await this.admin.disconnect()
  }
}

// Event aggregation and windowing utilities
export class EventAggregator {
  private windows: Map<string, any[]> = new Map()
  private windowSizes: Map<string, number> = new Map()
  private windowCallbacks: Map<string, (events: any[]) => Promise<void>> = new Map()

  createWindow(windowId: string, sizeMs: number, callback: (events: any[]) => Promise<void>): void {
    this.windowSizes.set(windowId, sizeMs)
    this.windowCallbacks.set(windowId, callback)
    this.windows.set(windowId, [])

    // Set up window processing interval
    setInterval(async () => {
      await this.processWindow(windowId)
    }, sizeMs)
  }

  addEvent(windowId: string, event: any): void {
    const windowEvents = this.windows.get(windowId) || []
    windowEvents.push({
      ...event,
      windowTimestamp: Date.now(),
    })
    this.windows.set(windowId, windowEvents)
  }

  private async processWindow(windowId: string): Promise<void> {
    const events = this.windows.get(windowId) || []
    const windowSize = this.windowSizes.get(windowId) || 60000
    const callback = this.windowCallbacks.get(windowId)

    if (events.length === 0 || !callback) return

    const cutoffTime = Date.now() - windowSize
    const windowEvents = events.filter((e) => e.windowTimestamp >= cutoffTime)
    const expiredEvents = events.filter((e) => e.windowTimestamp < cutoffTime)

    // Process expired events
    if (expiredEvents.length > 0) {
      await callback(expiredEvents)
    }

    // Keep only current window events
    this.windows.set(windowId, windowEvents)
  }
}

export function createKafka(config: KafkaConfig): Kafka {
  return new Kafka(config)
}
