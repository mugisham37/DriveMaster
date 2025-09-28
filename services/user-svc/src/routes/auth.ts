import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../plugins/prisma'
import { loadEnv } from '@drivemaster/shared-config'
import { redis } from '../plugins/redis'

const env = loadEnv(process.env)
const ROUNDS = env.BCRYPT_ROUNDS

const MAX_ATTEMPTS = 5
const WINDOW_SECONDS = 15 * 60

function loginKey(email: string) {
  return `login:attempts:${email.toLowerCase()}`
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/v1/auth/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          displayName: { type: 'string' },
        },
        additionalProperties: false,
      },
      response: {
        201: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: {
              type: 'object',
              properties: { id: { type: 'string' }, email: { type: 'string' }, roles: { type: 'array', items: { type: 'string' } } },
              required: ['id', 'email', 'roles'],
            },
          },
          required: ['token', 'user'],
        },
      },
    },
  }, async (req, reply) => {
    const bodySchema = z.object({ email: z.string().email(), password: z.string().min(8), displayName: z.string().optional() })
    const { email, password, displayName } = bodySchema.parse(req.body)

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) return reply.code(409).send({ error: 'Email already registered' })

    const hash = await bcrypt.hash(password, ROUNDS)
    const user = await prisma.user.create({ data: { email, password: hash, profile: displayName ? { create: { displayName, cognitive: {} } } : undefined } })

    const token = await reply.jwtSign({ sub: user.id, roles: user.roles })
    return reply.code(201).send({ token, user: { id: user.id, email: user.email, roles: user.roles } })
  })

  app.post('/v1/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
        },
        additionalProperties: false,
      },
    },
  }, async (req, reply) => {
    const bodySchema = z.object({ email: z.string().email(), password: z.string().min(8) })
    const { email, password } = bodySchema.parse(req.body)

    // Brute force protection
    const key = loginKey(email)
    const attemptsStr = await redis.get(key)
    const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0
    if (attempts >= MAX_ATTEMPTS) {
      const ttl = await redis.ttl(key)
      reply.header('Retry-After', Math.max(ttl, 0))
      return reply.code(429).send({ error: 'Too many attempts. Try again later.' })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      const n = await redis.incr(key)
      if (n === 1) await redis.expire(key, WINDOW_SECONDS)
      return reply.code(401).send({ error: 'Invalid credentials' })
    }

    const ok = await bcrypt.compare(password, user.password)
    if (!ok) {
      const n = await redis.incr(key)
      if (n === 1) await redis.expire(key, WINDOW_SECONDS)
      return reply.code(401).send({ error: 'Invalid credentials' })
    }

    await redis.del(key) // reset on successful login

    const token = await reply.jwtSign({ sub: user.id, roles: user.roles })
    return { token, user: { id: user.id, email: user.email, roles: user.roles } }
  })
}