import Redis from 'ioredis'

export function createRedis(url: string) {
  const client = new Redis(url)
  client.on('error', (e) => console.error('Redis error', e))
  return client
}