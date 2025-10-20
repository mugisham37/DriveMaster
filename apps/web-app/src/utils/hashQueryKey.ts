// Utility function to hash query keys, preserving exact behavior from Rails implementation
export function hashQueryKey(key: unknown): string {
  return JSON.stringify(key)
}