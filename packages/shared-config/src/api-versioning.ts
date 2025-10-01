import { FastifyRequest, FastifyReply } from 'fastify'

// Type definitions for better type safety
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

export interface RequestTransformer {
  (request: Record<string, unknown>): Record<string, unknown>
}

export interface ResponseTransformer {
  (response: Record<string, unknown>): Record<string, unknown>
}

export interface VersionHandler {
  handler: (request: FastifyRequest, reply: FastifyReply) => Promise<Record<string, unknown>>
  schema?: Record<string, unknown>
  deprecated?: boolean
  transformRequest?: RequestTransformer
  transformResponse?: ResponseTransformer
}

export interface VersionedEndpoint {
  path: string
  method: string
  versions: Record<string, VersionHandler>
}

export interface ExtendedFastifyRequest extends FastifyRequest {
  apiVersion?: string
}

export interface ApiDocumentation {
  info: {
    title: string
    description: string
    currentVersion: string
    defaultVersion: string
  }
  versions: Record<string, VersionDocumentation>
}

export interface VersionDocumentation {
  version: string
  deprecated: boolean
  deprecationDate?: string | undefined
  sunsetDate?: string | undefined
  supportedUntil?: string | undefined
  endpoints: EndpointDocumentation[]
}

export interface EndpointDocumentation {
  path: string
  method: string
  deprecated: boolean
  schema?: Record<string, unknown>
}

export interface ErrorResponse {
  error: string
  requestedVersion: string
  supportedVersions: string[]
}

export interface UserProfile {
  cognitivePatterns?: Record<string, unknown> | undefined
  learningPreferences?: Record<string, unknown> | undefined
}

export interface UserV1 {
  cognitivePatterns?: Record<string, unknown> | undefined
  learningPreferences?: Record<string, unknown> | undefined
  [key: string]: unknown
}

export interface UserV2 {
  profile?: UserProfile | undefined
  [key: string]: unknown
}

export interface LearningEventV1 {
  responseData?: Record<string, unknown> | undefined
  contextData?: Record<string, unknown> | undefined
  [key: string]: unknown
}

export interface LearningEventV2 {
  metadata?:
    | {
        responseData?: Record<string, unknown> | undefined
        contextData?: Record<string, unknown> | undefined
      }
    | undefined
  [key: string]: unknown
}

export interface PaginationV1 {
  items: Record<string, unknown>[]
  page: number
  limit: number
  total: number
}

