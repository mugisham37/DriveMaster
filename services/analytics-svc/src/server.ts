import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import { Registry, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client'
import { initTelemetry } from '@drivemaster/telemetry'
import { loadEnv } from '@drivemaster/shared-config'
import { createRedisClient } from '@drivemaster/redis-client'
import { createKafka } from '@drivemaster/kafka-client'
import { createEsClient } from '@drivemaster/es-client'
import { z } from 'zod'
import { randomUUID } from 'crypto'

initTelemetry('analytics-svc')
const env = loadEnv()
const app = Fastify({ logger: true })
const prisma = new PrismaClient()
const redis = env.REDIS_URL ? createRedisClient(env.REDIS_URL) : null
const kafka = env.KAFKA_BROKERS ? createKafka({ brokers: env.KAFKA_BROKERS.split(',') }) : null
const es = env.ELASTICSEARCH_URL ? createEsClient(env.ELASTICSEARCH_URL) : null

// Prometheus metrics setup
const registry = new Registry()
collectDefaultMetrics({ register: registry })

// Custom metrics
const learningEventsProcessed = new Counter({
  name: 'learning_events_processed_total',
  help: 'Total number of learning events processed',
  labelNames: ['event_type', 'concept_key'],
  registers: [registry]
})

const userBehaviorAnalysisTime = new Histogram({
  name: 'user_behavior_analysis_duration_seconds',
  help: 'Duration of user behavior analysis in seconds',
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [registry]
})

const activeAlertsGauge = new Gauge({
  name: 'active_alerts_total',
  help: 'Number of active alerts by severity',
  labelNames: ['severity'],
  registers: [registry]
})

const predictionAccuracy = new Histogram({
  name: 'prediction_accuracy',
  help: 'Accuracy of ML predictions',
  labelNames: ['model_name'],
  buckets: [0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1.0],
  registers: [registry]
})

// Validation schemas
const LearningEventSchema = z.object({
  eventId: z.string(),
  userId: z.string(),
  sessionId: z.string().optional(),
  conceptKey: z.string(),
  itemId: z.string().optional(),
  eventType: z.string(),
  correct: z.boolean().optional(),
  responseTime: z.number().optional(),
  confidence: z.number().min(1).max(5).optional(),
  attempts: z.number().default(1),
  deviceType: z.string().optional(),
  timeOfDay: z.string().optional(),
  studyStreak: z.number().optional(),
  masteryBefore: z.number().optional(),
  masteryAfter: z.number().optional(),
  difficultyRating: z.number().optional(),
  engagementScore: z.number().optional(),
  rawEventData: z.record(z.any())
})

const AnalyticsQuerySchema = z.object({
  metrics: z.array(z.string()),
  dimensions: z.array(z.string()).optional(),
  filters: z.record(z.any()).optional(),
  timeRange: z.object({
    start: z.string(),
    end: z.string()
  }),
  granularity: z.enum(['minute', 'hour', 'day', 'week', 'month']).default('hour'),
  limit: z.number().min(1).max(1000).default(100)
})

const PredictionRequestSchema = z.object({
  modelName: z.string(),
  entityType: z.enum(['user', 'session', 'concept']),
  entityId: z.string(),
  features: z.record(z.any()),
  contextData: z.record(z.any()).optional()
})

// Middleware
await app.register(cors, { origin: true, credentials: true })
await app.register(jwt, { secret: env.JWT_SECRET || 'change_me' })

// Auth middleware
async function authenticate(request: any, reply: any) {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' })
  }
}

// Admin middleware
async function requireAdmin(request: any, reply: any) {
  try {
    await request.jwtVerify()
    if (request.user.role !== 'ADMIN' && request.user.role !== 'INSTRUCTOR') {
      reply.code(403).send({ error: 'Insufficient permissions' })
    }
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' })
  }
}

