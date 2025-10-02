import { Kafka, KafkaConfig, Producer, Consumer, EachMessagePayload } from 'kafkajs'

export type { Kafka }

export interface KafkaClientConfig extends KafkaConfig {
  brokers: string[]
  clientId?: string
  groupId?: string
}

export interface MessageHandler {
  (payload: EachMessagePayload): Promise<void>
}

export interface ProducerMessage {
  topic: string
  key?: string
  value: string
  partition?: number
  headers?: Record<string, string>
}

/**
 * Create a Kafka client instance
 */
export function createKafka(config: KafkaClientConfig): Kafka {
  return new Kafka({
    clientId: config.clientId ?? 'drivemaster-client',
    brokers: config.brokers,
    ...config,
  })
}

/**
 * Kafka producer wrapper
 */
export class KafkaProducer {
  private kafka: Kafka
  private producer: Producer
  private connected = false

  constructor(kafka: Kafka) {
    this.kafka = kafka
    this.producer = this.kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000,
    })
  }

  /**
   * Connect the producer
   */
  async connect(): Promise<void> {
    if (!this.connected) {
      await this.producer.connect()
      this.connected = true
      console.log('Kafka Producer connected')
    }
  }

  /**
   * Disconnect the producer
   */
  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.producer.disconnect()
      this.connected = false
      console.log('Kafka Producer disconnected')
    }
  }

  /**
   * Send a single message
   */
  async send(message: ProducerMessage): Promise<void> {
    await this.ensureConnected()

    await this.producer.send({
      topic: message.topic,
      messages: [
        {
          key: message.key,
          value: message.value,
          partition: message.partition,
          headers: message.headers,
        },
      ],
    })
  }

  /**
   * Send multiple messages
   */
  async sendBatch(messages: ProducerMessage[]): Promise<void> {
    await this.ensureConnected()

    // Group messages by topic
    const messagesByTopic = messages.reduce(
      (acc, message) => {
        if (!acc[message.topic]) {
          acc[message.topic] = []
        }
        acc[message.topic]?.push({
          key: message.key,
          value: message.value,
          partition: message.partition,
          headers: message.headers,
        })
        return acc
      },
      {} as Record<
        string,
        Array<{
          key?: string
          value: string
          partition?: number
          headers?: Record<string, string>
        }>
      >,
    )

    // Send messages for each topic
    for (const [topic, topicMessages] of Object.entries(messagesByTopic)) {
      await this.producer.send({
        topic,
        messages: topicMessages,
      })
    }
  }

  /**
   * Ensure producer is connected
   */
  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect()
    }
  }

  /**
   * Get producer status
   */
  isConnected(): boolean {
    return this.connected
  }
}

/**
 * Kafka consumer wrapper
 */
export class KafkaConsumer {
  private kafka: Kafka
  private consumer: Consumer
  private connected = false
  private running = false

  constructor(kafka: Kafka, groupId: string) {
    this.kafka = kafka
    this.consumer = this.kafka.consumer({
      groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    })
  }

  /**
   * Connect the consumer
   */
  async connect(): Promise<void> {
    if (!this.connected) {
      await this.consumer.connect()
      this.connected = true
      console.log('Kafka Consumer connected')
    }
  }

  /**
   * Disconnect the consumer
   */
  async disconnect(): Promise<void> {
    if (this.running) {
      await this.stop()
    }
    if (this.connected) {
      await this.consumer.disconnect()
      this.connected = false
      console.log('Kafka Consumer disconnected')
    }
  }

  /**
   * Subscribe to topics
   */
  async subscribe(topics: string[]): Promise<void> {
    await this.ensureConnected()

    for (const topic of topics) {
      await this.consumer.subscribe({ topic, fromBeginning: false })
    }
  }

  /**
   * Start consuming messages
   */
  async run(messageHandler: MessageHandler): Promise<void> {
    await this.ensureConnected()

    this.running = true
    await this.consumer.run({
      eachMessage: async (payload) => {
        try {
          await messageHandler(payload)
        } catch (error) {
          console.error('Error processing message:', error)
          // In production, you might want to send to a dead letter queue
        }
      },
    })
  }

  /**
   * Stop consuming messages
   */
  async stop(): Promise<void> {
    if (this.running) {
      await this.consumer.stop()
      this.running = false
      console.log('Kafka Consumer stopped')
    }
  }

  /**
   * Ensure consumer is connected
   */
  private async ensureConnected(): Promise<void> {
    if (!this.connected) {
      await this.connect()
    }
  }

  /**
   * Get consumer status
   */
  getStatus(): { connected: boolean; running: boolean } {
    return {
      connected: this.connected,
      running: this.running,
    }
  }
}

/**
 * High-level Kafka client wrapper
 */
export class KafkaClient {
  private kafka: Kafka
  private producer: KafkaProducer
  private consumers: Map<string, KafkaConsumer> = new Map()

  constructor(config: KafkaClientConfig) {
    this.kafka = createKafka(config)
    this.producer = new KafkaProducer(this.kafka)
  }

  /**
   * Get the producer instance
   */
  getProducer(): KafkaProducer {
    return this.producer
  }

  /**
   * Create a consumer for a specific group
   */
  createConsumer(groupId: string): KafkaConsumer {
    if (this.consumers.has(groupId)) {
      const existingConsumer = this.consumers.get(groupId)
      if (existingConsumer) {
        return existingConsumer
      }
    }

    const consumer = new KafkaConsumer(this.kafka, groupId)
    this.consumers.set(groupId, consumer)
    return consumer
  }

  /**
   * Send a message using the internal producer
   */
  async send(message: ProducerMessage): Promise<void> {
    await this.producer.send(message)
  }

  /**
   * Send multiple messages using the internal producer
   */
  async sendBatch(messages: ProducerMessage[]): Promise<void> {
    await this.producer.sendBatch(messages)
  }

  /**
   * Disconnect all producers and consumers
   */
  async disconnect(): Promise<void> {
    await this.producer.disconnect()

    for (const consumer of this.consumers.values()) {
      await consumer.disconnect()
    }

    this.consumers.clear()
    console.log('Kafka Client disconnected')
  }

  /**
   * Get client status
   */
  getStatus(): {
    producer: boolean
    consumers: Record<string, { connected: boolean; running: boolean }>
  } {
    const consumerStatus: Record<string, { connected: boolean; running: boolean }> = {}

    for (const [groupId, consumer] of this.consumers.entries()) {
      consumerStatus[groupId] = consumer.getStatus()
    }

    return {
      producer: this.producer.isConnected(),
      consumers: consumerStatus,
    }
  }
}
