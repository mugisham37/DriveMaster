import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client'
import type {
  TelemetryConfig,
  MetricLabels,
  LearningMetrics,
  SystemMetrics,
  BusinessMetrics,
} from './types'

export class MetricsCollector {
  private static instance: MetricsCollector
  private config: TelemetryConfig

  // HTTP Metrics
  public readonly httpRequestsTotal: Counter<string>
  public readonly httpRequestDuration: Histogram<string>
  public readonly httpRequestsInFlight: Gauge<string>

  // Learning Metrics
  public readonly learningEffectiveness: Gauge<string>
  public readonly sessionDuration: Histogram<string>
  public readonly questionsAnswered: Counter<string>
  public readonly questionsCorrect: Counter<string>
  public readonly dropoutRisk: Gauge<string>
  public readonly engagementScore: Gauge<string>

  // System Metrics
  public readonly cpuUsage: Gauge<string>
  public readonly memoryUsage: Gauge<string>
  public readonly diskUsage: Gauge<string>
  public readonly activeConnections: Gauge<string>

  // Business Metrics
  public readonly activeUsers: Gauge<string>
  public readonly learningSessions: Counter<string>
  public readonly contentInteractions: Counter<string>
  public readonly notificationEffectiveness: Gauge<string>
  public readonly userRetentionRate: Gauge<string>

  // Algorithm Metrics
  public readonly bktKnowledgeProbability: Gauge<string>
  public readonly banditExplorationRate: Gauge<string>
  public readonly spacedRepetitionRetention: Gauge<string>

