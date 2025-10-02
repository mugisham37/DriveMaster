// Mock Prisma client for development
// In production, this would be replaced with actual Prisma client

import type {
  User,
  UserKnowledgeState,
  BanditArmStats,
  LearningEvent,
  SpacedRepetition,
} from '../types/server.types'

// Helper types for filtering operations
type FilterValue = string | number | boolean | Date | null | { gte?: Date; lte?: Date }
type FilterRecord<T> = Partial<Record<keyof T, FilterValue>>
type OrderByRecord = Record<string, 'asc' | 'desc'>

// Type-safe comparison helper
function compareValues(a: unknown, b: unknown, direction: 'asc' | 'desc'): number {
  // Handle null/undefined values
  if (a == null && b == null) return 0
  if (a == null) return direction === 'desc' ? 1 : -1
  if (b == null) return direction === 'desc' ? -1 : 1

  // Handle Date objects
  if (a instanceof Date && b instanceof Date) {
    const diff = a.getTime() - b.getTime()
    return direction === 'desc' ? -diff : diff
  }

  // Handle numbers
  if (typeof a === 'number' && typeof b === 'number') {
    return direction === 'desc' ? b - a : a - b
  }

  // Handle strings
  if (typeof a === 'string' && typeof b === 'string') {
    const result = a.localeCompare(b)
    return direction === 'desc' ? -result : result
  }

  // Fallback for other types
  const aStr = String(a)
  const bStr = String(b)
  const result = aStr.localeCompare(bStr)
  return direction === 'desc' ? -result : result
}

// Type-safe filter helper
function matchesFilter<T>(record: T, where: FilterRecord<T>): boolean {
  return Object.entries(where).every(([key, value]) => {
    const recordKey = key as keyof T
    const recordValue = record[recordKey]

    // Handle date range filters
    if (
      typeof value === 'object' &&
      value !== null &&
      'gte' in value &&
      value.gte instanceof Date &&
      recordValue instanceof Date
    ) {
      return recordValue >= value.gte
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      'lte' in value &&
      value.lte instanceof Date &&
      recordValue instanceof Date
    ) {
      return recordValue <= value.lte
    }

    return recordValue === value
  })
}

export interface PrismaClient {
  userKnowledgeState: {
    findUnique: (args: {
      where: {
        userId_conceptKey: {
          userId: string
          conceptKey: string
        }
      }
    }) => Promise<UserKnowledgeState | null>
    create: (args: {
      data: Omit<UserKnowledgeState, 'createdAt' | 'updatedAt'>
    }) => Promise<UserKnowledgeState>
    update: (args: {
      where: {
        userId_conceptKey: {
          userId: string
          conceptKey: string
        }
      }
      data: Partial<UserKnowledgeState>
    }) => Promise<UserKnowledgeState>
    findMany: (args?: { where?: FilterRecord<UserKnowledgeState> }) => Promise<UserKnowledgeState[]>
    upsert: (args: {
      where: {
        userId_conceptKey: {
          userId: string
          conceptKey: string
        }
      }
      create: Omit<UserKnowledgeState, 'createdAt' | 'updatedAt'>
      update: Partial<UserKnowledgeState>
    }) => Promise<UserKnowledgeState>
  }

  banditArmStats: {
    findUnique: (args: {
      where: {
        userId_conceptKey_itemId: {
          userId: string
          conceptKey: string
          itemId: string
        }
      }
    }) => Promise<BanditArmStats | null>
    create: (args: {
      data: Omit<BanditArmStats, 'createdAt' | 'updatedAt'>
    }) => Promise<BanditArmStats>
    update: (args: {
      where: {
        userId_conceptKey_itemId: {
          userId: string
          conceptKey: string
          itemId: string
        }
      }
      data: Partial<BanditArmStats>
    }) => Promise<BanditArmStats>
    findMany: (args?: { where?: FilterRecord<BanditArmStats> }) => Promise<BanditArmStats[]>
    upsert: (args: {
      where: {
        userId_conceptKey_itemId: {
          userId: string
          conceptKey: string
          itemId: string
        }
      }
      create: Omit<BanditArmStats, 'createdAt' | 'updatedAt'>
      update: Partial<BanditArmStats>
    }) => Promise<BanditArmStats>
  }

  learningEvent: {
    create: (args: {
      data: Omit<LearningEvent, 'id' | 'createdAt' | 'updatedAt'>
    }) => Promise<LearningEvent>
    findMany: (args?: {
      where?: FilterRecord<LearningEvent>
      orderBy?: OrderByRecord
      take?: number
    }) => Promise<LearningEvent[]>
  }

