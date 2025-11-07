import { useQuery } from '@tanstack/react-query'

interface MentorRequest {
  endpoint: string
}

interface MentorTrack {
  slug: string
  title: string
  iconUrl: string
}

export function useMentorTracks(request: MentorRequest) {
  return useQuery({
    queryKey: ['mentor-tracks', request.endpoint],
    queryFn: async (): Promise<MentorTrack[]> => {
      const response = await fetch(request.endpoint)
      if (!response.ok) {
        throw new Error('Failed to fetch mentor tracks')
      }
      const data = await response.json()
      return data.tracks || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
  })
}