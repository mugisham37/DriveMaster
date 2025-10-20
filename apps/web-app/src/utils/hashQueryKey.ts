// Utility function to hash query keys, preserving exact behavior from Rails implementation
export function hashQueryKey(key: any): string {
  return JSON.stringify(key)
}