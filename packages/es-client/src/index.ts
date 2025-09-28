import { Client } from '@elastic/elasticsearch'

export function createEsClient(node: string) {
  return new Client({ node })
}