  spacedRepetition: {
    findUnique: (args: {
      where: {
        userId_conceptKey_itemId: {
          userId: string
          conceptKey: string
          itemId: string
        }
      }
    }) => Promise<SpacedRepetition | null>
    create: (args: {
      data: Omit<SpacedRepetition, 'createdAt' | 'updatedAt'>
    }) => Promise<SpacedRepetition>
    update: (args: {
      where: {
        userId_conceptKey_itemId: {
          userId: string
          conceptKey: string
          itemId: string
        }
      }
      data: Partial<SpacedRepetition>
    }) => Promise<SpacedRepetition>
    findMany: (args?: {
      where?: FilterRecord<SpacedRepetition>
      orderBy?: OrderByRecord
    }) => Promise<SpacedRepetition[]>
    upsert: (args: {
      where: {
        userId_conceptKey_itemId: {
          userId: string
          conceptKey: string
          itemId: string
        }
      }
      create: Omit<SpacedRepetition, 'createdAt' | 'updatedAt'>
      update: Partial<SpacedRepetition>
    }) => Promise<SpacedRepetition>
  }

  user: {
    findUnique: (args: { where: { id: string } }) => Promise<User | null>
    create: (args: { data: Omit<User, 'createdAt' | 'updatedAt'> }) => Promise<User>
    update: (args: { where: { id: string }; data: Partial<User> }) => Promise<User>
  }
}