  private constructor(config: TelemetryConfig) {
    this.config = config

    // Initialize HTTP metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status', 'service'],
      registers: [register],
    })

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'service'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
      registers: [register],
    })

    this.httpRequestsInFlight = new Gauge({
      name: 'http_requests_in_flight',
      help: 'Number of HTTP requests currently being processed',
      labelNames: ['service'],
      registers: [register],
    })

    // Initialize learning metrics
    this.learningEffectiveness = new Gauge({
      name: 'learning_effectiveness_score',
      help: 'Learning effectiveness score (0-1)',
      labelNames: ['user_id', 'service'],
      registers: [register],
    })

    this.sessionDuration = new Histogram({
      name: 'user_session_duration_seconds',
      help: 'User session duration in seconds',
      labelNames: ['user_id', 'service'],
      buckets: [60, 300, 600, 1200, 1800, 3600, 7200],
      registers: [register],
    })

    this.questionsAnswered = new Counter({
      name: 'questions_answered_total',
      help: 'Total number of questions answered',
      labelNames: ['category', 'difficulty', 'user_id', 'service'],
      registers: [register],
    })

    this.questionsCorrect = new Counter({
      name: 'questions_correct_total',
      help: 'Total number of questions answered correctly',
      labelNames: ['category', 'difficulty', 'user_id', 'service'],
      registers: [register],
    })

    this.dropoutRisk = new Gauge({
      name: 'dropout_risk_score',
      help: 'User dropout risk score (0-1)',
      labelNames: ['user_id', 'service'],
      registers: [register],
    })

    this.engagementScore = new Gauge({
      name: 'user_engagement_score',
      help: 'User engagement score (0-1)',
      labelNames: ['user_id', 'service'],
      registers: [register],
    })

    // Initialize system metrics
    this.cpuUsage = new Gauge({
      name: 'system_cpu_usage_percent',
      help: 'System CPU usage percentage',
      labelNames: ['service'],
      registers: [register],
    })

    this.memoryUsage = new Gauge({
      name: 'system_memory_usage_bytes',
      help: 'System memory usage in bytes',
      labelNames: ['service'],
      registers: [register],
    })

    this.diskUsage = new Gauge({
      name: 'system_disk_usage_percent',
      help: 'System disk usage percentage',
      labelNames: ['service'],
      registers: [register],
    })

    this.activeConnections = new Gauge({
      name: 'active_connections_total',
      help: 'Number of active connections',
      labelNames: ['service', 'type'],
      registers: [register],
    })

    // Initialize business metrics
    this.activeUsers = new Gauge({
      name: 'active_users_total',
      help: 'Number of active users',
      labelNames: ['service'],
      registers: [register],
    })

    this.learningSessions = new Counter({
      name: 'learning_sessions_total',
      help: 'Total number of learning sessions',
      labelNames: ['service'],
      registers: [register],
    })

    this.contentInteractions = new Counter({
      name: 'content_interactions_total',
      help: 'Total number of content interactions',
      labelNames: ['content_id', 'interaction_type', 'service'],
      registers: [register],
    })

    this.notificationEffectiveness = new Gauge({
      name: 'notification_effectiveness_rate',
      help: 'Notification click-through rate',
      labelNames: ['notification_type', 'service'],
      registers: [register],
    })

    this.userRetentionRate = new Gauge({
      name: 'user_retention_rate',
      help: 'User retention rate over time periods',
      labelNames: ['period', 'service'],
      registers: [register],
    })

    // Initialize algorithm metrics
    this.bktKnowledgeProbability = new Gauge({
      name: 'bkt_knowledge_probability',
      help: 'Bayesian Knowledge Tracing probability',
      labelNames: ['user_id', 'concept_id', 'service'],
      registers: [register],
    })

    this.banditExplorationRate = new Gauge({
      name: 'bandit_exploration_rate',
      help: 'Multi-armed bandit exploration rate',
      labelNames: ['service'],
      registers: [register],
    })

    this.spacedRepetitionRetention = new Gauge({
      name: 'spaced_repetition_retention_rate',
      help: 'Spaced repetition retention rate',
      labelNames: ['user_id', 'service'],
      registers: [register],
    })

    // Collect default Node.js metrics
    collectDefaultMetrics({ register, prefix: `${config.serviceName}_` })
  }

  public static getInstance(config?: TelemetryConfig): MetricsCollector {
    if (!MetricsCollector.instance) {
      if (!config) {
        throw new Error('MetricsCollector must be initialized with config')
      }
      MetricsCollector.instance = new MetricsCollector(config)
    }
    return MetricsCollector.instance
  }

  public recordHttpRequest(method: string, route: string, status: number, duration: number): void {
    const labels = {
      method,
      route,
      status: status.toString(),
      service: this.config.serviceName,
    }

    this.httpRequestsTotal.inc(labels)
    this.httpRequestDuration.observe({ method, route, service: this.config.serviceName }, duration)
  }

  public recordLearningMetrics(userId: string, metrics: LearningMetrics): void {
    const serviceLabel = { service: this.config.serviceName }
    const userServiceLabel = { user_id: userId, service: this.config.serviceName }

    this.learningEffectiveness.set(userServiceLabel, metrics.effectiveness_score)
    this.sessionDuration.observe(userServiceLabel, metrics.session_duration)
    this.dropoutRisk.set(userServiceLabel, metrics.dropout_risk)
    this.engagementScore.set(userServiceLabel, metrics.engagement_score)
  }

  public recordSystemMetrics(metrics: SystemMetrics): void {
    const labels = { service: this.config.serviceName }

    this.cpuUsage.set(labels, metrics.cpu_usage)
    this.memoryUsage.set(labels, metrics.memory_usage)
    this.diskUsage.set(labels, metrics.disk_usage)
  }

  public recordBusinessMetrics(metrics: BusinessMetrics): void {
    const labels = { service: this.config.serviceName }

    this.activeUsers.set(labels, metrics.active_users)
    this.notificationEffectiveness.set(
      { notification_type: 'all', ...labels },
      metrics.notification_effectiveness,
    )
    this.userRetentionRate.set({ period: '7d', ...labels }, metrics.user_retention_rate)
  }

  public getMetricsEndpoint() {
    return async () => {
      return register.metrics()
    }
  }

  public clearMetrics(): void {
    register.clear()
  }
}
