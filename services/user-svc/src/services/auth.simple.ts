import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production'
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production'
const JWT_EXPIRES_IN = '15m'
const JWT_REFRESH_EXPIRES_IN = '7d'

// Salt rounds for bcrypt
const SALT_ROUNDS = 12

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  firstName?: string
  lastName?: string
  dateOfBirth?: Date
}

export interface AuthResult {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
    firstName?: string
    lastName?: string
    createdAt: Date
  }
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface UserContext {
  userId: string
  email: string
  roles: string[]
  permissions: string[]
}

export interface JWTPayload {
  userId: string
  email: string
  roles: string[]
  type: 'access' | 'refresh'
  iat?: number
  exp?: number
}

export class AuthService {
  /**
   * Hash password using bcrypt with salt
   */
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS)
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  /**
   * Generate JWT access token
   */
  static generateAccessToken(payload: Omit<JWTPayload, 'type'>): string {
    return jwt.sign({ ...payload, type: 'access' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
  }

  /**
   * Generate JWT refresh token
   */
  static generateRefreshToken(payload: Omit<JWTPayload, 'type'>): string {
    return jwt.sign({ ...payload, type: 'refresh' }, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
    })
  }

  /**
   * Verify and decode JWT token
   */
  static verifyToken(token: string, type: 'access' | 'refresh' = 'access'): JWTPayload {
    const secret = type === 'access' ? JWT_SECRET : JWT_REFRESH_SECRET

    try {
      const decoded = jwt.verify(token, secret) as JWTPayload

      if (decoded.type !== type) {
        throw new Error(`Invalid token type. Expected ${type}, got ${decoded.type}`)
      }

      return decoded
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired')
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token')
      }
      throw error
    }
  }

  /**
   * Authenticate user with email and password (mock implementation)
   */
  static async authenticate(credentials: LoginCredentials): Promise<AuthResult> {
    // Mock implementation for testing
    throw new Error('Invalid email or password')
  }

  /**
   * Register new user (mock implementation)
   */
  static async register(userData: RegisterData): Promise<AuthResult> {
    // Mock implementation for testing
    throw new Error('Registration not implemented')
  }

  /**
   * Refresh access token using refresh token (mock implementation)
   */
  static async refreshToken(refreshToken: string): Promise<TokenPair> {
    // Mock implementation for testing
    throw new Error('Token refresh not implemented')
  }

  /**
   * Validate token and return user context (mock implementation)
   */
  static async validateToken(token: string): Promise<UserContext> {
    // Mock implementation for testing
    throw new Error('Token validation not implemented')
  }

  /**
   * Get permissions for roles (RBAC implementation)
   */
  private static getRolePermissions(roles: string[]): string[] {
    const rolePermissions: Record<string, string[]> = {
      user: [
        'read:own_profile',
        'update:own_profile',
        'read:own_progress',
        'create:learning_session',
        'read:content',
        'create:friend_request',
        'read:own_notifications',
      ],
      premium: [
        'read:own_profile',
        'update:own_profile',
        'read:own_progress',
        'create:learning_session',
        'read:content',
        'read:premium_content',
        'create:friend_request',
        'read:own_notifications',
        'access:advanced_analytics',
      ],
      admin: [
        'read:all_users',
        'update:all_users',
        'delete:users',
        'read:all_content',
        'create:content',
        'update:content',
        'delete:content',
        'read:system_analytics',
        'manage:notifications',
      ],
    }

    const permissions = new Set<string>()

    for (const role of roles) {
      const rolePerms = rolePermissions[role] || []
      rolePerms.forEach((perm) => permissions.add(perm))
    }

    return Array.from(permissions)
  }

  /**
   * Check if user has specific permission
   */
  static hasPermission(userContext: UserContext, permission: string): boolean {
    return userContext.permissions.includes(permission)
  }

  /**
   * Check if user has any of the specified roles
   */
  static hasRole(userContext: UserContext, roles: string[]): boolean {
    return roles.some((role) => userContext.roles.includes(role))
  }
}
