import { useQuery } from '@tanstack/react-query'
import { MentoredTrack } from '../../../types'
import { Request } from '../../../hooks/request-query'

type UseTrackListOptions = {
  cacheKey: string[]
  request: Request
}

export function useTrackList({ cacheKey, request }: UseTrackListOptions) {
  const {
    data,
    status,
    error,
    isFetching,
  } = useQuery<{ tracks: MentoredTrack[] }>({
    queryKey: cacheKey,
    queryFn: async () => {
      const response = await fetch(request.endpoint)
      return response.json()
    }
  })

  return {
    tracks: data?.tracks || [],
    status,
    error,
    isFetching,
  }
}