// Utility functions for analytics processing
class AnalyticsProcessor {
  // Process learning events for real-time insights
  static async processLearningEvent(event: any): Promise<void> {
    const startTime = Date.now()
    
    try {
      // Store raw event
      await prisma.learningEventStream.upsert({
        where: { eventId: event.eventId },
        create: {
          ...event,
          processed: false
        },
        update: {
          processed: false
        }
      })
      
      // Real-time aggregations
      await this.updateRealTimeMetrics(event)
      
      // Update user behavior profile
      await this.updateUserBehaviorProfile(event)
      
      // Check for anomalies and trigger alerts
      await this.checkForAnomalies(event)
      
      // Mark as processed
      await prisma.learningEventStream.update({
        where: { eventId: event.eventId },
        data: { processed: true, processedAt: new Date() }
      })
      
      // Update metrics
      learningEventsProcessed.inc({ 
        event_type: event.eventType, 
        concept_key: event.conceptKey 
      })
      
    } catch (error) {
      app.log.error({ error, eventId: event.eventId }, 'Failed to process learning event')
      throw error
    } finally {
      const duration = (Date.now() - startTime) / 1000
      userBehaviorAnalysisTime.observe(duration)
    }
  }
  
  // Update real-time metrics aggregations
  static async updateRealTimeMetrics(event: any): Promise<void> {
    const now = new Date()
    const timeWindows = ['1m', '5m', '1h', '1d']
    
    for (const timeWindow of timeWindows) {
      const { windowStart, windowEnd } = this.getTimeWindow(now, timeWindow)
      
      // Update accuracy metrics
      if (event.correct !== undefined) {
        await this.updateMetricAggregation({
          metricName: 'accuracy_rate',
          metricType: 'GAUGE',
          aggregation: 'AVERAGE',
          value: event.correct ? 1 : 0,
          timeWindow,
          windowStart,
          windowEnd,
          userId: event.userId,
          conceptKey: event.conceptKey
        })
      }
      
      // Update response time metrics
      if (event.responseTime) {
        await this.updateMetricAggregation({
          metricName: 'response_time',
          metricType: 'HISTOGRAM',
          aggregation: 'AVERAGE',
          value: event.responseTime,
          timeWindow,
          windowStart,
          windowEnd,
          userId: event.userId,
          conceptKey: event.conceptKey
        })
      }
      
      // Update engagement metrics
      if (event.engagementScore) {
        await this.updateMetricAggregation({
          metricName: 'engagement_score',
          metricType: 'GAUGE',
          aggregation: 'AVERAGE',
          value: event.engagementScore,
          timeWindow,
          windowStart,
          windowEnd,
          userId: event.userId,
          conceptKey: event.conceptKey
        })
      }
      
      // Update session count
      await this.updateMetricAggregation({
        metricName: 'session_count',
        metricType: 'COUNTER',
        aggregation: 'COUNT',
        value: 1,
        timeWindow,
        windowStart,
        windowEnd,
        userId: event.userId,
        conceptKey: event.conceptKey
      })
    }
  }
  
  // Update or create metric aggregation
  static async updateMetricAggregation(data: any): Promise<void> {
    await prisma.metricAggregation.upsert({
      where: {
        metricName_timeWindow_windowStart_userId_conceptKey_categoryKey: {
          metricName: data.metricName,
          timeWindow: data.timeWindow,
          windowStart: data.windowStart,
          userId: data.userId,
          conceptKey: data.conceptKey,
          categoryKey: data.categoryKey || null
        }
      },
      create: {
        ...data,
        count: 1,
        sum: data.value,
        min: data.value,
        max: data.value,
        avg: data.value
      },
      update: {
        count: { increment: 1 },
        sum: { increment: data.value },
        min: data.value < (await this.getCurrentMin(data)) ? data.value : undefined,
        max: data.value > (await this.getCurrentMax(data)) ? data.value : undefined,
        avg: (await this.calculateNewAverage(data))
      }
    })
  }
  
