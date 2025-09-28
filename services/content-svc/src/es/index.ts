import { Client } from '@elastic/elasticsearch'

const ALIAS = 'content-items'
const WRITE_ALIAS = 'content-items-write'
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

  // Ensure a base index and read/write aliases
  const aliasExists = await (es as any).indices.existsAlias({ name: ALIAS })
  const aliasExistsBool = (aliasExists && aliasExists.body === true) || aliasExists === true
  if (!aliasExistsBool) {
    const indexExists = await es.indices.exists({ index: INDEX })
    const indexExistsBool = (indexExists && (indexExists as any).body === true) || indexExists === true
    if (!indexExistsBool) {
      await es.indices.create({ index: INDEX } as any)
    }
    await es.indices.putAlias({ index: INDEX, name: ALIAS })
    await es.indices.putAlias({ index: INDEX, name: WRITE_ALIAS })
  }
}

export async function rolloverContentIndex(es: Client) {
  // Determine next version
  const aliases = await (es as any).indices.getAlias({ name: ALIAS })
  const indices = Object.keys((aliases as any).body || aliases)
  const current = indices[0]
  const match = current?.match(/^(.*)-v(\d+)$/)
  const base = match ? match[1] : 'content-items'
  const curV = match ? parseInt(match[2], 10) : 1
  const nextName = `${base}-v${curV + 1}`

  // Create new index (template applies), then switch aliases atomically
  await es.indices.create({ index: nextName } as any)
  await es.indices.updateAliases({
    actions: [
      { remove: { index: current, alias: ALIAS } },
      { remove: { index: current, alias: WRITE_ALIAS } },
      { add: { index: nextName, alias: ALIAS } },
      { add: { index: nextName, alias: WRITE_ALIAS } },
    ],
  } as any)

  return { previous: current, next: nextName }
}
