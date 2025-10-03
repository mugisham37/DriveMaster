import { randomUUID } from 'crypto'

import { KafkaConsumer, type MessageHandler } from '@drivemaster/kafka-client'
import { createRedisClient, type RedisClientType } from '@drivemaster/redis-client'

// Define EachMessagePayload type for compatibility
export interface EachMessagePayload {
  topic: string
  partition: number
  message: {
    key: Buffer | null
    value: Buffer | null
    timestamp: string
    offset: string
    headers?: Record<string, Buffer>
  }
}

import {
  LearningEventSchema,
  ContentEventSchema,
  EngagementEventSchema,
  AvroValidator,
  type AvroSchema,
} from './schemas'

// Define missing types that would normally come from packages
export interface KafkaEventProcessorConfig {
  clientId: string
  brokers: string[]
  retryOptions: {
    retries: number
    initialRetryTime: number
    maxRetryTime: number
  }
}

export interface ConsumerConfig {
  groupId: string
  topics: string[]
  deadLetterQueue: {
    topic: string
    maxRetries: number
    retryDelayMs: number
  }
  batchSize: number
  sessionTimeout: number
  heartbeatInterval: number
}

export interface SchemaConfig {
  type: string
  version: string
  schema: AvroSchema
}

export interface TopicConfig {
  topic: string
  numPartitions: number
  replicationFactor: number
}

export class KafkaEventProcessor {
  private config: KafkaEventProcessorConfig
  private handlers: Map<string, (payload: EachMessagePayload) => Promise<void>> = new Map()
  private schemas: Map<string, SchemaConfig> = new Map()

  constructor(config: KafkaEventProcessorConfig) {
    this.config = config
  }

  async initialize(): Promise<void> {
    // Mock implementation - would initialize Kafka client
  }

  registerSchema(name: string, schema: SchemaConfig): void {
    this.schemas.set(name, schema)
  }

  async createConsumer(_config: ConsumerConfig): Promise<void> {
    // Mock implementation - would create Kafka consumer
  }

  registerHandler(topic: string, handler: (payload: EachMessagePayload) => Promise<void>): void {
    this.handlers.set(topic, handler)
  }

  async startProcessing(): Promise<void> {
    // Mock implementation - would start consuming messages
  }

  async disconnect(): Promise<void> {
    // Mock implementation - would disconnect from Kafka
  }

  async createTopics(_topics: TopicConfig[]): Promise<void> {
    // Mock implementation - would create Kafka topics
  }

  async publishEvent(_topic: string, _event: Record<string, unknown>): Promise<void> {
    // Mock implementation - would publish event to Kafka
  }

  async enableEventReplay(_topic: string, _fromTimestamp: Date): Promise<void> {
    // Mock implementation - would enable event replay
  }
}

export class EventAggregator {
  private windows: Map<string, { size: number; handler: (events: EventData[]) => Promise<void> }> =
    new Map()

  createWindow(
    name: string,
    sizeMs: number,
    handler: (events: EventData[]) => Promise<void>,
  ): void {
    this.windows.set(name, { size: sizeMs, handler })
  }

  addEvent(_windowName: string, _event: EventData): void {
    // Mock implementation - would add event to aggregation window
  }
}

// Note: PrismaClient will be injected as a dependency to avoid import issues
export type PrismaClientType = {
  learningEventStream: {
    create: (args: any) => Promise<any>
    count: (args: any) => Promise<number>
    groupBy: (args: any) => Promise<any>
  }
  metricAggregation: {
    upsert: (args: any) => Promise<any>
    findUnique: (args: any) => Promise<any>
  }
  alert: {
    create: (args: any) => Promise<any>
  }
}

export interface EventData {
  eventId?: string
  userId?: string
  sessionId?: string
  conceptKey?: string
  itemId?: string
  eventType?: string
  correct?: boolean
  responseTime?: number
  confidence?: number
  attempts?: number
  deviceType?: string
  timeOfDay?: string
  studyStreak?: number
  masteryBefore?: number
  masteryAfter?: number
  difficultyRating?: number
  engagementScore?: number
  rawEventData?: Record<string, unknown>
  windowTimestamp?: number
  contentId?: string
  viewDuration?: number
  rating?: number
  [key: string]: unknown
}

export interface EventProcessorConfig {
  kafkaBrokers: string[]
  redisUrl: string
  groupId: string
  batchSize: number
  windowSizeMs: number
}

export class AnalyticsEventProcessor {
  private kafkaProcessor: KafkaEventProcessor
  private aggregator: EventAggregator
  private prisma: PrismaClientType
  private redis: RedisClientType
  private config: EventProcessorConfig
  private isProcessing = false