  // Update user behavior profile with real-time learning
  static async updateUserBehaviorProfile(event: any): Promise<void> {
    const userId = event.userId
    
    // Get recent events for this user
    const recentEvents = await prisma.learningEventStream.findMany({
      where: {
        userId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    const profile = await this.calculateBehaviorProfile(userId, recentEvents)
    
    await prisma.userBehaviorProfile.upsert({
      where: { userId },
      create: { userId, ...profile },
      update: { ...profile, lastAnalyzed: new Date() }
    })
  }
  
  // Calculate comprehensive user behavior profile
  static async calculateBehaviorProfile(userId: string, events: any[]): Promise<any> {
    if (events.length === 0) {
      return {
        segment: 'new_user',
        dataPoints: 0
      }
    }
    
    const accuracyEvents = events.filter(e => e.correct !== null)
    const responseTimeEvents = events.filter(e => e.responseTime)
    const confidenceEvents = events.filter(e => e.confidence)
    
    // Performance patterns
    const avgAccuracy = accuracyEvents.length > 0 ? 
      accuracyEvents.reduce((sum, e) => sum + (e.correct ? 1 : 0), 0) / accuracyEvents.length : 0
    
    const avgResponseTime = responseTimeEvents.length > 0 ?
      responseTimeEvents.reduce((sum, e) => sum + e.responseTime, 0) / responseTimeEvents.length : 0
    
    const avgConfidence = confidenceEvents.length > 0 ?
      confidenceEvents.reduce((sum, e) => sum + e.confidence, 0) / confidenceEvents.length : 0
    
    // Learning patterns
    const studyTimes = events.map(e => new Date(e.createdAt).getHours())
    const preferredStudyTime = this.getPreferredStudyTime(studyTimes)
    
    // Session patterns
    const sessions = this.groupEventsBySessions(events)
    const avgSessionDuration = sessions.length > 0 ?
      sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length : 0
    
    // Predictive scores
    const dropoutRisk = await this.calculateDropoutRisk(userId, events)
    const successProbability = await this.calculateSuccessProbability(userId, events)
    const engagementRisk = await this.calculateEngagementRisk(userId, events)
    
    // Behavioral segment
    const segment = this.determineUserSegment(avgAccuracy, avgResponseTime, events.length)
    
    return {
      avgAccuracy,
      avgResponseTime,
      avgConfidence,
      preferredStudyTime,
      avgSessionDuration,
      dropoutRisk,
      successProbability,
      engagementRisk,
      segment,
      dataPoints: events.length
    }
  }
  
  // Check for anomalies and trigger alerts
  static async checkForAnomalies(event: any): Promise<void> {
    // Check for performance drops
    if (event.correct === false && event.responseTime > 60000) {
      await this.createAlert({
        alertType: 'performance_drop',
        severity: 'MEDIUM',
        entityType: 'user',
        entityId: event.userId,
        title: 'User Performance Drop Detected',
        description: `User ${event.userId} showed poor performance: incorrect answer with long response time`,
        actualValue: event.responseTime,
        threshold: 60000
      })
    }
    
    // Check for engagement drops
    if (event.engagementScore && event.engagementScore < 0.3) {
      await this.createAlert({
        alertType: 'low_engagement',
        severity: 'LOW',
        entityType: 'user',
        entityId: event.userId,
        title: 'Low User Engagement',
        description: `User ${event.userId} showing low engagement score`,
        actualValue: event.engagementScore,
        threshold: 0.3
      })
    }
  }
  
  // Create alert
  static async createAlert(alertData: any): Promise<void> {
    await prisma.alert.create({
      data: {
        ...alertData,
        dimensions: {}
      }
    })
    
    // Update active alerts metric
    activeAlertsGauge.inc({ severity: alertData.severity.toLowerCase() })
  }
  
  // Helper functions
  static getTimeWindow(date: Date, window: string): { windowStart: Date; windowEnd: Date } {
    const windowStart = new Date(date)
    const windowEnd = new Date(date)
    
    switch (window) {
      case '1m':
        windowStart.setMinutes(date.getMinutes(), 0, 0)
        windowEnd.setMinutes(date.getMinutes() + 1, 0, 0)
        break
      case '5m':
        const minutes = Math.floor(date.getMinutes() / 5) * 5
        windowStart.setMinutes(minutes, 0, 0)
        windowEnd.setMinutes(minutes + 5, 0, 0)
        break
      case '1h':
        windowStart.setHours(date.getHours(), 0, 0, 0)
        windowEnd.setHours(date.getHours() + 1, 0, 0, 0)
        break
      case '1d':
        windowStart.setHours(0, 0, 0, 0)
        windowEnd.setHours(23, 59, 59, 999)
        break
    }
    
    return { windowStart, windowEnd }
  }
  
  static async getCurrentMin(data: any): Promise<number> {
    const current = await prisma.metricAggregation.findUnique({
      where: {
        metricName_timeWindow_windowStart_userId_conceptKey_categoryKey: {
          metricName: data.metricName,
          timeWindow: data.timeWindow,
          windowStart: data.windowStart,
          userId: data.userId,
          conceptKey: data.conceptKey,
          categoryKey: data.categoryKey || null
        }
      }
    })
    return current?.min || Infinity
  }
  
  static async getCurrentMax(data: any): Promise<number> {
    const current = await prisma.metricAggregation.findUnique({
      where: {
        metricName_timeWindow_windowStart_userId_conceptKey_categoryKey: {
          metricName: data.metricName,
          timeWindow: data.timeWindow,
          windowStart: data.windowStart,
          userId: data.userId,
          conceptKey: data.conceptKey,
          categoryKey: data.categoryKey || null
        }
      }
    })
    return current?.max || -Infinity
  }
  
  static async calculateNewAverage(data: any): Promise<number> {
    const current = await prisma.metricAggregation.findUnique({
      where: {
        metricName_timeWindow_windowStart_userId_conceptKey_categoryKey: {
          metricName: data.metricName,
          timeWindow: data.timeWindow,
          windowStart: data.windowStart,
          userId: data.userId,
          conceptKey: data.conceptKey,
          categoryKey: data.categoryKey || null
        }
      }
    })
    
    if (!current) return data.value
    
    const newSum = (current.sum || 0) + data.value
    const newCount = current.count + 1
    return newSum / newCount
  }
  
  static getPreferredStudyTime(hours: number[]): string {
    const morningHours = hours.filter(h => h >= 6 && h < 12).length
    const afternoonHours = hours.filter(h => h >= 12 && h < 18).length
    const eveningHours = hours.filter(h => h >= 18 || h < 6).length
    
    if (morningHours >= afternoonHours && morningHours >= eveningHours) return 'morning'
    if (afternoonHours >= eveningHours) return 'afternoon'
    return 'evening'
  }
  
  static groupEventsBySessions(events: any[]): any[] {
    const sessions: any[] = []
    let currentSession: any = null
    
    for (const event of events) {
      if (!currentSession || event.sessionId !== currentSession.sessionId) {
        if (currentSession) sessions.push(currentSession)
        currentSession = {
          sessionId: event.sessionId,
          start: new Date(event.createdAt),
          end: new Date(event.createdAt),
          events: [event]
        }
      } else {
        currentSession.events.push(event)
        currentSession.end = new Date(event.createdAt)
      }
    }
    
    if (currentSession) sessions.push(currentSession)
    
    return sessions.map(s => ({
      ...s,
      duration: (s.end.getTime() - s.start.getTime()) / (1000 * 60) // minutes
    }))
  }
  
  static async calculateDropoutRisk(userId: string, events: any[]): Promise<number> {
    // Simple heuristic - would be replaced with ML model
    const recentEvents = events.slice(0, 10)
    const accuracyTrend = this.calculateTrend(recentEvents.map(e => e.correct ? 1 : 0))
    const engagementTrend = this.calculateTrend(recentEvents.map(e => e.engagementScore || 0.5))
    
    // Higher risk if performance and engagement are declining
    const riskScore = Math.max(0, -accuracyTrend * 0.5 - engagementTrend * 0.5)
    return Math.min(1, riskScore)
  }
  
  static async calculateSuccessProbability(userId: string, events: any[]): Promise<number> {
    const accuracyEvents = events.filter(e => e.correct !== null)
    if (accuracyEvents.length === 0) return 0.5
    
    const avgAccuracy = accuracyEvents.reduce((sum, e) => sum + (e.correct ? 1 : 0), 0) / accuracyEvents.length
    const masteryGrowth = this.calculateMasteryGrowth(events)
    
    return Math.min(1, avgAccuracy * 0.7 + masteryGrowth * 0.3)
  }
  
  static async calculateEngagementRisk(userId: string, events: any[]): Promise<number> {
    const engagementEvents = events.filter(e => e.engagementScore)
    if (engagementEvents.length === 0) return 0.5
    
    const avgEngagement = engagementEvents.reduce((sum, e) => sum + e.engagementScore, 0) / engagementEvents.length
    return Math.max(0, 1 - avgEngagement)
  }
  
  static calculateTrend(values: number[]): number {
    if (values.length < 2) return 0
    
    const n = values.length
    const sumX = (n - 1) * n / 2
    const sumY = values.reduce((a, b) => a + b, 0)
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0)
    const sumX2 = values.reduce((sum, _, x) => sum + x * x, 0)
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    return slope
  }
  
  static calculateMasteryGrowth(events: any[]): number {
    const masteryEvents = events.filter(e => e.masteryAfter !== null && e.masteryBefore !== null)
    if (masteryEvents.length === 0) return 0
    
    const totalGrowth = masteryEvents.reduce((sum, e) => sum + (e.masteryAfter - e.masteryBefore), 0)
    return Math.max(0, totalGrowth / masteryEvents.length)
  }
  
  static determineUserSegment(avgAccuracy: number, avgResponseTime: number, eventCount: number): string {
    if (eventCount < 10) return 'new_user'
    if (avgAccuracy > 0.8 && avgResponseTime < 30000) return 'high_achiever'
    if (avgAccuracy < 0.5 || avgResponseTime > 60000) return 'struggling'
    if (eventCount < 50) return 'casual'
    return 'regular'
  }
}

// Machine Learning Prediction Engine
class MLPredictionEngine {
  static async makePrediction(modelName: string, features: any): Promise<any> {
    // Get model configuration
    const model = await prisma.predictionModel.findUnique({
      where: { modelName, isActive: true }
    })
    
    if (!model) {
      throw new Error(`Model ${modelName} not found or inactive`)
    }
    
    // Simple prediction logic - would be replaced with actual ML model
    let prediction = 0.5
    let confidence = 0.7
    
    switch (modelName) {
      case 'dropout_prediction':
        prediction = this.predictDropout(features)
        break
      case 'performance_forecast':
        prediction = this.predictPerformance(features)
        break
      case 'engagement_forecast':
        prediction = this.predictEngagement(features)
        break
    }
    
    return { prediction, confidence, modelVersion: model.modelVersion }
  }
  
  static predictDropout(features: any): number {
    // Simple logistic regression approximation
    const weights = {
      avgAccuracy: -2.5,
      avgResponseTime: 1.5,
      engagementScore: -3.0,
      sessionFrequency: -1.0,
      studyStreak: -0.5
    }
    
    let logit = -0.5 // intercept
    for (const [feature, weight] of Object.entries(weights)) {
      if (features[feature] !== undefined) {
        logit += weight * features[feature]
      }
    }
    
    return 1 / (1 + Math.exp(-logit))
  }
  
  static predictPerformance(features: any): number {
    // Linear regression approximation
    const weights = {
      currentMastery: 0.6,
      learningVelocity: 0.3,
      timeSpent: 0.1
    }
    
    let prediction = 0.5 // baseline
    for (const [feature, weight] of Object.entries(weights)) {
      if (features[feature] !== undefined) {
        prediction += weight * features[feature]
      }
    }
    
    return Math.max(0, Math.min(1, prediction))
  }
  
  static predictEngagement(features: any): number {
    const weights = {
      socialEngagement: 0.4,
      streakMaintenance: 0.3,
      avgSessionDuration: 0.2,
      challengeParticipation: 0.1
    }
    
    let prediction = 0.5
    for (const [feature, weight] of Object.entries(weights)) {
      if (features[feature] !== undefined) {
        prediction += weight * (features[feature] - 0.5)
      }
    }
    
    return Math.max(0, Math.min(1, prediction))
  }
}

// Kafka event consumer setup
if (kafka) {
  const consumer = kafka.consumer({ groupId: 'analytics-service' })
  
  consumer.subscribe({ topics: ['learning.events.v1', 'content.events.v1', 'engagement.events.v1'] })
  
  consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const event = JSON.parse(message.value?.toString() || '{}')
        
        switch (topic) {
          case 'learning.events.v1':
            await AnalyticsProcessor.processLearningEvent(event)
            break
          case 'content.events.v1':
            // Process content events for analytics
            break
          case 'engagement.events.v1':
            // Process engagement events
            break
        }
      } catch (error) {
        app.log.error({ error, topic, partition }, 'Failed to process Kafka message')
      }
    }
  })
}