// Mock implementation for development
export const createMockPrismaClient = (): PrismaClient => {
  const mockData = {
    userKnowledgeStates: new Map<string, UserKnowledgeState>(),
    banditArmStats: new Map<string, BanditArmStats>(),
    learningEvents: new Map<string, LearningEvent>(),
    spacedRepetitions: new Map<string, SpacedRepetition>(),
    users: new Map<string, User>(),
  }

  return {
    userKnowledgeState: {
      findUnique({ where }): Promise<UserKnowledgeState | null> {
        const key = `${where.userId_conceptKey.userId}:${where.userId_conceptKey.conceptKey}`
        return Promise.resolve(mockData.userKnowledgeStates.get(key) ?? null)
      },
      create({ data }): Promise<UserKnowledgeState> {
        const key = `${data.userId}:${data.conceptKey}`
        const record: UserKnowledgeState = {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        mockData.userKnowledgeStates.set(key, record)
        return Promise.resolve(record)
      },
      update({ where, data }): Promise<UserKnowledgeState> {
        const key = `${where.userId_conceptKey.userId}:${where.userId_conceptKey.conceptKey}`
        const existing = mockData.userKnowledgeStates.get(key)
        if (!existing) throw new Error('Record not found')
        const updated = { ...existing, ...data, updatedAt: new Date() }
        mockData.userKnowledgeStates.set(key, updated)
        return Promise.resolve(updated)
      },
      findMany({ where } = {}): Promise<UserKnowledgeState[]> {
        const results = Array.from(mockData.userKnowledgeStates.values())
        if (!where) return Promise.resolve(results)
        const filtered = results.filter((record) => matchesFilter(record, where))
        return Promise.resolve(filtered)
      },
      upsert({ where, create, update }): Promise<UserKnowledgeState> {
        const key = `${where.userId_conceptKey.userId}:${where.userId_conceptKey.conceptKey}`
        const existing = mockData.userKnowledgeStates.get(key)
        if (existing) {
          const updated = { ...existing, ...update, updatedAt: new Date() }
          mockData.userKnowledgeStates.set(key, updated)
          return Promise.resolve(updated)
        } else {
          const record: UserKnowledgeState = {
            ...create,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          mockData.userKnowledgeStates.set(key, record)
          return Promise.resolve(record)
        }
      },
    },
    banditArmStats: {
      findUnique({ where }): Promise<BanditArmStats | null> {
        const key = `${where.userId_conceptKey_itemId.userId}:${where.userId_conceptKey_itemId.conceptKey}:${where.userId_conceptKey_itemId.itemId}`
        return Promise.resolve(mockData.banditArmStats.get(key) ?? null)
      },
      create({ data }): Promise<BanditArmStats> {
        const key = `${data.userId}:${data.conceptKey}:${data.itemId}`
        const record: BanditArmStats = {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        mockData.banditArmStats.set(key, record)
        return Promise.resolve(record)
      },
      update({ where, data }): Promise<BanditArmStats> {
        const key = `${where.userId_conceptKey_itemId.userId}:${where.userId_conceptKey_itemId.conceptKey}:${where.userId_conceptKey_itemId.itemId}`
        const existing = mockData.banditArmStats.get(key)
        if (!existing) throw new Error('Record not found')
        const updated = { ...existing, ...data, updatedAt: new Date() }
        mockData.banditArmStats.set(key, updated)
        return Promise.resolve(updated)
      },
      findMany({ where } = {}): Promise<BanditArmStats[]> {
        const results = Array.from(mockData.banditArmStats.values())
        if (!where) return Promise.resolve(results)
        const filtered = results.filter((record) => matchesFilter(record, where))
        return Promise.resolve(filtered)
      },
      upsert({ where, create, update }): Promise<BanditArmStats> {
        const key = `${where.userId_conceptKey_itemId.userId}:${where.userId_conceptKey_itemId.conceptKey}:${where.userId_conceptKey_itemId.itemId}`
        const existing = mockData.banditArmStats.get(key)
        if (existing) {
          const updated = { ...existing, ...update, updatedAt: new Date() }
          mockData.banditArmStats.set(key, updated)
          return Promise.resolve(updated)
        } else {
          const record: BanditArmStats = {
            ...create,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          mockData.banditArmStats.set(key, record)
          return Promise.resolve(record)
        }
      },
    },
    learningEvent: {
      create({ data }): Promise<LearningEvent> {
        const id = Math.random().toString(36).substring(7)
        const record: LearningEvent = {
          ...data,
          id,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        mockData.learningEvents.set(id, record)
        return Promise.resolve(record)
      },
      findMany({ where, orderBy, take } = {}): Promise<LearningEvent[]> {
        let results = Array.from(mockData.learningEvents.values())

        if (where) {
          results = results.filter((record) => matchesFilter(record, where))
        }

        if (orderBy) {
          const entries = Object.entries(orderBy)
          const [field, direction] = entries[0] ?? []
          if (
            typeof field === 'string' &&
            field.length > 0 &&
            (direction === 'asc' || direction === 'desc')
          ) {
            results.sort((a, b) => {
              const fieldKey = field as keyof LearningEvent
              const aVal = a[fieldKey]
              const bVal = b[fieldKey]
              return compareValues(aVal, bVal, direction)
            })
          }
        }

        if (typeof take === 'number' && take > 0) {
          results = results.slice(0, take)
        }

        return Promise.resolve(results)
      },
    },
    spacedRepetition: {
      findUnique({ where }): Promise<SpacedRepetition | null> {
        const key = `${where.userId_conceptKey_itemId.userId}:${where.userId_conceptKey_itemId.conceptKey}:${where.userId_conceptKey_itemId.itemId}`
        return Promise.resolve(mockData.spacedRepetitions.get(key) ?? null)
      },
      create({ data }): Promise<SpacedRepetition> {
        const key = `${data.userId}:${data.conceptKey}:${data.itemId}`
        const record: SpacedRepetition = {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        mockData.spacedRepetitions.set(key, record)
        return Promise.resolve(record)
      },
      update({ where, data }): Promise<SpacedRepetition> {
        const key = `${where.userId_conceptKey_itemId.userId}:${where.userId_conceptKey_itemId.conceptKey}:${where.userId_conceptKey_itemId.itemId}`
        const existing = mockData.spacedRepetitions.get(key)
        if (!existing) throw new Error('Record not found')
        const updated = { ...existing, ...data, updatedAt: new Date() }
        mockData.spacedRepetitions.set(key, updated)
        return Promise.resolve(updated)
      },
      findMany({ where, orderBy } = {}): Promise<SpacedRepetition[]> {
        let results = Array.from(mockData.spacedRepetitions.values())

        if (where) {
          results = results.filter((record) => matchesFilter(record, where))
        }

        if (orderBy) {
          const entries = Object.entries(orderBy)
          const [field, direction] = entries[0] ?? []
          if (
            typeof field === 'string' &&
            field.length > 0 &&
            (direction === 'asc' || direction === 'desc')
          ) {
            results.sort((a, b) => {
              const fieldKey = field as keyof SpacedRepetition
              const aVal = a[fieldKey]
              const bVal = b[fieldKey]
              return compareValues(aVal, bVal, direction)
            })
          }
        }

        return Promise.resolve(results)
      },
      upsert({ where, create, update }): Promise<SpacedRepetition> {
        const key = `${where.userId_conceptKey_itemId.userId}:${where.userId_conceptKey_itemId.conceptKey}:${where.userId_conceptKey_itemId.itemId}`
        const existing = mockData.spacedRepetitions.get(key)
        if (existing) {
          const updated = { ...existing, ...update, updatedAt: new Date() }
          mockData.spacedRepetitions.set(key, updated)
          return Promise.resolve(updated)
        } else {
          const record: SpacedRepetition = {
            ...create,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          mockData.spacedRepetitions.set(key, record)
          return Promise.resolve(record)
        }
      },
    },
    user: {
      findUnique({ where }): Promise<User | null> {
        return Promise.resolve(mockData.users.get(where.id) ?? null)
      },
      create({ data }): Promise<User> {
        const record: User = {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        mockData.users.set(data.id, record)
        return Promise.resolve(record)
      },
      update({ where, data }): Promise<User> {
        const existing = mockData.users.get(where.id)
        if (!existing) throw new Error('Record not found')
        const updated = { ...existing, ...data, updatedAt: new Date() }
        mockData.users.set(where.id, updated)
        return Promise.resolve(updated)
      },
    },
  }
}

// Add disconnect method to the interface
export interface PrismaClientWithDisconnect extends PrismaClient {
  $disconnect: () => Promise<void>
}

// Update the mock to include disconnect
export const createMockPrismaClientWithDisconnect = (): PrismaClientWithDisconnect => {
  const mockClient = createMockPrismaClient()
  return {
    ...mockClient,
    $disconnect(): Promise<void> {
      // Mock disconnect - no-op for development
      return Promise.resolve()
    },
  }
}
