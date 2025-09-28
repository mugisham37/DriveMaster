import { FastifyInstance } from 'fastify'
import crypto from 'crypto'
import { z } from 'zod'
import { prisma } from '../plugins/prisma'

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function tokenRoutes(app: FastifyInstance) {
  app.post('/v1/auth/request-password-reset', async (req, reply) => {
    const schema = z.object({ email: z.string().email() })
    const { email } = schema.parse(req.body)
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return reply.code(204).send() // do not reveal whether user exists

    const raw = crypto.randomBytes(32).toString('hex')
    const tokenHash = hashToken(raw)
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15) // 15 minutes
    await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } })

    // TODO: send email with raw token link
    return reply.code(204).send()
  })

  app.post('/v1/auth/reset-password', async (req, reply) => {
    const schema = z.object({ token: z.string(), newPassword: z.string().min(8) })
    const { token, newPassword } = schema.parse(req.body)
    const tokenHash = hashToken(token)
    const prt = await prisma.passwordResetToken.findFirst({ where: { tokenHash, expiresAt: { gt: new Date() } } })
    if (!prt) return reply.code(400).send({ error: 'Invalid or expired token' })

    const user = await prisma.user.findUnique({ where: { id: prt.userId } })
    if (!user) return reply.code(400).send({ error: 'Invalid token' })

    // Reuse auth hashing rounds indirectly via register route logic not accessible here; for now use 12
    const bcrypt = await import('bcryptjs')
    const hash = await bcrypt.hash(newPassword, 12)
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { password: hash } }),
      prisma.passwordResetToken.delete({ where: { id: prt.id } }),
    ])

    return reply.code(204).send()
  })

  app.post('/v1/auth/request-email-verify', { preHandler: [async (req, reply) => { try { await req.jwtVerify() } catch { return reply.code(401).send({ error: 'Unauthorized' }) } }] }, async (req: any, reply) => {
    const raw = crypto.randomBytes(32).toString('hex')
    const tokenHash = hashToken(raw)
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 hours
    await prisma.verificationToken.create({ data: { userId: req.user.sub, tokenHash, type: 'email_verification', expiresAt } })
    // TODO: send email with raw token link
    return reply.code(204).send()
  })

  app.post('/v1/auth/verify-email', async (req, reply) => {
    const schema = z.object({ token: z.string() })
    const { token } = schema.parse(req.body)
    const tokenHash = hashToken(token)
    const vt = await prisma.verificationToken.findFirst({ where: { tokenHash, type: 'email_verification', expiresAt: { gt: new Date() } } })
    if (!vt) return reply.code(400).send({ error: 'Invalid or expired token' })

    await prisma.$transaction([
      prisma.user.update({ where: { id: vt.userId }, data: { emailVerifiedAt: new Date() } }),
      prisma.verificationToken.delete({ where: { id: vt.id } }),
    ])

    return reply.code(204).send()
  })
}