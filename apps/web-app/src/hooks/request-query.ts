// Request query hooks to preserve exact behavior from Rails implementation
import { useQuery } from '@tanstack/react-query'

export type Request<T = Record<string, unknown>> = {
  endpoint: string
  options?: Record<string, unknown>
  query?: T
}

export function usePaginatedRequestQuery<T = Record<string, unknown>>(
  key: (string | number | boolean | null | undefined)[],
  request: Request<T>
) {
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const url = new URL(request.endpoint, window.location.origin)
      if (request.query) {
        Object.entries(request.query).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value))
          }
        })
      }
      
      const response = await fetch(url.toString(), {
        credentials: 'same-origin',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      return response.json()
    },
    ...request.options,
  })
}