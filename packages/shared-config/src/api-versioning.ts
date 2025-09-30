import { FastifyRequest, FastifyReply } from 'fastify'

export interface ApiVersion {
  version: string
  deprecated?: boolean
  deprecationDate?: Date
  sunsetDate?: Date
  supportedUntil?: Date
}

export interface VersionConfig {
  current: string
  supported: ApiVersion[]
  defaultVersion: string
  headerName: string
  queryParamName: string
}

export interface VersionedEndpoint {
  path: string
  method: string
  versions: {
    [version: string]: {
      handler: Function
      schema?: any
      deprecated?: boolean
      transformRequest?: (request: any) => any
      transformResponse?: (response: any) => any
    }
  }
}

export class ApiVersionManager {
  private config: VersionConfig
  private endpoints: Map<string, VersionedEndpoint> = new Map()

  constructor(config: VersionConfig) {
    this.config = config
  }

  /**
   * Register a versioned endpoint
   */
  registerEndpoint(endpoint: VersionedEndpoint): void {
    const key = `${endpoint.method}:${endpoint.path}`
    this.endpoints.set(key, endpoint)
  }

  /**
   * Middleware to handle API versioning
   */
  middleware() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const requestedVersion = this.extractVersion(request)
      const resolvedVersion = this.resolveVersion(requestedVersion)

      // Add version info to request context
      ;(request as any).apiVersion = resolvedVersion

      // Add version headers to response
      reply.header('API-Version', resolvedVersion)
      reply.header('API-Supported-Versions', this.getSupportedVersions().join(', '))

      // Check if version is deprecated
      const versionInfo = this.getVersionInfo(resolvedVersion)
      if (versionInfo?.deprecated) {
        reply.header('API-Deprecation', 'true')
        if (versionInfo.sunsetDate) {
          reply.header('API-Sunset', versionInfo.sunsetDate.toISOString())
        }
        reply.header('Warning', `299 - "API version ${resolvedVersion} is deprecated"`)
      }

      // Find and execute versioned handler
      const endpointKey = `${request.method}:${request.routerPath}`
      const endpoint = this.endpoints.get(endpointKey)

