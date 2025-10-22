import { useQuery } from '@tanstack/react-query'
import type { MentorRequest } from '../types/mentoring'

interface Track {
  slug: string
  title: string
}

export function useMentorTracks<T>(request: MentorRequest<T>) {
  return useQuery<Track[]>({
    queryKey: ['mentor-tracks', request],
    queryFn: async () => {
      // Replace with your actual API call
      const response = await fetch('/api/mentoring/tracks')
      const data = await response.json()
      return data as Track[]
    }
  })
}