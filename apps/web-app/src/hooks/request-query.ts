import { useQuery, UseQueryResult, UseQueryOptions } from '@tanstack/react-query'

export interface Request<TData = unknown> {
  endpoint: string
  query?: Record<string, unknown>
  options?: {
    enabled?: boolean
    staleTime?: number
    gcTime?: number // Renamed from cacheTime in newer versions
    initialData?: TData | undefined
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
  request: Request<TData>
): UseQueryResult<TData, TError> {
  const queryOptions: UseQueryOptions<TData, TError> = {
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
    ...(request.options?.gcTime !== undefined && { gcTime: request.options.gcTime }),
    ...(request.options?.initialData !== undefined && { initialData: request.options.initialData }),
  }

  return useQuery(queryOptions)
}

export function useRequestQuery<TData, TError = Error>(
  queryKey: unknown[],
  request: Request<TData>
): UseQueryResult<TData, TError> {
  return usePaginatedRequestQuery<TData, TError>(queryKey, request)
}