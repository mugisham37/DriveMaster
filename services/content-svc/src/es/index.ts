import { Client } from '@elastic/elasticsearch'

const ALIAS = 'content-items'
const INDEX = 'content-items-v1'

export async function ensureContentIndex(es: Client) {
  // Install a simple index template so future indices match mappings
  try {
    await (es as any).indices.putIndexTemplate({
      name: 'content-items-template',
      index_patterns: ['content-items*'],
      priority: 100,
      template: {
        settings: {
          analysis: {
            analyzer: {
              dm_english: { type: 'standard', stopwords: '_english_' },
              dm_edge: { type: 'custom', tokenizer: 'standard', filter: ['lowercase', 'edge_ngram_filter'] }
            },
            filter: { edge_ngram_filter: { type: 'edge_ngram', min_gram: 2, max_gram: 15 } }
          }
        },
        mappings: {
          properties: {
            slug: { type: 'keyword' },
            title: { type: 'text', analyzer: 'dm_english', fields: { raw: { type: 'keyword' } } },
            body: { type: 'text', analyzer: 'dm_english' },
            concepts: { type: 'keyword' },
            difficulty: { type: 'float' },
            irtA: { type: 'float' },
            irtB: { type: 'float' },
            irtC: { type: 'float' },
            version: { type: 'integer' },
            variantKey: { type: 'keyword' },
            updatedAt: { type: 'date' }
          }
        }
      }
    })
  } catch (e) {
    // ignore template errors for idempotency
  }

  // Ensure a base index and alias
  const aliasExists = await (es as any).indices.existsAlias({ name: ALIAS })
  const aliasExistsBool = (aliasExists && aliasExists.body === true) || aliasExists === true
  if (!aliasExistsBool) {
    const indexExists = await es.indices.exists({ index: INDEX })
    const indexExistsBool = (indexExists && (indexExists as any).body === true) || indexExists === true
    if (!indexExistsBool) {
      await es.indices.create({ index: INDEX } as any)
    }
    await es.indices.putAlias({ index: INDEX, name: ALIAS })
  }
}
