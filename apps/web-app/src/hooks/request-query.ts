// Request query hooks to preserve exact behavior from Rails implementation
import { useQuery } from '@tanstack/react-query'

export type Request<T = any> = {
  endpoint: string
  options?: any
  query?: T
}

export function usePaginatedRequestQuery<T>(
  key: any[],
  request: Request
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