  constructor(config: EventProcessorConfig, prisma: PrismaClientType) {
    this.config = config
    this.prisma = prisma

    this.kafkaProcessor = new KafkaEventProcessor({
      clientId: 'analytics-service',
      brokers: config.kafkaBrokers,
      retryOptions: {
        retries: 5,
        initialRetryTime: 300,
        maxRetryTime: 30000,
      },
    })

    this.aggregator = new EventAggregator()
    this.redis = createRedisClient(config.redisUrl)
  }

  async initialize(): Promise<void> {
    // Initialize Kafka processor
    await this.kafkaProcessor.initialize()

    // Register event schemas
    this.kafkaProcessor.registerSchema('learning_event', {
      type: 'learning_event',
      version: '1.0',
      schema: LearningEventSchema,
    })

    this.kafkaProcessor.registerSchema('content_event', {
      type: 'content_event',
      version: '1.0',
      schema: ContentEventSchema,
    })

    this.kafkaProcessor.registerSchema('engagement_event', {
      type: 'engagement_event',
      version: '1.0',
      schema: EngagementEventSchema,
    })

    // Create consumer
    await this.kafkaProcessor.createConsumer({
      groupId: this.config.groupId,
      topics: ['learning.events.v1', 'content.events.v1', 'engagement.events.v1'],
      deadLetterQueue: {
        topic: 'analytics.dlq.v1',
        maxRetries: 3,
        retryDelayMs: 5000,
      },
      batchSize: this.config.batchSize,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    })

    // Register message handlers
    this.kafkaProcessor.registerHandler('learning.events.v1', this.handleLearningEvent.bind(this))
    this.kafkaProcessor.registerHandler('content.events.v1', this.handleContentEvent.bind(this))
    this.kafkaProcessor.registerHandler(
      'engagement.events.v1',
      this.handleEngagementEvent.bind(this),
    )

    // Set up aggregation windows
    this.setupAggregationWindows()

    // Create required topics
    await this.createTopics()

    // Use proper logging instead of console.log in production
  }

  async startProcessing(): Promise<void> {
    if (this.isProcessing) {
      throw new Error('Event processing already started')
    }

    this.isProcessing = true
    await this.kafkaProcessor.startProcessing()
    // Use proper logging instead of console.log in production
  }

  async stopProcessing(): Promise<void> {
    this.isProcessing = false
    await this.kafkaProcessor.disconnect()
    // Use proper logging instead of console.log in production
  }

  private async createTopics(): Promise<void> {
    const topics: TopicConfig[] = [
      { topic: 'learning.events.v1', numPartitions: 6, replicationFactor: 1 },
      { topic: 'content.events.v1', numPartitions: 3, replicationFactor: 1 },
      { topic: 'engagement.events.v1', numPartitions: 3, replicationFactor: 1 },
      { topic: 'analytics.dlq.v1', numPartitions: 1, replicationFactor: 1 },
      { topic: 'analytics.aggregated.v1', numPartitions: 3, replicationFactor: 1 },
    ]

    try {
      await this.kafkaProcessor.createTopics(topics)
      // Use proper logging instead of console.log in production
    } catch (error) {
      // Use proper logging instead of console.log in production
    }
  }

  private setupAggregationWindows(): void {
    // 1-minute window for real-time metrics
    this.aggregator.createWindow('realtime-1m', 60000, async (events: EventData[]) => {
      await this.processRealtimeWindow(events, '1m')
    })

    // 5-minute window for short-term trends
    this.aggregator.createWindow('shortterm-5m', 300000, async (events: EventData[]) => {
      await this.processRealtimeWindow(events, '5m')
    })

    // 1-hour window for hourly aggregations
    this.aggregator.createWindow('hourly-1h', 3600000, async (events: EventData[]) => {
      await this.processRealtimeWindow(events, '1h')
    })

    // 1-day window for daily aggregations
    this.aggregator.createWindow('daily-1d', 86400000, async (events: EventData[]) => {
      await this.processRealtimeWindow(events, '1d')
    })
  }

  private async handleLearningEvent(payload: EachMessagePayload): Promise<void> {
    const message = payload.message
    const messageValue = message.value?.toString() ?? '{}'
    const eventData = JSON.parse(messageValue) as EventData

    // Validate schema
    const validation = AvroValidator.validate(eventData, LearningEventSchema)
    if (!validation.valid) {
      throw new Error(`Schema validation failed: ${validation.errors.join(', ')}`)
    }

    // Store raw event
    await this.storeRawEvent('learning', eventData, payload)

    // Add to aggregation windows
    this.aggregator.addEvent('realtime-1m', eventData)
    this.aggregator.addEvent('shortterm-5m', eventData)
    this.aggregator.addEvent('hourly-1h', eventData)
    this.aggregator.addEvent('daily-1d', eventData)

    // Real-time processing
    await this.processLearningEventRealtime(eventData)

    // Update user behavior profile
    await this.updateUserBehaviorProfile(eventData)

    // Check for anomalies and alerts
    await this.checkLearningAnomalies(eventData)

    // Use proper logging instead of console.log in production
  }

