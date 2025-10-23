import { useQuery, UseQueryResult } from '@tanstack/react-query'

export interface Request {
  endpoint: string
  query?: Record<string, any>
}

export interface PaginatedResult<T> {
  results: T
  meta: {
    totalPages: number
    unscopedTotal: number
  }
}

export function usePaginatedRequestQuery<TData, TError = Error>(
  queryKey: any[],
  request: Request
): UseQueryResult<TData, TError> {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const url = new URL(request.endpoint, window.location.origin)
      if (request.query) {
        Object.entries(request.query).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value))
          }
        })
      }
      
      const response = await fetch(url.toString())
      if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`)
      }
      
      return response.json()
    },
  })
}