// Routes
app.get('/health', async () => ({ 
  status: 'ok',
  timestamp: new Date().toISOString(),
  database: 'connected',
  redis: redis ? 'connected' : 'disconnected',
  kafka: kafka ? 'connected' : 'disconnected',
  elasticsearch: es ? 'connected' : 'disconnected'
}))

// Prometheus metrics endpoint
app.get('/metrics', async (req, reply) => {
  reply.header('Content-Type', registry.contentType)
  return registry.metrics()
})

// Process learning event (for direct API calls)
app.post('/events/learning', {
  preHandler: [authenticate]
}, async (request, reply) => {
  try {
    const event = LearningEventSchema.parse(request.body)
    await AnalyticsProcessor.processLearningEvent(event)
    reply.code(202).send({ message: 'Event processed successfully' })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: 'Validation error', details: error.errors })
    }
    
    app.log.error(error, 'Learning event processing error')
    reply.code(500).send({ error: 'Internal server error' })
  }
})

// Analytics query endpoint
app.post('/query', {
  preHandler: [authenticate]
}, async (request, reply) => {
  try {
    const query = AnalyticsQuerySchema.parse(request.body)
    
    const startDate = new Date(query.timeRange.start)
    const endDate = new Date(query.timeRange.end)
    
    const metrics = await prisma.metricAggregation.findMany({
      where: {
        metricName: { in: query.metrics },
        windowStart: { gte: startDate },
        windowEnd: { lte: endDate }
      },
      orderBy: { windowStart: 'asc' },
      take: query.limit
    })
    
    reply.send({ metrics, query })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: 'Validation error', details: error.errors })
    }
    
    app.log.error(error, 'Analytics query error')
    reply.code(500).send({ error: 'Internal server error' })
  }
})