export interface PaginationV2 {
  data: Record<string, unknown>[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
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
  middleware(): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
    return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const requestedVersion = this.extractVersion(request)
      const resolvedVersion = this.resolveVersion(requestedVersion)

      // Add version info to request context
      ;(request as ExtendedFastifyRequest).apiVersion = resolvedVersion

      // Add version headers to response
      await reply.header('API-Version', resolvedVersion)
      await reply.header('API-Supported-Versions', this.getSupportedVersions().join(', '))

      // Check if version is deprecated
      const versionInfo = this.getVersionInfo(resolvedVersion)
      if (versionInfo?.deprecated === true) {
        await reply.header('API-Deprecation', 'true')
        if (versionInfo.sunsetDate) {
          await reply.header('API-Sunset', versionInfo.sunsetDate.toISOString())
        }
        await reply.header('Warning', `299 - "API version ${resolvedVersion} is deprecated"`)
      }

      // Find and execute versioned handler
      const endpointKey = `${request.method}:${request.routerPath ?? ''}`
      const endpoint = this.endpoints.get(endpointKey)

      if (endpoint?.versions[resolvedVersion]) {
        const versionHandler = endpoint.versions[resolvedVersion]

        // Transform request if needed
        if (versionHandler?.transformRequest) {
          const typedRequest = request as ExtendedFastifyRequest & { body: Record<string, unknown> }
          typedRequest.body = versionHandler.transformRequest(typedRequest.body)
        }

        // Store original send method for response transformation
        if (versionHandler?.transformResponse) {
          const originalSend = reply.send.bind(reply) as (
            payload: Record<string, unknown>,
          ) => FastifyReply
          reply.send = function (payload: Record<string, unknown>): FastifyReply {
            const transformedPayload = versionHandler.transformResponse?.(payload)
            return originalSend(transformedPayload ?? payload)
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
    const headerVersion = request.headers[this.config.headerName.toLowerCase()] as
      | string
      | undefined
    if (headerVersion !== undefined && headerVersion !== null && headerVersion.length > 0) {
      return this.normalizeVersion(headerVersion)
    }

    // Check query parameter
    const queryParams = request.query as Record<string, unknown>
    const queryVersion = queryParams[this.config.queryParamName] as string | undefined
    if (queryVersion !== undefined && queryVersion !== null && queryVersion.length > 0) {
      return this.normalizeVersion(queryVersion)
    }

    // Check URL path (e.g., /api/v1/users)
    const pathMatch = (request.url ?? '').match(/\/api\/v(\d+(?:\.\d+)?)/)
    const matchedVersion = pathMatch?.[1]
    if (matchedVersion !== undefined && matchedVersion !== null) {
      return `v${matchedVersion}`
    }

    return null
  }

  /**
   * Resolve version to a supported version
   */
  private resolveVersion(requestedVersion: string | null): string {
    if (
      requestedVersion === null ||
      requestedVersion === undefined ||
      requestedVersion.length === 0
    ) {
      return this.config.defaultVersion
    }

    // Check if exact version is supported
    if (this.isVersionSupported(requestedVersion)) {
      return requestedVersion
    }

    // Try to find compatible version (backward compatibility)
    const compatibleVersion = this.findCompatibleVersion(requestedVersion)
    if (
      compatibleVersion !== null &&
      compatibleVersion !== undefined &&
      compatibleVersion.length > 0
    ) {
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

    return compatibleVersions.length > 0 ? (compatibleVersions[0]?.version ?? null) : null
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
    return match ? parseInt(match[1] ?? '0', 10) : 0
  }

  /**
   * Compare version strings
   */
  private compareVersions(a: string, b: string): number {
    const aParts = a.replace(/^v/, '').split('.').map(Number)
    const bParts = b.replace(/^v/, '').split('.').map(Number)

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] ?? 0
      const bPart = bParts[i] ?? 0

      if (aPart > bPart) return 1
      if (aPart < bPart) return -1
    }

    return 0
  }

  /**
   * Create version-specific route handler
   */
  createVersionedHandler(
    versions: Record<
      string,
      (request: FastifyRequest, reply: FastifyReply) => Promise<Record<string, unknown>>
    >,
  ): (
    request: FastifyRequest,
    reply: FastifyReply,
  ) => Promise<ErrorResponse | Record<string, unknown>> {
    return async (
      request: FastifyRequest,
      reply: FastifyReply,
    ): Promise<ErrorResponse | Record<string, unknown>> => {
      const version = (request as ExtendedFastifyRequest).apiVersion ?? this.config.defaultVersion
      const handler = versions[version]

      if (!handler) {
        await reply.code(400)
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
  generateApiDocs(): ApiDocumentation {
    const docs: ApiDocumentation = {
      info: {
        title: 'DriveMaster API',
        description: 'Adaptive driving test learning platform API',
        currentVersion: this.config.current,
        defaultVersion: this.config.defaultVersion,
      },
      versions: {},
    }

    for (const version of this.config.supported) {
      const versionDoc: VersionDocumentation = {
        version: version.version,
        deprecated: version.deprecated ?? false,
        endpoints: this.getEndpointsForVersion(version.version),
      }

      if (version.deprecationDate !== undefined) {
        versionDoc.deprecationDate = version.deprecationDate.toISOString()
      }

      if (version.sunsetDate !== undefined) {
        versionDoc.sunsetDate = version.sunsetDate.toISOString()
      }

      if (version.supportedUntil !== undefined) {
        versionDoc.supportedUntil = version.supportedUntil.toISOString()
      }

      docs.versions[version.version] = versionDoc
    }

    return docs
  }

  /**
   * Get endpoints for specific version
   */
  private getEndpointsForVersion(version: string): EndpointDocumentation[] {
    const endpoints: EndpointDocumentation[] = []

    Array.from(this.endpoints.values()).forEach((endpoint) => {
      const versionHandler = endpoint.versions[version]
      if (versionHandler) {
        endpoints.push({
          path: endpoint.path,
          method: endpoint.method,
          deprecated: versionHandler.deprecated ?? false,
          ...(versionHandler.schema && { schema: versionHandler.schema }),
        })
      }
    })

    return endpoints
  }
}

// Request/Response transformation utilities
export class VersionTransformers {
  /**
   * Transform v1 user response to v2 format
   */
  static transformUserV1ToV2(user: UserV1): UserV2 {
    const profile: UserProfile = {}

    if (user.cognitivePatterns !== undefined) {
      profile.cognitivePatterns = user.cognitivePatterns
    }

    if (user.learningPreferences !== undefined) {
      profile.learningPreferences = user.learningPreferences
    }

    return {
      ...user,
      profile,
      // Remove deprecated fields
      cognitivePatterns: undefined,
      learningPreferences: undefined,
    }
  }

  /**
   * Transform v2 user request to v1 format
   */
  static transformUserV2ToV1(user: UserV2): UserV1 {
    const result: UserV1 = {
      ...user,
      // Remove new fields
      profile: undefined,
    }

    if (user.profile?.cognitivePatterns !== undefined) {
      result.cognitivePatterns = user.profile.cognitivePatterns
    }

    if (user.profile?.learningPreferences !== undefined) {
      result.learningPreferences = user.profile.learningPreferences
    }

    return result
  }

  /**
   * Transform v1 learning event to v2 format
   */
  static transformLearningEventV1ToV2(event: LearningEventV1): LearningEventV2 {
    const metadata: {
      responseData?: Record<string, unknown> | undefined
      contextData?: Record<string, unknown> | undefined
    } = {}

    if (event.responseData !== undefined) {
      metadata.responseData = event.responseData
    }

    if (event.contextData !== undefined) {
      metadata.contextData = event.contextData
    }

    return {
      ...event,
      metadata,
      // Remove deprecated fields
      responseData: undefined,
      contextData: undefined,
    }
  }

  /**
   * Transform paginated response format
   */
  static transformPaginationV1ToV2(response: PaginationV1): PaginationV2 {
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
