import { usePaginatedRequestQuery, Request } from './request-query'

export function useContentQuery<T = Record<string, unknown>>(
  key: (string | number | boolean | null | undefined)[],
  request: Request<T>
) {
  return usePaginatedRequestQuery<T>(key, request)
}