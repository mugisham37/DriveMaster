import type { FastifyRequest, FastifyReply } from 'fastify'
import crypto from 'crypto'
import { z } from 'zod'
import { securityConfig } from '../config/security.config'
import EncryptionService from '../services/encryption.service'
import { ComplianceService } from '../services/compliance.service'

// Advanced threat detection patterns
const ADVANCED_XSS_PATTERNS = [
  // JavaScript execution patterns
  /javascript\s*:/gi,
  /vbscript\s*:/gi,
  /data\s*:\s*text\/html/gi,
  /data\s*:\s*application\/x-javascript/gi,

  // Event handler patterns
  /on\w+\s*=\s*['"]/gi,
  /on\w+\s*=\s*[^'">\s]+/gi,

  // Script tag variations
  /<\s*script[^>]*>/gi,
  /<\s*\/\s*script\s*>/gi,
  /&lt;\s*script/gi,
  /&#60;\s*script/gi,

  // Iframe and object patterns
  /<\s*iframe[^>]*>/gi,
  /<\s*object[^>]*>/gi,
  /<\s*embed[^>]*>/gi,
  /<\s*applet[^>]*>/gi,

  // Meta refresh and link patterns
  /<\s*meta[^>]*http-equiv\s*=\s*['"]\s*refresh/gi,
  /<\s*link[^>]*href\s*=\s*['"]\s*javascript/gi,

  // CSS expression patterns
  /expression\s*\(/gi,
  /-moz-binding\s*:/gi,
  /behavior\s*:/gi,
]

const ADVANCED_SQL_INJECTION_PATTERNS = [
  // Union-based injection
  /\bunion\b.*\bselect\b/gi,
  /\bselect\b.*\bunion\b/gi,

  // Boolean-based blind injection
  /\band\b\s+\d+\s*=\s*\d+/gi,
  /\bor\b\s+\d+\s*=\s*\d+/gi,
  /\band\b\s+['"]\w+['"]?\s*=\s*['"]\w+['"]?/gi,

  // Time-based blind injection
  /\bwaitfor\b\s+\bdelay\b/gi,
  /\bsleep\s*\(/gi,
  /\bbenchmark\s*\(/gi,

  // Error-based injection
  /\bconvert\s*\(/gi,
  /\bcast\s*\(/gi,
  /\bextractvalue\s*\(/gi,
  /\bupdatexml\s*\(/gi,

  // Stacked queries
  /;\s*\b(select|insert|update|delete|drop|create|alter)\b/gi,

  // Comment patterns
  /\/\*.*\*\//gi,
  /--\s*$/gm,
  /#.*$/gm,

  // Hex encoding patterns
  /0x[0-9a-f]+/gi,

  // Function calls
  /\b(concat|substring|ascii|char|length|database|version|user|system_user)\s*\(/gi,
]

const COMMAND_INJECTION_PATTERNS = [
  // Command separators
  /[;&|`$(){}[\]]/g,

  // Common commands
  /\b(cat|ls|dir|type|echo|ping|wget|curl|nc|netcat|telnet|ssh|ftp)\b/gi,

  // Path traversal
  /\.\.[\/\\]/g,
  /[\/\\]\.\.[\/\\]/g,

  // Environment variables
  /\$\w+/g,
  /%\w+%/g,
]

const LDAP_INJECTION_PATTERNS = [/[()&|!*]/g, /\\\*/g, /\\\(/g, /\\\)/g]

export interface SecurityThreat {
  type:
    | 'xss'
    | 'sql_injection'
    | 'command_injection'
    | 'ldap_injection'
    | 'path_traversal'
    | 'file_inclusion'
  severity: 'low' | 'medium' | 'high' | 'critical'
  pattern: string
  location: 'body' | 'query' | 'params' | 'headers'
  value: string
  description: string
}

export interface SecurityScanResult {
  threats: SecurityThreat[]
  riskScore: number
  blocked: boolean
  sanitized: any
}

export class AdvancedSecurityMiddleware {
  /**
   * Comprehensive threat detection middleware
   */
  static threatDetection() {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const scanResult = await this.scanForThreats(request)

      if (scanResult.blocked) {
        // Log security incident
        await this.logSecurityIncident(request, scanResult)

        // Block the request
        return reply.code(400).send({
          success: false,
          error: {
            code: 'SECURITY_THREAT_DETECTED',
            message: 'Request blocked due to security threat detection',
            severity: Math.max(...scanResult.threats.map((t) => this.getSeverityScore(t.severity))),
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
            threatCount: scanResult.threats.length,
          },
        })
      }

      // Replace request data with sanitized version
      if (scanResult.sanitized) {
        request.body = scanResult.sanitized.body || request.body
        request.query = scanResult.sanitized.query || request.query
        request.params = scanResult.sanitized.params || request.params
      }

      // Log non-blocking threats for monitoring
      if (scanResult.threats.length > 0) {
        request.log.warn(
          {
            threats: scanResult.threats,
            riskScore: scanResult.riskScore,
            ip: request.ip,
            userAgent: request.headers['user-agent'],
          },
          'Security threats detected but not blocked',
        )
      }
    }
  }

  /**
   * Advanced input sanitization
   */
  static advancedSanitization() {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      if (request.body) {
        request.body = this.deepSanitize(request.body)
      }

      if (request.query) {
        request.query = this.deepSanitize(request.query)
      }

      if (request.params) {
        request.params = this.deepSanitize(request.params)
      }
    }
  }

  /**
   * File upload security validation
   */
  static fileUploadSecurity() {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      if (request.isMultipart()) {
        const parts = request.parts()

        for await (const part of parts) {
          if (part.type === 'file') {
            const validationResult = await this.validateFileUpload(part)

            if (!validationResult.valid) {
              return reply.code(400).send({
                success: false,
                error: {
                  code: 'FILE_UPLOAD_SECURITY_VIOLATION',
                  message: validationResult.reason,
                },
                meta: {
                  timestamp: new Date().toISOString(),
                  requestId: request.id,
                },
              })
            }
          }
        }
      }
    }
  }

  /**
   * API key validation and rate limiting
   */
  static apiKeyValidation() {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const apiKey = request.headers['x-api-key'] as string

      if (!apiKey) {
        return reply.code(401).send({
          success: false,
          error: {
            code: 'API_KEY_MISSING',
            message: 'API key is required',
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      }

      const validationResult = await this.validateApiKey(apiKey, request.ip)

      if (!validationResult.valid) {
        return reply.code(401).send({
          success: false,
          error: {
            code: 'API_KEY_INVALID',
            message: validationResult.reason,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId: request.id,
          },
        })
      }

      // Add API key info to request context
      request.apiKey = validationResult.keyInfo
    }
  }

  /**
   * Honeypot trap for bot detection
   */
  static honeypotTrap() {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      // Check for honeypot field in forms
      if (request.body && typeof request.body === 'object') {
        const honeypotFields = ['website', 'url', 'homepage', 'link']

        for (const field of honeypotFields) {
          if (request.body[field] && request.body[field].trim() !== '') {
            // Bot detected - honeypot field was filled
            await this.logBotDetection(request, 'honeypot_filled')

            return reply.code(400).send({
              success: false,
              error: {
                code: 'BOT_DETECTED',
                message: 'Automated request detected',
              },
              meta: {
                timestamp: new Date().toISOString(),
                requestId: request.id,
              },
            })
          }
        }
      }
    }
  }

  /**
   * Behavioral analysis for anomaly detection
   */
  static behavioralAnalysis() {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const behaviorScore = await this.analyzeBehavior(request)

      if (behaviorScore.anomalyScore > 0.8) {
        request.log.warn(
          {
            behaviorScore,
            ip: request.ip,
            userAgent: request.headers['user-agent'],
            userId: request.user?.userId,
          },
          'Anomalous behavior detected',
        )

        // Increase rate limiting for suspicious behavior
        request.rateLimitMultiplier = 0.5 // Reduce allowed requests by 50%
      }

      // Store behavior data for learning
      await this.storeBehaviorData(request, behaviorScore)
    }
  }

  /**
   * Scan request for security threats
   */
  private static async scanForThreats(request: FastifyRequest): Promise<SecurityScanResult> {
    const threats: SecurityThreat[] = []
    const sanitized: any = {}

    // Scan body
    if (request.body) {
      const bodyThreats = this.scanData(request.body, 'body')
      threats.push(...bodyThreats)
      sanitized.body = this.sanitizeData(request.body)
    }

    // Scan query parameters
    if (request.query) {
      const queryThreats = this.scanData(request.query, 'query')
      threats.push(...queryThreats)
      sanitized.query = this.sanitizeData(request.query)
    }

    // Scan URL parameters
    if (request.params) {
      const paramThreats = this.scanData(request.params, 'params')
      threats.push(...paramThreats)
      sanitized.params = this.sanitizeData(request.params)
    }

    // Scan headers for suspicious patterns
    const headerThreats = this.scanHeaders(request.headers)
    threats.push(...headerThreats)

    // Calculate risk score
    const riskScore = this.calculateRiskScore(threats)

    // Determine if request should be blocked
    const blocked = riskScore >= 0.7 || threats.some((t) => t.severity === 'critical')

    return {
      threats,
      riskScore,
      blocked,
      sanitized: Object.keys(sanitized).length > 0 ? sanitized : null,
    }
  }

  /**
   * Scan data for various threat patterns
   */
  private static scanData(data: any, location: 'body' | 'query' | 'params'): SecurityThreat[] {
    const threats: SecurityThreat[] = []
    const dataString = JSON.stringify(data)

    // XSS detection
    for (const pattern of ADVANCED_XSS_PATTERNS) {
      const matches = dataString.match(pattern)
      if (matches) {
        threats.push({
          type: 'xss',
          severity: 'high',
          pattern: pattern.source,
          location,
          value: matches[0],
          description: 'Cross-site scripting (XSS) pattern detected',
        })
      }
    }

    // SQL injection detection
    for (const pattern of ADVANCED_SQL_INJECTION_PATTERNS) {
      const matches = dataString.match(pattern)
      if (matches) {
        threats.push({
          type: 'sql_injection',
          severity: 'critical',
          pattern: pattern.source,
          location,
          value: matches[0],
          description: 'SQL injection pattern detected',
        })
      }
    }

    // Command injection detection
    for (const pattern of COMMAND_INJECTION_PATTERNS) {
      const matches = dataString.match(pattern)
      if (matches) {
        threats.push({
          type: 'command_injection',
          severity: 'critical',
          pattern: pattern.source,
          location,
          value: matches[0],
          description: 'Command injection pattern detected',
        })
      }
    }

    // LDAP injection detection
    for (const pattern of LDAP_INJECTION_PATTERNS) {
      const matches = dataString.match(pattern)
      if (matches) {
        threats.push({
          type: 'ldap_injection',
          severity: 'medium',
          pattern: pattern.source,
          location,
          value: matches[0],
          description: 'LDAP injection pattern detected',
        })
      }
    }

    return threats
  }

  /**
   * Scan headers for suspicious patterns
   */
  private static scanHeaders(headers: Record<string, any>): SecurityThreat[] {
    const threats: SecurityThreat[] = []

    // Check User-Agent for suspicious patterns
    const userAgent = headers['user-agent']
    if (userAgent) {
      // Bot detection patterns
      const botPatterns = [
        /bot|crawler|spider|scraper/i,
        /curl|wget|python|java|perl/i,
        /scanner|exploit|attack/i,
      ]

      for (const pattern of botPatterns) {
        if (pattern.test(userAgent)) {
          threats.push({
            type: 'xss', // Using XSS as generic threat type
            severity: 'low',
            pattern: pattern.source,
            location: 'headers',
            value: userAgent,
            description: 'Suspicious User-Agent detected',
          })
        }
      }
    }

    // Check for suspicious headers
    const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'x-originating-ip']
    for (const header of suspiciousHeaders) {
      if (headers[header]) {
        const value = headers[header]
        if (typeof value === 'string' && this.containsSuspiciousPatterns(value)) {
          threats.push({
            type: 'xss',
            severity: 'medium',
            pattern: 'suspicious_header_value',
            location: 'headers',
            value,
            description: `Suspicious value in ${header} header`,
          })
        }
      }
    }

    return threats
  }

  /**
   * Deep sanitization of nested objects
   */
  private static deepSanitize(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj)
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepSanitize(item))
    }

    if (obj && typeof obj === 'object') {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.deepSanitize(value)
      }
      return sanitized
    }

    return obj
  }

  /**
   * Sanitize individual string values
   */
  private static sanitizeString(str: string): string {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/[<>'"&]/g, (match) => {
        const entities: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;',
        }
        return entities[match] || match
      })
  }

  /**
   * Sanitize data while preserving structure
   */
  private static sanitizeData(data: any): any {
    return this.deepSanitize(data)
  }

  /**
   * Calculate overall risk score
   */
  private static calculateRiskScore(threats: SecurityThreat[]): number {
    if (threats.length === 0) return 0

    const severityWeights = {
      low: 0.1,
      medium: 0.3,
      high: 0.6,
      critical: 1.0,
    }

    const totalScore = threats.reduce((sum, threat) => {
      return sum + severityWeights[threat.severity]
    }, 0)

    return Math.min(totalScore / threats.length, 1.0)
  }

  /**
   * Get numeric severity score
   */
  private static getSeverityScore(severity: SecurityThreat['severity']): number {
    const scores = { low: 1, medium: 2, high: 3, critical: 4 }
    return scores[severity]
  }

  /**
   * Log security incident
   */
  private static async logSecurityIncident(
    request: FastifyRequest,
    scanResult: SecurityScanResult,
  ): Promise<void> {
    const incident = {
      timestamp: new Date().toISOString(),
      requestId: request.id,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      userId: request.user?.userId,
      method: request.method,
      url: request.url,
      threats: scanResult.threats,
      riskScore: scanResult.riskScore,
      blocked: scanResult.blocked,
    }

    // Log to audit system
    await ComplianceService.logAuditEvent({
      userId: request.user?.userId || 'anonymous',
      action: 'security_threat_detected',
      resourceType: 'security_incident',
      resourceId: request.id,
      metadata: incident,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
    })

    request.log.error(incident, 'Security incident detected and blocked')
  }

  /**
   * Validate file upload security
   */
  private static async validateFileUpload(part: any): Promise<{ valid: boolean; reason?: string }> {
    // Check file size
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (part.file.bytesRead > maxSize) {
      return { valid: false, reason: 'File size exceeds maximum allowed size' }
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
    if (!allowedTypes.includes(part.mimetype)) {
      return { valid: false, reason: 'File type not allowed' }
    }

    // Check filename for suspicious patterns
    if (this.containsSuspiciousPatterns(part.filename)) {
      return { valid: false, reason: 'Suspicious filename detected' }
    }

    return { valid: true }
  }

  /**
   * Validate API key
   */
  private static async validateApiKey(
    apiKey: string,
    ip: string,
  ): Promise<{ valid: boolean; reason?: string; keyInfo?: any }> {
    // In production, this would validate against a database
    // For now, implement basic validation

    if (apiKey.length < 32) {
      return { valid: false, reason: 'Invalid API key format' }
    }

    // Check for rate limiting on this API key
    // This would be implemented with Redis in production

    return {
      valid: true,
      keyInfo: {
        keyId: crypto.createHash('sha256').update(apiKey).digest('hex').substring(0, 8),
        permissions: ['read', 'write'],
        rateLimit: 1000,
      },
    }
  }

  /**
   * Log bot detection
   */
  private static async logBotDetection(request: FastifyRequest, method: string): Promise<void> {
    await ComplianceService.logAuditEvent({
      userId: 'anonymous',
      action: 'bot_detected',
      resourceType: 'security_event',
      resourceId: request.id,
      metadata: {
        method,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        url: request.url,
      },
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] || 'unknown',
      timestamp: new Date(),
    })
  }

  /**
   * Analyze user behavior for anomalies
   */
  private static async analyzeBehavior(request: FastifyRequest): Promise<any> {
    // This would implement machine learning-based behavior analysis
    // For now, return a simple heuristic-based score

    const factors = {
      requestFrequency: 0.1, // Would be calculated from Redis
      userAgentConsistency: 0.1,
      geolocationConsistency: 0.1,
      timePatterns: 0.1,
    }

    const anomalyScore =
      Object.values(factors).reduce((sum, score) => sum + score, 0) / Object.keys(factors).length

    return {
      anomalyScore,
      factors,
      timestamp: new Date().toISOString(),
    }
  }

  /**
   * Store behavior data for machine learning
   */
  private static async storeBehaviorData(
    request: FastifyRequest,
    behaviorScore: any,
  ): Promise<void> {
    // In production, this would store data for ML model training
    // For now, just log it
    request.log.debug(
      {
        behaviorScore,
        userId: request.user?.userId,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      },
      'Behavior data collected',
    )
  }

  /**
   * Check if string contains suspicious patterns
   */
  private static containsSuspiciousPatterns(str: string): boolean {
    const suspiciousPatterns = [
      /\.\.[\/\\]/,
      /[;&|`$(){}[\]]/,
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
    ]

    return suspiciousPatterns.some((pattern) => pattern.test(str))
  }
}

// Extend FastifyRequest interface
declare module 'fastify' {
  interface FastifyRequest {
    apiKey?: any
    rateLimitMultiplier?: number
  }
}
