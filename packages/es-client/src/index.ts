import { Client } from '@elastic/elasticsearch'

export function createES(node: string) {
  const client = new Client({ node })
  return client
}