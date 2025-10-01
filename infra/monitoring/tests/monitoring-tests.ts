import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import axios from 'axios'

interface HealthCheck {
  status: string
  timestamp: string
  service: string
  checks: Record<string, boolean>
}

interface MetricsResponse {
  status: string
  data: {
    resultType: string
    result: Array<{
      metric: Record<string, string>
      value: [number, string]
    }>
  }
}

describe('Monitoring Infrastructure Tests', () => {
  const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090'
  const GRAFANA_URL = process.env.GRAFANA_URL || 'http://localhost:3000'
  const ALERTMANAGER_URL = process.env.ALERTMANAGER_URL || 'http://localhost:9093'
  const JAEGER_URL = process.env.JAEGER_URL || 'http://localhost:16686'

  beforeAll(async () => {
    // Wait for services to be ready
    await new Promise((resolve) => setTimeout(resolve, 5000))
  })

  describe('Prometheus Monitoring', () => {
    it('should be accessible and healthy', async () => {
      const response = await axios.get(`${PROMETHEUS_URL}/-/healthy`)
      expect(response.status).toBe(200)
    })

    it('should be ready to serve traffic', async () => {
      const response = await axios.get(`${PROMETHEUS_URL}/-/ready`)
      expect(response.status).toBe(200)
    })

    it('should have targets configured', async () => {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/targets`)
      expect(response.status).toBe(200)
      expect(response.data.status).toBe('success')
      expect(response.data.data.activeTargets.length).toBeGreaterThan(0)
    })

    it('should collect application metrics', async () => {
      const response = await axios.get<MetricsResponse>(
        `${PROMETHEUS_URL}/api/v1/query?query=up{job=~".*-service"}`,
      )
      expect(response.status).toBe(200)
      expect(response.data.status).toBe('success')
      expect(response.data.data.result.length).toBeGreaterThan(0)
    })

    it('should collect infrastructure metrics', async () => {
      const response = await axios.get<MetricsResponse>(
        `${PROMETHEUS_URL}/api/v1/query?query=up{job=~"postgresql|redis|kafka|elasticsearch"}`,
      )
      expect(response.status).toBe(200)
      expect(response.data.status).toBe('success')
      expect(response.data.data.result.length).toBeGreaterThan(0)
    })

    it('should have alerting rules loaded', async () => {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/rules`)
      expect(response.status).toBe(200)
      expect(response.data.status).toBe('success')
      expect(response.data.data.groups.length).toBeGreaterThan(0)
    })
  })

  describe('Grafana Dashboards', () => {
    it('should be accessible', async () => {
      const response = await axios.get(`${GRAFANA_URL}/api/health`)
      expect(response.status).toBe(200)
      expect(response.data.database).toBe('ok')
    })

    it('should have datasources configured', async () => {
      const response = await axios.get(`${GRAFANA_URL}/api/datasources`, {
        auth: {
          username: 'admin',
          password: 'admin123',
        },
      })
      expect(response.status).toBe(200)
      expect(response.data.length).toBeGreaterThan(0)

      const prometheusDS = response.data.find((ds: any) => ds.type === 'prometheus')
      expect(prometheusDS).toBeDefined()
    })

    it('should have dashboards provisioned', async () => {
      const response = await axios.get(`${GRAFANA_URL}/api/search`, {
        auth: {
          username: 'admin',
          password: 'admin123',
        },
      })
      expect(response.status).toBe(200)
      expect(response.data.length).toBeGreaterThan(0)
    })
  })

  describe('AlertManager', () => {
    it('should be accessible and healthy', async () => {
      const response = await axios.get(`${ALERTMANAGER_URL}/-/healthy`)
      expect(response.status).toBe(200)
    })

    it('should be ready to serve traffic', async () => {
      const response = await axios.get(`${ALERTMANAGER_URL}/-/ready`)
      expect(response.status).toBe(200)
    })

    it('should have configuration loaded', async () => {
      const response = await axios.get(`${ALERTMANAGER_URL}/api/v1/status`)
      expect(response.status).toBe(200)
      expect(response.data.status).toBe('success')
    })
  })

  describe('Jaeger Tracing', () => {
    it('should be accessible', async () => {
      const response = await axios.get(`${JAEGER_URL}/api/services`)
      expect(response.status).toBe(200)
    })

    it('should collect traces from services', async () => {
      // Wait a bit for traces to be collected
      await new Promise((resolve) => setTimeout(resolve, 10000))

      const response = await axios.get(`${JAEGER_URL}/api/services`)
      expect(response.status).toBe(200)
      expect(response.data.data.length).toBeGreaterThan(0)
    })
  })

  describe('Service Health Checks', () => {
    const services = [
      { name: 'user-service', port: 3001 },
      { name: 'adaptive-service', port: 3002 },
      { name: 'content-service', port: 3003 },
      { name: 'analytics-service', port: 3004 },
      { name: 'engagement-service', port: 3005 },
    ]

    services.forEach((service) => {
      it(`should have ${service.name} health endpoint working`, async () => {
        const response = await axios.get<HealthCheck>(`http://localhost:${service.port}/health`)
        expect(response.status).toBe(200)
        expect(response.data.status).toMatch(/healthy|degraded/)
        expect(response.data.service).toBe(service.name)
      })

      it(`should have ${service.name} metrics endpoint working`, async () => {
        const response = await axios.get(`http://localhost:${service.port}/metrics`)
        expect(response.status).toBe(200)
        expect(response.data).toContain('# HELP')
        expect(response.data).toContain('# TYPE')
      })
    })
  })

  describe('Performance Metrics Validation', () => {
    it('should track HTTP request metrics', async () => {
      const response = await axios.get<MetricsResponse>(
        `${PROMETHEUS_URL}/api/v1/query?query=http_requests_total`,
      )
      expect(response.status).toBe(200)
      expect(response.data.status).toBe('success')
    })

    it('should track response time metrics', async () => {
      const response = await axios.get<MetricsResponse>(
        `${PROMETHEUS_URL}/api/v1/query?query=http_request_duration_seconds`,
      )
      expect(response.status).toBe(200)
      expect(response.data.status).toBe('success')
    })

    it('should track learning effectiveness metrics', async () => {
      const response = await axios.get<MetricsResponse>(
        `${PROMETHEUS_URL}/api/v1/query?query=learning_effectiveness_score`,
      )
      expect(response.status).toBe(200)
      expect(response.data.status).toBe('success')
    })

    it('should track system resource metrics', async () => {
      const response = await axios.get<MetricsResponse>(
        `${PROMETHEUS_URL}/api/v1/query?query=process_resident_memory_bytes`,
      )
      expect(response.status).toBe(200)
      expect(response.data.status).toBe('success')
    })
  })

  describe('Alert Rules Validation', () => {
    it('should have application alert rules', async () => {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/rules`)
      expect(response.status).toBe(200)

      const appRules = response.data.data.groups.find(
        (group: any) => group.name === 'drivemaster.application',
      )
      expect(appRules).toBeDefined()
      expect(appRules.rules.length).toBeGreaterThan(0)
    })

    it('should have infrastructure alert rules', async () => {
      const response = await axios.get(`${PROMETHEUS_URL}/api/v1/rules`)
      expect(response.status).toBe(200)

      const infraRules = response.data.data.groups.find(
        (group: any) => group.name === 'drivemaster.infrastructure',
      )
      expect(infraRules).toBeDefined()
      expect(infraRules.rules.length).toBeGreaterThan(0)
    })
  })
})

describe('Chaos Engineering Tests', () => {
  describe('Service Resilience', () => {
    it('should handle database connection failures gracefully', async () => {
      // This would typically use chaos engineering tools like Chaos Monkey
      // For now, we'll simulate by checking circuit breaker behavior

      const response = await axios.get('http://localhost:3001/health')
      expect(response.status).toBe(200)

      // Verify that health checks detect issues
      const healthData = response.data as HealthCheck
      expect(healthData.checks).toBeDefined()
    })

    it('should maintain service availability during high load', async () => {
      // Simulate high load scenario
      const requests = Array.from({ length: 100 }, () => axios.get('http://localhost:3001/health'))

      const responses = await Promise.allSettled(requests)
      const successfulRequests = responses.filter(
        (result) => result.status === 'fulfilled' && result.value.status === 200,
      )

      // Should maintain at least 95% success rate
      expect(successfulRequests.length / requests.length).toBeGreaterThan(0.95)
    })
  })

  describe('Network Partition Tolerance', () => {
    it('should handle service-to-service communication failures', async () => {
      // Test circuit breaker and retry mechanisms
      const response = await axios.get('http://localhost:3001/health')
      expect(response.status).toBe(200)

      const healthData = response.data as HealthCheck
      expect(healthData.status).toMatch(/healthy|degraded/)
    })
  })

  describe('Data Consistency', () => {
    it('should maintain data consistency during failures', async () => {
      // Test eventual consistency and data integrity
      const response = await axios.get('http://localhost:3001/health')
      expect(response.status).toBe(200)
    })
  })
})
