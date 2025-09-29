import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import { PrismaClient } from '@prisma/client'
import { initTelemetry } from '@drivemaster/telemetry'
import { loadEnv } from '@drivemaster/shared-config'
import { createRedisClient } from '@drivemaster/redis-client'
import { createKafka } from '@drivemaster/kafka-client'
import { z } from 'zod'

initTelemetry('user-svc')
const env = loadEnv()
const app = Fastify({ logger: true })
const prisma = new PrismaClient()
const redis = env.REDIS_URL ? createRedisClient(env.REDIS_URL) : null
const kafka = env.KAFKA_BROKERS ? createKafka({ brokers: env.KAFKA_BROKERS.split(',') }) : null

// Validation schemas
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  timezone: z.string().optional()
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  deviceInfo: z.object({
    type: z.enum(['IOS', 'ANDROID', 'WEB']),
    id: z.string(),
    name: z.string().optional(),
    pushToken: z.string().optional()
  }).optional()
})

const ProfileUpdateSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  preferredStudyTime: z.enum(['morning', 'afternoon', 'evening']).optional(),
  studyGoal: z.number().min(5).max(480).optional(),
  preferences: z.record(z.any()).optional(),
  privacySettings: z.record(z.any()).optional()
})

// Middleware
await app.register(cors, {
  origin: true,
  credentials: true
})

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (req) => req.ip
})

await app.register(jwt, {
  secret: env.JWT_SECRET || 'change_me_in_production',
  sign: {
    expiresIn: '24h'
  }
})

// Auth middleware
async function authenticate(request: any, reply: any) {
  try {
    await request.jwtVerify()
    const user = await prisma.user.findUnique({
      where: { id: request.user.userId },
      include: { profile: true }
    })
    
    if (!user || user.status !== 'ACTIVE') {
      reply.code(401).send({ error: 'Unauthorized' })
      return
    }
    
    request.currentUser = user
  } catch (err) {
    reply.code(401).send({ error: 'Unauthorized' })
  }
}

// Utility functions
async function hashPassword(password: string): Promise<string> {
  const saltRounds = parseInt(env.BCRYPT_ROUNDS || '12')
  return bcrypt.hash(password, saltRounds)
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

async function checkBruteForce(email: string): Promise<boolean> {
  if (!redis) return false
  
  const key = `login_attempts:${email}`
  const attempts = await redis.get(key)
  return (attempts ? parseInt(attempts) : 0) >= 5
}

async function recordLoginAttempt(email: string): Promise<void> {
  if (!redis) return
  
  const key = `login_attempts:${email}`
  await redis.incr(key)
  await redis.expire(key, 900) // 15 minutes
}

async function clearLoginAttempts(email: string): Promise<void> {
  if (!redis) return
  
  const key = `login_attempts:${email}`
  await redis.del(key)
}

async function createSession(userId: string, deviceInfo?: any, ipAddress?: string, userAgent?: string) {
  const token = randomUUID()
  const refreshToken = randomUUID()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  
  const session = await prisma.session.create({
    data: {
      userId,
      token,
      refreshToken,
      deviceInfo,
      ipAddress,
      userAgent,
      expiresAt
    }
  })
  
  return session
}

async function logAuditEvent(userId: string | null, action: string, details?: any, ipAddress?: string, userAgent?: string) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      details,
      ipAddress,
      userAgent
    }
  })
}

// Routes
app.get('/health', async () => ({ 
  status: 'ok',
  timestamp: new Date().toISOString(),
  database: 'connected',
  redis: redis ? 'connected' : 'disconnected',
  kafka: kafka ? 'connected' : 'disconnected'
}))

