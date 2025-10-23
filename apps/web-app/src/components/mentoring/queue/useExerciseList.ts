import { useQuery } from '@tanstack/react-query'
import { MentoredTrack, MentoredTrackExercise } from '../../../types'

type UseExerciseListOptions = {
  track: MentoredTrack
}

export function useExerciseList({ track }: UseExerciseListOptions) {
  const {
    data,
    status,
    error,
  } = useQuery<{ exercises: MentoredTrackExercise[] }>(
    ['mentored-exercises', track.slug],
    async () => {
      const response = await fetch(`/api/v1/tracks/${track.slug}/exercises`)
      return response.json()
    }
  )

  return {
    exercises: data?.exercises || [],
    status,
    error,
  }
}