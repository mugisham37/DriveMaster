export function hashQueryKey(key: unknown[]): string {
  return JSON.stringify(key)
}