  private async handleContentEvent(payload: EachMessagePayload): Promise<void> {
    const message = payload.message
    const messageValue = message.value?.toString() ?? '{}'
    const eventData = JSON.parse(messageValue) as EventData

    // Validate schema
    const validation = AvroValidator.validate(eventData, ContentEventSchema)
    if (!validation.valid) {
      throw new Error(`Schema validation failed: ${validation.errors.join(', ')}`)
    }

    // Store raw event
    await this.storeRawEvent('content', eventData, payload)

    // Process content analytics
    await this.processContentAnalytics(eventData)

    // Use proper logging instead of console.log in production
  }

  private async handleEngagementEvent(payload: EachMessagePayload): Promise<void> {
    const message = payload.message
    const messageValue = message.value?.toString() ?? '{}'
    const eventData = JSON.parse(messageValue) as EventData

    // Validate schema
    const validation = AvroValidator.validate(eventData, EngagementEventSchema)
    if (!validation.valid) {
      throw new Error(`Schema validation failed: ${validation.errors.join(', ')}`)
    }

    // Store raw event
    await this.storeRawEvent('engagement', eventData, payload)

    // Process engagement analytics
    await this.processEngagementAnalytics(eventData)

    // Use proper logging instead of console.log in production
  }

  private async storeRawEvent(
    eventType: string,
    eventData: EventData,
    payload: EachMessagePayload,
  ): Promise<void> {
    try {
      const timestamp = payload.message.timestamp
        ? new Date(parseInt(payload.message.timestamp.toString()))
        : new Date()

      await this.prisma.learningEventStream.create({
        data: {
          eventId: eventData.eventId ?? randomUUID(),
          userId: eventData.userId,
          sessionId: eventData.sessionId,
          conceptKey: eventData.conceptKey ?? 'unknown',
          itemId: eventData.itemId,
          eventType: eventData.eventType ?? eventType,
          correct: eventData.correct,
          responseTime: eventData.responseTime,
          confidence: eventData.confidence,
          attempts: eventData.attempts ?? 1,
          deviceType: eventData.deviceType,
          timeOfDay: eventData.timeOfDay,
          studyStreak: eventData.studyStreak,
          masteryBefore: eventData.masteryBefore,
          masteryAfter: eventData.masteryAfter,
          difficultyRating: eventData.difficultyRating,
          engagementScore: eventData.engagementScore,
          rawEventData: eventData.rawEventData ?? eventData,
          processed: false,
          kafkaPartition: payload.partition,
          kafkaOffset: payload.message.offset,
          kafkaTimestamp: timestamp,
        },
      })
    } catch (error) {
      // Use proper logging instead of console.error in production
      throw error
    }
  }

  private async processRealtimeWindow(events: EventData[], windowSize: string): Promise<void> {
    if (events.length === 0) return

    const timestamps = events.map((e: EventData) => e.windowTimestamp ?? Date.now())
    const windowStart = new Date(Math.min(...timestamps))
    const windowEnd = new Date(Math.max(...timestamps))

    // Group events by user and concept
    const userConceptGroups = this.groupEventsByUserConcept(events)

    for (const [key, groupEvents] of userConceptGroups.entries()) {
      const [userId, conceptKey] = key.split('|')

      if (!userId || !conceptKey) continue

      await this.updateMetricAggregation({
        metricName: 'accuracy_rate',
        metricType: 'GAUGE',
        aggregation: 'AVERAGE',
        timeWindow: windowSize,
        windowStart,
        windowEnd,
        userId,
        conceptKey,
        events: groupEvents,
      })

      await this.updateMetricAggregation({
        metricName: 'response_time',
        metricType: 'HISTOGRAM',
        aggregation: 'AVERAGE',
        timeWindow: windowSize,
        windowStart,
        windowEnd,
        userId,
        conceptKey,
        events: groupEvents,
      })

      await this.updateMetricAggregation({
        metricName: 'session_count',
        metricType: 'COUNTER',
        aggregation: 'COUNT',
        timeWindow: windowSize,
        windowStart,
        windowEnd,
        userId,
        conceptKey,
        events: groupEvents,
      })
    }

    // Publish aggregated metrics
    await this.publishAggregatedMetrics(windowSize, windowStart, windowEnd, userConceptGroups)
  }

