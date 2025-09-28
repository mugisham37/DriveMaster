import Redis from 'ioredis'

export function createRedis(url: string) {
  return new Redis(url)
}
