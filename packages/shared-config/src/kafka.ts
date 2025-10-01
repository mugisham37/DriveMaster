import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs'

import type { KafkaConfig } from './environment'

// Simple logger for internal use - in production, inject proper logger
const logger = {
  error: (message: string, error?: unknown): void => {
    if (process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.error(message, error)
    }
  },
  warn: (message: string): void => {
    if (process.env.NODE_ENV !== 'test') {
      // eslint-disable-next-line no-console
      console.warn(message)
    }
  },
}

export interface KafkaConnection {
  kafka: Kafka
  producer: Producer
  consumer: Consumer
  close: () => Promise<void>
}

export async function createKafkaConnection(config: KafkaConfig): Promise<KafkaConnection> {
  const kafka = new Kafka({
    clientId: config.clientId,
    brokers: config.brokers,
    connectionTimeout: config.connectionTimeout,
    requestTimeout: config.requestTimeout,
    retry: config.retry,
    // Performance optimizations
    logLevel: process.env.NODE_ENV === 'development' ? 2 : 1, // INFO in dev, WARN in prod
  })

  const producer = kafka.producer({
    maxInFlightRequests: 1,
    idempotent: true,
    transactionTimeout: 30000,
    // Batching for better performance
    // Note: batch configuration is handled at send level
    // Compression for better network utilization
    // Note: compression is handled at message level
  })

  const consumer = kafka.consumer({
    groupId: config.groupId,
    sessionTimeout: 30000,
    rebalanceTimeout: 60000,
    heartbeatInterval: 3000,
    // Performance optimizations
    maxBytesPerPartition: 1048576, // 1MB
    minBytes: 1,
    maxBytes: 10485760, // 10MB
    maxWaitTimeInMs: 5000,
  })

  await producer.connect()
  await consumer.connect()

  return {
    kafka,
    producer,
    consumer,
    close: async (): Promise<void> => {
      await producer.disconnect()
      await consumer.disconnect()
    },
  }
}

// Event publishing utilities
export class EventPublisher {
  constructor(private producer: Producer) {}

  async publish<T>(topic: string, key: string, message: T): Promise<boolean> {
    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key,
            value: JSON.stringify(message),
            timestamp: Date.now().toString(),
          },
        ],
      })
      return true
    } catch (error) {
      logger.error('Event publishing error:', error)
      return false
    }
  }

  async publishBatch<T>(
    topic: string,
    messages: Array<{ key: string; value: T }>,
  ): Promise<boolean> {
    try {
      await this.producer.send({
        topic,
        messages: messages.map((msg) => ({
          key: msg.key,
          value: JSON.stringify(msg.value),
          timestamp: Date.now().toString(),
        })),
      })
      return true
    } catch (error) {
      logger.error('Batch event publishing error:', error)
      return false
    }
  }
}

// Event consumption utilities
export class EventConsumer {
  constructor(private consumer: Consumer) {}

  async subscribe(topics: string[]): Promise<void> {
    await this.consumer.subscribe({ topics, fromBeginning: false })
  }

  async run<T>(handler: (message: T, metadata: MessageMetadata) => Promise<void>): Promise<void> {
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
        try {
          if (message.value === null || message.value === undefined) {
            logger.warn('Received message with no value')
            return
          }

          const parsedMessage = JSON.parse(message.value.toString()) as T
          const metadata: MessageMetadata = {
            topic,
            partition,
            offset: message.offset,
            key: message.key?.toString() ?? undefined,
            timestamp:
              message.timestamp !== undefined && message.timestamp !== ''
                ? new Date(parseInt(message.timestamp))
                : new Date(),
          }

          await handler(parsedMessage, metadata)
        } catch (error) {
          logger.error('Message processing error:', error)
          // In production, you might want to send to a dead letter queue
        }
      },
    })
  }
}

export interface MessageMetadata {
  topic: string
  partition: number
  offset: string
  key: string | undefined
  timestamp: Date
}

// Kafka health check utility
export async function checkKafkaHealth(kafka: Kafka): Promise<boolean> {
  try {
    const admin = kafka.admin()
    await admin.connect()
    await admin.listTopics()
    await admin.disconnect()
    return true
  } catch (error) {
    logger.error('Kafka health check failed:', error)
    return false
  }
}

// Topic management utilities
export async function createTopics(
  kafka: Kafka,
  topics: Array<{ topic: string; numPartitions?: number; replicationFactor?: number }>,
): Promise<void> {
  const admin = kafka.admin()
  try {
    await admin.connect()
    await admin.createTopics({
      topics: topics.map((t) => ({
        topic: t.topic,
        numPartitions: t.numPartitions ?? 3,
        replicationFactor: t.replicationFactor ?? 1,
      })),
    })
  } finally {
    await admin.disconnect()
  }
}