  private groupEventsByUserConcept(events: EventData[]): Map<string, EventData[]> {
    const groups = new Map<string, EventData[]>()

    for (const event of events) {
      const key = `${event.userId ?? 'unknown'}|${event.conceptKey ?? 'unknown'}`
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      const group = groups.get(key)
      if (group) {
        group.push(event)
      }
    }

    return groups
  }

  private async updateMetricAggregation(data: {
    metricName: string
    metricType: string
    aggregation: string
    timeWindow: string
    windowStart: Date
    windowEnd: Date
    userId: string
    conceptKey: string
    events: any[]
  }): Promise<void> {
    const { events, ...metricData } = data

    let value = 0
    let count = events.length

    switch (data.metricName) {
      case 'accuracy_rate':
        const correctEvents = events.filter((e) => e.correct === true)
        const totalAnswers = events.filter((e) => e.correct !== null)
        value = totalAnswers.length > 0 ? correctEvents.length / totalAnswers.length : 0
        count = totalAnswers.length
        break

      case 'response_time':
        const responseTimeEvents = events.filter((e) => e.responseTime)
        value =
          responseTimeEvents.length > 0
            ? responseTimeEvents.reduce((sum, e) => sum + e.responseTime, 0) /
            responseTimeEvents.length
            : 0
        count = responseTimeEvents.length
        break

      case 'session_count':
        const uniqueSessions = new Set(events.map((e) => e.sessionId).filter(Boolean))
        value = uniqueSessions.size
        count = uniqueSessions.size
        break
    }

    if (count === 0) return

    try {
      await this.prisma.metricAggregation.upsert({
        where: {
          metricName_timeWindow_windowStart_userId_conceptKey_categoryKey: {
            metricName: data.metricName,
            timeWindow: data.timeWindow,
            windowStart: data.windowStart,
            userId: data.userId,
            conceptKey: data.conceptKey,
            categoryKey: null,
          },
        },
        create: {
          ...metricData,
          categoryKey: null,
          value,
          count,
          sum: value * count,
          min: value,
          max: value,
          avg: value,
        },
        update: {
          value,
          count: { increment: count },
          sum: { increment: value * count },
          min: value < (await this.getCurrentMin(data)) ? value : undefined,
          max: value > (await this.getCurrentMax(data)) ? value : undefined,
          avg: await this.calculateNewAverage(data, value, count),
        },
      })
    } catch (error) {
      console.error('Error updating metric aggregation:', error)
    }
  }

  private async getCurrentMin(data: any): Promise<number> {
    const current = await this.prisma.metricAggregation.findUnique({
      where: {
        metricName_timeWindow_windowStart_userId_conceptKey_categoryKey: {
          metricName: data.metricName,
          timeWindow: data.timeWindow,
          windowStart: data.windowStart,
          userId: data.userId,
          conceptKey: data.conceptKey,
          categoryKey: null,
        },
      },
    })
    return current?.min || Infinity
  }

  private async getCurrentMax(data: any): Promise<number> {
    const current = await this.prisma.metricAggregation.findUnique({
      where: {
        metricName_timeWindow_windowStart_userId_conceptKey_categoryKey: {
          metricName: data.metricName,
          timeWindow: data.timeWindow,
          windowStart: data.windowStart,
          userId: data.userId,
          conceptKey: data.conceptKey,
          categoryKey: null,
        },
      },
    })
    return current?.max || -Infinity
  }

  private async calculateNewAverage(
    data: any,
    newValue: number,
    newCount: number,
  ): Promise<number> {
    const current = await this.prisma.metricAggregation.findUnique({
      where: {
        metricName_timeWindow_windowStart_userId_conceptKey_categoryKey: {
          metricName: data.metricName,
          timeWindow: data.timeWindow,
          windowStart: data.windowStart,
          userId: data.userId,
          conceptKey: data.conceptKey,
          categoryKey: null,
        },
      },
    })

    if (!current) return newValue

    const totalSum = (current.sum || 0) + newValue * newCount
    const totalCount = current.count + newCount
    return totalSum / totalCount
  }

