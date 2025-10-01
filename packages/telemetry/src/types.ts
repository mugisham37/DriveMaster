export interface TelemetryConfig {
  serviceName: string
  serviceVersion: string
  environment: string
  jaegerEndpoint?: string
  prometheusPort?: number
  lokiEndpoint?: string
  enableTracing?: boolean
  enableMetrics?: boolean
  enableLogging?: boolean
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: Date
  checks: Record<
    string,
    {
      status: boolean
      latency?: number
      error?: string
      metadata?: Record<string, any>
    }
  >
  metrics: Record<string, number>
}

export interface MetricLabels {
  [key: string]: string | number
}

export interface LearningMetrics {
  effectiveness_score: number
  session_duration: number
  questions_answered: number
  questions_correct: number
  dropout_risk: number
  engagement_score: number
}

export interface SystemMetrics {
  cpu_usage: number
  memory_usage: number
  disk_usage: number
  network_io: number
  active_connections: number
}

export interface BusinessMetrics {
  active_users: number
  learning_sessions: number
  content_interactions: number
  notification_effectiveness: number
  user_retention_rate: number
}
