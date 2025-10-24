import { useQuery, UseQueryResult } from '@tanstack/react-query'

export interface Request {
  endpoint: string
  query?: Record<string, unknown>
  options?: {
    enabled?: boolean
    staleTime?: number
    cacheTime?: number
    initialData?: unknown
  }
}

export interface PaginatedResult<T> {
  results: T
  meta: {
    totalPages: number
    unscopedTotal: number
  }
}

export function usePaginatedRequestQuery<TData, TError = Error>(
  queryKey: unknown[],
  request: Request
): UseQueryResult<TData, TError> {
  const queryOptions = {
    queryKey,
    queryFn: async (): Promise<TData> => {
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
      
      return response.json() as Promise<TData>
    },
    ...(request.options?.enabled !== undefined && { enabled: request.options.enabled }),
    ...(request.options?.staleTime !== undefined && { staleTime: request.options.staleTime }),
    ...(request.options?.initialData !== undefined && { initialData: request.options.initialData }),
  }

  return useQuery(queryOptions)
}

export function useRequestQuery<TData, TError = Error>(
  queryKey: unknown[],
  request: Request
): UseQueryResult<TData, TError> {
  return usePaginatedRequestQuery<TData, TError>(queryKey, request)
}