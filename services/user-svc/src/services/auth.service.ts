import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import { db, readDb } from '../db/connection'
import { users } from '../db/schema'
import type { CognitivePatterns, LearningPreferences } from '../db/schema'

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production'
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

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
    cognitivePatterns?: CognitivePatterns
    learningPreferences?: LearningPreferences
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
    return jwt.sign({ ...payload, type: 'access' }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN as string,
    })
  }

  /**
   * Generate JWT refresh token
   */
  static generateRefreshToken(payload: Omit<JWTPayload, 'type'>): string {
    return jwt.sign({ ...payload, type: 'refresh' }, JWT_REFRESH_SECRET, {
      expiresIn: JWT_REFRESH_EXPIRES_IN as string,
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
   * Authenticate user with email and password
   */
  static async authenticate(credentials: LoginCredentials): Promise<AuthResult> {
    const { email, password } = credentials

    // Find user by email (use read replica for better performance)
    const [user] = await readDb
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1)

    if (!user) {
      throw new Error('Invalid email or password')
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated')
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, user.passwordHash)
    if (!isValidPassword) {
      throw new Error('Invalid email or password')
    }

    // Update last active timestamp
    await db.update(users).set({ lastActiveAt: new Date() }).where(eq(users.id, user.id))

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      roles: ['user'], // Default role, can be extended with RBAC
    }

    const accessToken = this.generateAccessToken(tokenPayload)
    const refreshToken = this.generateRefreshToken(tokenPayload)

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        createdAt: user.createdAt!,
        cognitivePatterns: user.cognitivePatterns || undefined,
        learningPreferences: user.learningPreferences || undefined,
      },
    }
  }

  /**
   * Register new user
   */
  static async register(userData: RegisterData): Promise<AuthResult> {
    const { email, password, firstName, lastName, dateOfBirth } = userData

    // Check if user already exists
    const [existingUser] = await readDb
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1)

    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    // Hash password
    const passwordHash = await this.hashPassword(password)

    // Default learning preferences for new users
    const defaultLearningPreferences: LearningPreferences = {
      enableNotifications: true,
      notificationFrequency: 'medium',
      studyReminders: true,
      socialFeatures: true,
      gamificationEnabled: true,
      preferredLanguage: 'en',
      accessibilityOptions: {
        highContrast: false,
        largeText: false,
        screenReader: false,
        reducedMotion: false,
      },
    }

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        dateOfBirth,
        learningPreferences: defaultLearningPreferences,
        emailVerified: false,
        isActive: true,
      })
      .returning()

    // Generate tokens
    const tokenPayload = {
      userId: newUser.id,
      email: newUser.email,
      roles: ['user'],
    }

    const accessToken = this.generateAccessToken(tokenPayload)
    const refreshToken = this.generateRefreshToken(tokenPayload)

    return {
      accessToken,
      refreshToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName || undefined,
        lastName: newUser.lastName || undefined,
        createdAt: newUser.createdAt!,
        learningPreferences: newUser.learningPreferences || undefined,
      },
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string): Promise<TokenPair> {
    // Verify refresh token
    const decoded = this.verifyToken(refreshToken, 'refresh')

    // Verify user still exists and is active
    const [user] = await readDb
      .select({ id: users.id, email: users.email, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1)

    if (!user || !user.isActive) {
      throw new Error('User not found or inactive')
    }

    // Generate new tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      roles: decoded.roles,
    }

    return {
      accessToken: this.generateAccessToken(tokenPayload),
      refreshToken: this.generateRefreshToken(tokenPayload),
    }
  }

  /**
   * Validate token and return user context
   */
  static async validateToken(token: string): Promise<UserContext> {
    const decoded = this.verifyToken(token, 'access')

    // Verify user still exists and is active
    const [user] = await readDb
      .select({ id: users.id, email: users.email, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1)

    if (!user || !user.isActive) {
      throw new Error('User not found or inactive')
    }

    return {
      userId: user.id,
      email: user.email,
      roles: decoded.roles,
      permissions: this.getRolePermissions(decoded.roles),
    }
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