// User behavior profile endpoint
app.get('/user/:userId/behavior', {
  preHandler: [authenticate]
}, async (request: any, reply) => {
  try {
    const { userId } = request.params
    
    const profile = await prisma.userBehaviorProfile.findUnique({
      where: { userId }
    })
    
    if (!profile) {
      return reply.code(404).send({ error: 'User behavior profile not found' })
    }
    
    reply.send(profile)
  } catch (error) {
    app.log.error(error, 'User behavior profile error')
    reply.code(500).send({ error: 'Internal server error' })
  }
})

// Predictions endpoint
app.post('/predictions', {
  preHandler: [authenticate]
}, async (request, reply) => {
  try {
    const data = PredictionRequestSchema.parse(request.body)
    
    const result = await MLPredictionEngine.makePrediction(data.modelName, data.features)
    
    // Store prediction for validation
    const predictionId = randomUUID()
    await prisma.prediction.create({
      data: {
        modelName: data.modelName,
        predictionId,
        entityType: data.entityType,
        entityId: data.entityId,
        prediction: result.prediction,
        confidence: result.confidence,
        features: data.features,
        contextData: data.contextData
      }
    })
    
    reply.send({
      predictionId,
      prediction: result.prediction,
      confidence: result.confidence,
      modelVersion: result.modelVersion
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: 'Validation error', details: error.errors })
    }
    
    app.log.error(error, 'Prediction error')
    reply.code(500).send({ error: 'Internal server error' })
  }
})

