import { PrismaClient } from '@prisma/client'
import { updateBKT, BKTState, BKTParams } from '../algorithms/bkt'

export class KnowledgeRepo {
  constructor(private prisma: PrismaClient) {}

  async applyEvent(userId: string, conceptId: string, params: BKTParams, correct: boolean, responseTimeMs?: number, confidence?: number) {
    const existing = await this.prisma.userKnowledgeState.findUnique({ where: { userId_conceptId: { userId, conceptId } } })
    const state: BKTState = existing ? { mastery: existing.mastery, lastUpdated: existing.lastUpdatedAt.getTime() } : { mastery: params.pL0, lastUpdated: Date.now() - 3600_000 }
    const next = updateBKT(state, params, { correct, responseTimeMs, confidence })

    await this.prisma.$transaction([
      this.prisma.learningEvent.create({ data: { userId, conceptId, correct, responseTimeMs, confidence } }),
      existing
        ? this.prisma.userKnowledgeState.update({ where: { userId_conceptId: { userId, conceptId } }, data: { mastery: next.mastery, lastUpdatedAt: new Date(next.lastUpdated) } })
        : this.prisma.userKnowledgeState.create({ data: { userId, conceptId, mastery: next.mastery, lastUpdatedAt: new Date(next.lastUpdated) } }),
    ])

    return next
  }
}