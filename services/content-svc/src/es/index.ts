import { Client } from '@elastic/elasticsearch'

export async function ensureContentIndex(es: Client) {
  const index = 'content-items'
  const exists = await es.indices.exists({ index })
  if ((exists as any).body === true || exists === true) return

  await es.indices.create({
    index,
    settings: {
      analysis: {
        analyzer: {
          dm_english: {
            type: 'standard',
            stopwords: '_english_'
          },
          dm_edge: {
            type: 'custom',
            tokenizer: 'standard',
            filter: ['lowercase', 'edge_ngram_filter']
          }
        },
        filter: {
          edge_ngram_filter: {
            type: 'edge_ngram',
            min_gram: 2,
            max_gram: 15
          }
        }
      }
    },
    mappings: {
      properties: {
        slug: { type: 'keyword' },
        title: { type: 'text', analyzer: 'dm_english', fields: { raw: { type: 'keyword' } } },
        body: { type: 'text', analyzer: 'dm_english' },
        concepts: { type: 'keyword' },
        difficulty: { type: 'float' },
        version: { type: 'integer' },
        variantKey: { type: 'keyword' },
        updatedAt: { type: 'date' }
      }
    }
  } as any)
}