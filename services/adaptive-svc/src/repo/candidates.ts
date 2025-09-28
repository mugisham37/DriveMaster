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

export async function fetchCandidateDetails(es: Client, ids: string[]) {
  if (ids.length === 0) return []
  const res: any = await (es as any).mget({ index: 'content-items', ids })
  const docs: any[] = (res?.docs || []).filter((d: any) => d.found)
  return docs.map((d: any) => ({ id: d._id as string, irtA: d._source?.irtA ?? null, irtB: d._source?.irtB ?? null, irtC: d._source?.irtC ?? null }))
}