      if (endpoint && endpoint.versions[resolvedVersion]) {
        const versionHandler = endpoint.versions[resolvedVersion]

        // Transform request if needed
        if (versionHandler.transformRequest) {
          request.body = versionHandler.transformRequest(request.body)
        }

        // Store original send method for response transformation
        if (versionHandler.transformResponse) {
          const originalSend = reply.send.bind(reply)
          reply.send = function (payload: any) {
            const transformedPayload = versionHandler.transformResponse(payload)
            return originalSend(transformedPayload)
          }
        }
      }
    }
  }

  /**
   * Extract version from request
   */
  private extractVersion(request: FastifyRequest): string | null {
    // Check header first
    const headerVersion = request.headers[this.config.headerName.toLowerCase()] as string
    if (headerVersion) {
      return this.normalizeVersion(headerVersion)
    }

    // Check query parameter
    const queryVersion = (request.query as any)[this.config.queryParamName]
    if (queryVersion) {
      return this.normalizeVersion(queryVersion)
    }

    // Check URL path (e.g., /api/v1/users)
    const pathMatch = request.url.match(/\/api\/v(\d+(?:\.\d+)?)/)
    if (pathMatch) {
      return `v${pathMatch[1]}`
    }

    return null
  }

  /**
   * Resolve version to a supported version
   */
  private resolveVersion(requestedVersion: string | null): string {
    if (!requestedVersion) {
      return this.config.defaultVersion
    }

    // Check if exact version is supported
    if (this.isVersionSupported(requestedVersion)) {
      return requestedVersion
    }

    // Try to find compatible version (backward compatibility)
    const compatibleVersion = this.findCompatibleVersion(requestedVersion)
    if (compatibleVersion) {
      return compatibleVersion
    }

    // Fall back to default version
    return this.config.defaultVersion
  }

  /**
   * Check if version is supported
   */
  private isVersionSupported(version: string): boolean {
    return this.config.supported.some((v) => v.version === version)
  }

  /**
   * Find compatible version for backward compatibility
   */
  private findCompatibleVersion(requestedVersion: string): string | null {
    const requestedMajor = this.extractMajorVersion(requestedVersion)

    // Find the latest version with the same major version
    const compatibleVersions = this.config.supported
      .filter((v) => this.extractMajorVersion(v.version) === requestedMajor)
      .sort((a, b) => this.compareVersions(b.version, a.version))

    return compatibleVersions.length > 0 ? compatibleVersions[0].version : null
  }

  /**
   * Get version information
   */
  private getVersionInfo(version: string): ApiVersion | undefined {
    return this.config.supported.find((v) => v.version === version)
  }

  /**
   * Get list of supported versions
   */
  private getSupportedVersions(): string[] {
    return this.config.supported.map((v) => v.version)
  }

  /**
   * Normalize version string
   */
  private normalizeVersion(version: string): string {
    // Remove 'v' prefix if present and add it back consistently
    const cleanVersion = version.replace(/^v/i, '')
    return `v${cleanVersion}`
  }

  /**
   * Extract major version number
   */
  private extractMajorVersion(version: string): number {
    const match = version.match(/v?(\d+)/)
    return match ? parseInt(match[1], 10) : 0
  }

  /**
   * Compare version strings
   */
  private compareVersions(a: string, b: string): number {
    const aParts = a.replace(/^v/, '').split('.').map(Number)
    const bParts = b.replace(/^v/, '').split('.').map(Number)

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0
      const bPart = bParts[i] || 0

      if (aPart > bPart) return 1
      if (aPart < bPart) return -1
    }

    return 0
  }

  /**
   * Create version-specific route handler
   */
  createVersionedHandler(versions: { [version: string]: Function }) {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const version = (request as any).apiVersion || this.config.defaultVersion
      const handler = versions[version]

      if (!handler) {
        reply.code(400)
        return {
          error: 'Unsupported API version',
          requestedVersion: version,
          supportedVersions: this.getSupportedVersions(),
        }
      }

      return handler(request, reply)
    }
  }

  /**
   * Generate API documentation for all versions
   */
  generateApiDocs(): any {
    const docs: any = {
      info: {
        title: 'DriveMaster API',
        description: 'Adaptive driving test learning platform API',
        currentVersion: this.config.current,
        defaultVersion: this.config.defaultVersion,
      },
      versions: {},
    }

    for (const version of this.config.supported) {
      docs.versions[version.version] = {
        version: version.version,
        deprecated: version.deprecated || false,
        deprecationDate: version.deprecationDate?.toISOString(),
        sunsetDate: version.sunsetDate?.toISOString(),
        supportedUntil: version.supportedUntil?.toISOString(),
        endpoints: this.getEndpointsForVersion(version.version),
      }
    }

    return docs
  }

  /**
   * Get endpoints for specific version
   */
  private getEndpointsForVersion(version: string): any[] {
    const endpoints: any[] = []

    for (const [key, endpoint] of this.endpoints) {
      if (endpoint.versions[version]) {
        const versionHandler = endpoint.versions[version]
        endpoints.push({
          path: endpoint.path,
          method: endpoint.method,
          deprecated: versionHandler.deprecated || false,
          schema: versionHandler.schema,
        })
      }
    }

    return endpoints
  }
}

// Request/Response transformation utilities
export class VersionTransformers {
  /**
   * Transform v1 user response to v2 format
   */
  static transformUserV1ToV2(user: any): any {
    return {
      ...user,
      profile: {
        cognitivePatterns: user.cognitivePatterns,
        learningPreferences: user.learningPreferences,
      },
      // Remove deprecated fields
      cognitivePatterns: undefined,
      learningPreferences: undefined,
    }
  }

  /**
   * Transform v2 user request to v1 format
   */
  static transformUserV2ToV1(user: any): any {
    return {
      ...user,
      cognitivePatterns: user.profile?.cognitivePatterns,
      learningPreferences: user.profile?.learningPreferences,
      // Remove new fields
      profile: undefined,
    }
  }

  /**
   * Transform v1 learning event to v2 format
   */
  static transformLearningEventV1ToV2(event: any): any {
    return {
      ...event,
      metadata: {
        responseData: event.responseData,
        contextData: event.contextData,
      },
      // Remove deprecated fields
      responseData: undefined,
      contextData: undefined,
    }
  }

  /**
   * Transform paginated response format
   */
  static transformPaginationV1ToV2(response: any): any {
    return {
      data: response.items,
      pagination: {
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: Math.ceil(response.total / response.limit),
        hasNext: response.page * response.limit < response.total,
        hasPrev: response.page > 1,
      },
      // Remove old format
      items: undefined,
      page: undefined,
      limit: undefined,
      total: undefined,
    }
  }
}

// Factory function for creating API version manager
export function createApiVersionManager(): ApiVersionManager {
  const config: VersionConfig = {
    current: 'v2',
    defaultVersion: 'v2',
    headerName: 'API-Version',
    queryParamName: 'version',
    supported: [
      {
        version: 'v1',
        deprecated: true,
        deprecationDate: new Date('2024-01-01'),
        sunsetDate: new Date('2024-12-31'),
        supportedUntil: new Date('2024-12-31'),
      },
      {
        version: 'v2',
        deprecated: false,
      },
    ],
  }

  return new ApiVersionManager(config)
}
