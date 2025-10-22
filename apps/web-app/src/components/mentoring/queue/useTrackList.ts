import { useQuery } from 'react-query'
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
  } = useQuery<{ tracks: MentoredTrack[] }>(cacheKey, () =>
    request.endpoint.request()
  )

  return {
    tracks: data?.tracks || [],
    status,
    error,
    isFetching,
  }
}