import { Client } from '@elastic/elasticsearch'

export async function fetchCandidateArmIds(es: Client, conceptId: string, mastery: number, size = 20) {
  // Simple mapping: target difficulty around mastery with small band
  const target = Math.max(0, Math.min(1, mastery + 0.1))
  const min = Math.max(0, target - 0.15)
  const max = Math.min(1, target + 0.15)

  const res = await es.search({
    index: 'content-items',
    size,
    query: {
      bool: {
        filter: [
          { term: { concepts: conceptId } },
          { range: { difficulty: { gte: min, lte: max } } }
        ]
      }
    },
    sort: [{ updatedAt: { order: 'desc' } }]
  } as any)
  const hits = (res as any).hits?.hits || []
  return hits.map((h: any) => h._id as string)
}