import { PrismaClient } from '@prisma/client'

export class BanditRepo {
  constructor(private prisma: PrismaClient) {}

  async getStatsMap(userId: string, armIds: string[]) {
    const rows = await this.prisma.banditArmStats.findMany({ where: { userId, armId: { in: armIds } } })
    const map = new Map<string, { alpha: number; beta: number }>()
    for (const a of rows) map.set(a.armId, { alpha: a.alpha, beta: a.beta })
    return map
  }

  async update(userId: string, armId: string, reward: boolean) {
    const existing = await this.prisma.banditArmStats.findUnique({ where: { userId_armId: { userId, armId } } })
    if (!existing) {
      return this.prisma.banditArmStats.create({ data: { userId, armId, alpha: reward ? 2 : 1, beta: reward ? 1 : 2 } })
    }
    return this.prisma.banditArmStats.update({ where: { userId_armId: { userId, armId } }, data: { alpha: existing.alpha + (reward ? 1 : 0), beta: existing.beta + (reward ? 0 : 1), updatedAt: new Date() } })
  }
}