// User Registration
app.post('/auth/register', {
  preHandler: app.rateLimit({ max: 5, timeWindow: '1 minute' })
}, async (request, reply) => {
  try {
    const { email, password, firstName, lastName, timezone } = RegisterSchema.parse(request.body)
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })
    
    if (existingUser) {
      return reply.code(400).send({ error: 'User already exists' })
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password)
    const emailVerifyToken = randomUUID()
    
    // Create user and profile in transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          emailVerifyToken,
          profile: {
            create: {
              firstName,
              lastName,
              displayName: firstName ? `${firstName} ${lastName || ''}`.trim() : undefined,
              timezone: timezone || 'UTC',
              cognitiveProfile: {},
              preferences: {
                notifications: {
                  email: true,
                  push: true,
                  studyReminders: true
                }
              },
              privacySettings: {
                showProfile: 'friends',
                showProgress: 'friends'
              }
            }
          },
          streakData: {
            create: {}
          }
        },
        include: {
          profile: true,
          streakData: true
        }
      })
      
      return newUser
    })
    
    // Log audit event
    await logAuditEvent(user.id, 'REGISTER', { email }, request.ip, request.headers['user-agent'])
    
    // TODO: Send verification email
    
    reply.code(201).send({
      message: 'User created successfully. Please verify your email.',
      userId: user.id,
      emailVerificationRequired: true
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: 'Validation error', details: error.errors })
    }
    
    app.log.error(error, 'Registration error')
    reply.code(500).send({ error: 'Internal server error' })
  }
})

// User Login
app.post('/auth/login', {
  preHandler: app.rateLimit({ max: 10, timeWindow: '1 minute' })
}, async (request, reply) => {
  try {
    const { email, password, deviceInfo } = LoginSchema.parse(request.body)
    
    // Check brute force protection
    if (await checkBruteForce(email)) {
      return reply.code(429).send({ error: 'Too many login attempts. Please try again later.' })
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        profile: true,
        streakData: true
      }
    })
    
    if (!user) {
      await recordLoginAttempt(email)
      return reply.code(401).send({ error: 'Invalid credentials' })
    }
    
    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return reply.code(423).send({ error: 'Account temporarily locked' })
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.password)
    
    if (!isValidPassword) {
      await recordLoginAttempt(email)
      
      // Lock account after multiple failed attempts
      const newAttempts = user.loginAttempts + 1
      const updateData: any = { loginAttempts: newAttempts }
      
      if (newAttempts >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      }
      
      await prisma.user.update({
        where: { id: user.id },
        data: updateData
      })
      
      return reply.code(401).send({ error: 'Invalid credentials' })
    }
    
    // Clear login attempts on successful login
    await clearLoginAttempts(email)
    
    // Update user login info
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        loginAttempts: 0,
        lockedUntil: null
      }
    })
    
    // Register device if provided
    if (deviceInfo) {
      await prisma.userDevice.upsert({
        where: {
          userId_deviceId: {
            userId: user.id,
            deviceId: deviceInfo.id
          }
        },
        create: {
          userId: user.id,
          deviceType: deviceInfo.type,
          deviceId: deviceInfo.id,
          deviceName: deviceInfo.name,
          pushToken: deviceInfo.pushToken,
          lastUsedAt: new Date()
        },
        update: {
          deviceName: deviceInfo.name,
          pushToken: deviceInfo.pushToken,
          lastUsedAt: new Date(),
          isActive: true
        }
      })
    }
    
    // Create session and JWT token
    const session = await createSession(
      user.id,
      deviceInfo,
      request.ip,
      request.headers['user-agent']
    )
    
    const jwtToken = app.jwt.sign({
      userId: user.id,
      sessionId: session.id,
      role: user.role
    })
    
    // Log audit event
    await logAuditEvent(user.id, 'LOGIN', { deviceInfo }, request.ip, request.headers['user-agent'])
    
    reply.send({
      token: jwtToken,
      refreshToken: session.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        profile: user.profile,
        streakData: user.streakData
      }
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: 'Validation error', details: error.errors })
    }
    
    app.log.error(error, 'Login error')
    reply.code(500).send({ error: 'Internal server error' })
  }
})

// Get Current User Profile
app.get('/user/profile', {
  preHandler: [authenticate]
}, async (request: any, reply) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: request.currentUser.id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        profile: true,
        streakData: true,
        achievements: {
          include: {
            achievement: true
          },
          orderBy: {
            unlockedAt: 'desc'
          }
        },
        _count: {
          friendships: true,
          friendOf: true
        }
      }
    })
    
    if (!user) {
      return reply.code(404).send({ error: 'User not found' })
    }
    
    reply.send(user)
  } catch (error) {
    app.log.error(error, 'Get profile error')
    reply.code(500).send({ error: 'Internal server error' })
  }
})

