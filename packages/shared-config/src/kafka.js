'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.EventConsumer = exports.EventPublisher = void 0
exports.createKafkaConnection = createKafkaConnection
exports.checkKafkaHealth = checkKafkaHealth
exports.createTopics = createTopics
const kafkajs_1 = require('kafkajs')
async function createKafkaConnection(config) {
  const kafka = new kafkajs_1.Kafka({
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
    close: async () => {
      await producer.disconnect()
      await consumer.disconnect()
    },
  }
}
// Event publishing utilities
class EventPublisher {
  producer
  constructor(producer) {
    this.producer = producer
  }
  async publish(topic, key, message) {
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
      console.error('Event publishing error:', error)
      return false
    }
  }
  async publishBatch(topic, messages) {
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
      console.error('Batch event publishing error:', error)
      return false
    }
  }
}
exports.EventPublisher = EventPublisher
// Event consumption utilities
class EventConsumer {
  consumer
  constructor(consumer) {
    this.consumer = consumer
  }
  async subscribe(topics) {
    await this.consumer.subscribe({ topics, fromBeginning: false })
  }
  async run(handler) {
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          if (!message.value) {
            console.warn('Received message with no value')
            return
          }
          const parsedMessage = JSON.parse(message.value.toString())
          const metadata = {
            topic,
            partition,
            offset: message.offset,
            key: message.key?.toString() || undefined,
            timestamp: message.timestamp ? new Date(parseInt(message.timestamp)) : new Date(),
          }
          await handler(parsedMessage, metadata)
        } catch (error) {
          console.error('Message processing error:', error)
          // In production, you might want to send to a dead letter queue
        }
      },
    })
  }
}
exports.EventConsumer = EventConsumer
// Kafka health check utility
async function checkKafkaHealth(kafka) {
  try {
    const admin = kafka.admin()
    await admin.connect()
    await admin.listTopics()
    await admin.disconnect()
    return true
  } catch (error) {
    console.error('Kafka health check failed:', error)
    return false
  }
}
// Topic management utilities
async function createTopics(kafka, topics) {
  const admin = kafka.admin()
  try {
    await admin.connect()
    await admin.createTopics({
      topics: topics.map((t) => ({
        topic: t.topic,
        numPartitions: t.numPartitions || 3,
        replicationFactor: t.replicationFactor || 1,
      })),
    })
  } finally {
    await admin.disconnect()
  }
}
//# sourceMappingURL=kafka.js.map