// Alerts endpoint
app.get('/alerts', {
  preHandler: [authenticate]
}, async (request, reply) => {
  try {
    const { status = 'ACTIVE', severity, limit = 50 } = request.query as any
    
    const where: any = { status }
    if (severity) where.severity = severity
    
    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    })
    
    reply.send({ alerts })
  } catch (error) {
    app.log.error(error, 'Alerts error')
    reply.code(500).send({ error: 'Internal server error' })
  }
})

// Concept analytics endpoint
app.get('/concepts/:conceptKey/analytics', {
  preHandler: [authenticate]
}, async (request: any, reply) => {
  try {
    const { conceptKey } = request.params
    const { period = 'daily', days = 30 } = request.query
    
    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000)
    
    const analytics = await prisma.conceptAnalytics.findMany({
      where: {
        conceptKey,
        period,
        periodStart: { gte: startDate }
      },
      orderBy: { periodStart: 'asc' }
    })
    
    reply.send({ analytics })
  } catch (error) {
    app.log.error(error, 'Concept analytics error')
    reply.code(500).send({ error: 'Internal server error' })
  }
})

// Dashboards
app.get('/dashboards', {
  preHandler: [authenticate]
}, async (request: any, reply) => {
  try {
    const dashboards = await prisma.dashboard.findMany({
      where: {
        OR: [
          { isPublic: true },
          { createdBy: request.user.userId },
          { sharedWith: { has: request.user.userId } }
        ]
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isPublic: true,
        createdBy: true,
        viewCount: true,
        lastViewed: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' }
    })
    
    reply.send({ dashboards })
  } catch (error) {
    app.log.error(error, 'Dashboards error')
    reply.code(500).send({ error: 'Internal server error' })
  }
})

// Get dashboard by slug
app.get('/dashboards/:slug', {
  preHandler: [authenticate]
}, async (request: any, reply) => {
  try {
    const { slug } = request.params
    
    const dashboard = await prisma.dashboard.findUnique({
      where: { slug },
    })
    
    if (!dashboard) {
      return reply.code(404).send({ error: 'Dashboard not found' })
    }
    
    // Check access permissions
    if (!dashboard.isPublic && 
        dashboard.createdBy !== request.user.userId && 
        !dashboard.sharedWith.includes(request.user.userId)) {
      return reply.code(403).send({ error: 'Access denied' })
    }
    
    // Update view count
    await prisma.dashboard.update({
      where: { id: dashboard.id },
      data: {
        viewCount: { increment: 1 },
        lastViewed: new Date()
      }
    })
    
    reply.send(dashboard)
  } catch (error) {
    app.log.error(error, 'Dashboard error')
    reply.code(500).send({ error: 'Internal server error' })
  }
})

// Real-time metrics stream
app.get('/stream/metrics', {
  preHandler: [authenticate]
}, async (request: any, reply) => {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  })
  
  const sendMetrics = async () => {
    try {
      const activeAlerts = await prisma.alert.count({
        where: { status: 'ACTIVE' }
      })
      
      const recentEvents = await prisma.learningEventStream.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
          }
        }
      })
      
      const data = JSON.stringify({
        timestamp: new Date().toISOString(),
        activeAlerts,
        recentEvents,
        systemStatus: 'healthy'
      })
      
      reply.raw.write(`data: ${data}\n\n`)
    } catch (error) {
      app.log.error(error, 'Metrics stream error')
    }
  }
  
  // Send initial metrics
  await sendMetrics()
  
  // Send metrics every 10 seconds
  const interval = setInterval(sendMetrics, 10000)
  
  // Cleanup on disconnect
  request.raw.on('close', () => {
    clearInterval(interval)
  })
})

// Graceful shutdown
process.on('SIGINT', async () => {
  app.log.info('Shutting down gracefully...')
  
  if (kafka) {
    await kafka.consumer({ groupId: 'analytics-service' }).disconnect()
  }
  
  await prisma.$disconnect()
  if (redis) await redis.disconnect()
  process.exit(0)
})

app.listen({ port: env.PORT || 3004, host: '0.0.0.0' })
  .then(() => app.log.info(`analytics-svc listening on ${env.PORT || 3004}`))
  .catch((err) => { app.log.error(err); process.exit(1) })