// Update User Profile
app.patch('/user/profile', {
  preHandler: [authenticate]
}, async (request: any, reply) => {
  try {
    const updateData = ProfileUpdateSchema.parse(request.body)
    
    const updatedProfile = await prisma.profile.update({
      where: { userId: request.currentUser.id },
      data: updateData
    })
    
    // Log audit event
    await logAuditEvent(request.currentUser.id, 'PROFILE_UPDATE', updateData, request.ip, request.headers['user-agent'])
    
    reply.send(updatedProfile)
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: 'Validation error', details: error.errors })
    }
    
    app.log.error(error, 'Update profile error')
    reply.code(500).send({ error: 'Internal server error' })
  }
})

// Logout
app.post('/auth/logout', {
  preHandler: [authenticate]
}, async (request: any, reply) => {
  try {
    // Invalidate current session
    await prisma.session.deleteMany({
      where: {
        userId: request.currentUser.id,
        token: request.user.sessionId
      }
    })
    
    // Log audit event
    await logAuditEvent(request.currentUser.id, 'LOGOUT', {}, request.ip, request.headers['user-agent'])
    
    reply.send({ message: 'Logged out successfully' })
  } catch (error) {
    app.log.error(error, 'Logout error')
    reply.code(500).send({ error: 'Internal server error' })
  }
})

// Change Password
app.post('/user/change-password', {
  preHandler: [authenticate]
}, async (request: any, reply) => {
  try {
    const { currentPassword, newPassword } = z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(8).max(128)
    }).parse(request.body)
    
    const user = await prisma.user.findUnique({
      where: { id: request.currentUser.id }
    })
    
    if (!user || !await verifyPassword(currentPassword, user.password)) {
      return reply.code(401).send({ error: 'Current password is incorrect' })
    }
    
    const hashedNewPassword = await hashPassword(newPassword)
    
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword }
    })
    
    // Invalidate all sessions except current
    await prisma.session.deleteMany({
      where: {
        userId: user.id,
        NOT: {
          id: request.user.sessionId
        }
      }
    })
    
    // Log audit event
    await logAuditEvent(user.id, 'PASSWORD_CHANGE', {}, request.ip, request.headers['user-agent'])
    
    reply.send({ message: 'Password changed successfully' })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: 'Validation error', details: error.errors })
    }
    
    app.log.error(error, 'Change password error')
    reply.code(500).send({ error: 'Internal server error' })
  }
})

// Get User Stats
app.get('/user/stats', {
  preHandler: [authenticate]
}, async (request: any, reply) => {
  try {
    const stats = await prisma.user.findUnique({
      where: { id: request.currentUser.id },
      select: {
        createdAt: true,
        lastLoginAt: true,
        streakData: true,
        achievements: {
          include: {
            achievement: {
              select: {
                category: true,
                points: true,
                rarity: true
              }
            }
          }
        },
        _count: {
          friendships: {
            where: { status: 'ACCEPTED' }
          }
        }
      }
    })
    
    if (!stats) {
      return reply.code(404).send({ error: 'User not found' })
    }
    
    // Calculate total points and achievement breakdown
    const totalPoints = stats.achievements.reduce((sum, ua) => sum + ua.achievement.points, 0)
    const achievementsByCategory = stats.achievements.reduce((acc: any, ua) => {
      const category = ua.achievement.category
      if (!acc[category]) acc[category] = 0
      acc[category]++
      return acc
    }, {})
    
    reply.send({
      memberSince: stats.createdAt,
      lastActive: stats.lastLoginAt,
      streak: stats.streakData,
      totalPoints,
      totalAchievements: stats.achievements.length,
      achievementsByCategory,
      friendsCount: stats._count.friendships
    })
  } catch (error) {
    app.log.error(error, 'Get stats error')
    reply.code(500).send({ error: 'Internal server error' })
  }
})

// Graceful shutdown
process.on('SIGINT', async () => {
  app.log.info('Shutting down gracefully...')
  await prisma.$disconnect()
  if (redis) await redis.disconnect()
  process.exit(0)
})

app.listen({ port: env.PORT || 3001, host: '0.0.0.0' })
  .then(() => app.log.info(`user-svc listening on ${env.PORT || 3001}`))
  .catch((err) => { app.log.error(err); process.exit(1) })