  private async processLearningEventRealtime(event: any): Promise<void> {
    // Update real-time user metrics in Redis
    const userKey = `user:${event.userId}:realtime`

    await this.redis.hset(userKey, {
      lastActivity: Date.now(),
      lastAccuracy: event.correct ? 1 : 0,
      lastResponseTime: event.responseTime || 0,
      lastEngagement: event.engagementScore || 0.5,
    })

    await this.redis.expire(userKey, 3600) // 1 hour TTL

    // Update concept performance
    if (event.conceptKey) {
      const conceptKey = `concept:${event.conceptKey}:realtime`
      await this.redis.hincrby(conceptKey, 'totalAttempts', 1)

      if (event.correct === true) {
        await this.redis.hincrby(conceptKey, 'correctAttempts', 1)
      }

      await this.redis.expire(conceptKey, 3600)
    }
  }

  private async updateUserBehaviorProfile(event: any): Promise<void> {
    // This would integrate with the existing behavior profile logic
    // For now, just update basic metrics
    const profileKey = `profile:${event.userId}`

    await this.redis.hset(profileKey, {
      lastEventTime: Date.now(),
      lastEventType: event.eventType,
      lastConceptKey: event.conceptKey || 'unknown',
    })

    await this.redis.expire(profileKey, 86400 * 30) // 30 days TTL
  }

  private async checkLearningAnomalies(event: any): Promise<void> {
    // Check for performance anomalies
    if (event.correct === false && event.responseTime > 60000) {
      await this.createAlert({
        alertType: 'performance_anomaly',
        severity: 'MEDIUM',
        entityType: 'user',
        entityId: event.userId,
        title: 'Performance Anomaly Detected',
        description: `User ${event.userId} showed poor performance: incorrect answer with response time ${event.responseTime}ms`,
        actualValue: event.responseTime,
        threshold: 60000,
        eventId: event.eventId,
      })
    }

    // Check for engagement anomalies
    if (event.engagementScore && event.engagementScore < 0.2) {
      await this.createAlert({
        alertType: 'engagement_anomaly',
        severity: 'LOW',
        entityType: 'user',
        entityId: event.userId,
        title: 'Low Engagement Detected',
        description: `User ${event.userId} showing very low engagement score: ${event.engagementScore}`,
        actualValue: event.engagementScore,
        threshold: 0.2,
        eventId: event.eventId,
      })
    }
  }

  private async processContentAnalytics(event: any): Promise<void> {
    // Update content performance metrics
    const contentKey = `content:${event.contentId}:analytics`

    await this.redis.hincrby(contentKey, 'viewCount', 1)

    if (event.viewDuration) {
      await this.redis.hset(contentKey, 'lastViewDuration', event.viewDuration)
    }

    if (event.rating) {
      await this.redis.hset(contentKey, 'lastRating', event.rating)
    }

    await this.redis.expire(contentKey, 86400 * 7) // 7 days TTL
  }

  private async processEngagementAnalytics(event: any): Promise<void> {
    // Update engagement metrics
    const engagementKey = `engagement:${event.userId}:analytics`

    await this.redis.hset(engagementKey, {
      lastEngagementEvent: event.eventType,
      lastEngagementTime: Date.now(),
      lastEngagementScore: event.engagementScore || 0.5,
    })

    await this.redis.expire(engagementKey, 86400 * 30) // 30 days TTL
  }

  private async createAlert(alertData: any): Promise<void> {
    try {
      await this.prisma.alert.create({
        data: {
          ...alertData,
          dimensions: alertData.eventId ? { eventId: alertData.eventId } : {},
        },
      })

      console.log(
        `Alert created: ${alertData.alertType} for ${alertData.entityType} ${alertData.entityId}`,
      )
    } catch (error) {
      console.error('Error creating alert:', error)
    }
  }

  private async publishAggregatedMetrics(
    windowSize: string,
    windowStart: Date,
    windowEnd: Date,
    userConceptGroups: Map<string, any[]>,
  ): Promise<void> {
    const aggregatedEvent = {
      eventId: randomUUID(),
      eventType: 'metrics_aggregated',
      windowSize,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      userConceptCount: userConceptGroups.size,
      totalEvents: Array.from(userConceptGroups.values()).reduce(
        (sum, events) => sum + events.length,
        0,
      ),
      timestamp: Date.now(),
      version: '1.0',
    }

    await this.kafkaProcessor.publishEvent('analytics.aggregated.v1', aggregatedEvent)
  }

  // Event replay functionality
  async replayEvents(fromTimestamp: Date, toTimestamp?: Date): Promise<void> {
    console.log(`Starting event replay from ${fromTimestamp.toISOString()}`)

    // Enable replay mode
    await this.kafkaProcessor.enableEventReplay('learning.events.v1', fromTimestamp)
    await this.kafkaProcessor.enableEventReplay('content.events.v1', fromTimestamp)
    await this.kafkaProcessor.enableEventReplay('engagement.events.v1', fromTimestamp)

    console.log('Event replay enabled for ML model training')
  }
}
