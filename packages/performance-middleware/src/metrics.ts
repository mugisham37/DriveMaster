import { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import client from 'prom-client'
import { RequestMetrics } from './types'

export interface MetricsOptions {
  collectDefaultMetrics?: boolean
  prefix?: string
  endpoint?: string
}

const metricsPlugin: FastifyPluginAsync<MetricsOptions> = async (fastify, options) => {
  const config = {
    collectDefaultMetrics: options.collectDefaultMetrics !== false,
    prefix: options.prefix || 'drivemaster_',
    endpoint: options.endpoint || '/metrics',
  }

  // Collect default metrics
  if (config.collectDefaultMetrics) {
    client.collectDefaultMetrics({ prefix: config.prefix })
  }

  // Custom metrics
  const httpRequestsTotal = new client.Counter({
    name: `${config.prefix}http_requests_total`,
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'service'],
  })

  const httpRequestDuration = new client.Histogram({
    name: `${config.prefix}http_request_duration_seconds`,
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code', 'service'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
  })

  const httpRequestsInFlight = new client.Gauge({
    name: `${config.prefix}http_requests_in_flight`,
    help: 'Number of HTTP requests currently being processed',
    labelNames: ['service'],
  })

  const httpResponseSize = new client.Histogram({
    name: `${config.prefix}http_response_size_bytes`,
    help: 'Size of HTTP responses in bytes',
    labelNames: ['method', 'route', 'status_code', 'service'],
    buckets: [100, 1000, 10000, 100000, 1000000],
  })

  const serviceName = process.env.SERVICE_NAME || 'unknown'

  // Request tracking
  fastify.addHook('onRequest', async (request) => {
    const metrics: RequestMetrics = {
      startTime: Date.now(),
      method: request.method,
      route: request.routerPath || request.url,
    }

    request.requestMetrics = metrics
    httpRequestsInFlight.inc({ service: serviceName })
  })

  fastify.addHook('onResponse', async (request, reply) => {
    const metrics = request.requestMetrics as RequestMetrics
    if (!metrics) return

    const responseTime = (Date.now() - metrics.startTime) / 1000
    const statusCode = reply.statusCode.toString()
    const contentLength = reply.getHeader('content-length') as string

    // Update metrics
    httpRequestsTotal.inc({
      method: metrics.method,
      route: metrics.route,
      status_code: statusCode,
      service: serviceName,
    })

    httpRequestDuration.observe(
      {
        method: metrics.method,
        route: metrics.route,
        status_code: statusCode,
        service: serviceName,
      },
      responseTime,
    )

    if (contentLength) {
      httpResponseSize.observe(
        {
          method: metrics.method,
          route: metrics.route,
          status_code: statusCode,
          service: serviceName,
        },
        parseInt(contentLength, 10),
      )
    }

    httpRequestsInFlight.dec({ service: serviceName })
  })

  // Metrics endpoint
  fastify.get(config.endpoint, async (request, reply) => {
    reply.type('text/plain')
    return client.register.metrics()
  })

  // Health check endpoint with metrics
  fastify.get('/health', async (request, reply) => {
    const metrics = await client.register.getMetricsAsJSON()

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: serviceName,
      metrics: {
        requests_total: httpRequestsTotal.get(),
        requests_in_flight: httpRequestsInFlight.get(),
      },
    }
  })

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    client.register.clear()
  })
}

// Extend FastifyRequest interface
declare module 'fastify' {
  interface FastifyRequest {
    requestMetrics?: RequestMetrics
  }
}

export { metricsPlugin }
export default fp(metricsPlugin, {
  fastify: '4.x',
  name: 'metrics-plugin',
})
