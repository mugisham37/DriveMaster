import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MentoredTrack, MentoredTrackExercise } from '../../../types'
import { Request } from '../../../hooks/request-query'

type UseMentoringQueueOptions = {
  request: Request
  track: MentoredTrack
  exercise: MentoredTrackExercise | null
}

export function useMentoringQueue({
  request,
  track,
  exercise,
}: UseMentoringQueueOptions) {
  const [criteria, setCriteria] = useState('')
  const [order, setOrder] = useState('')
  const [page, setPage] = useState(1)

  const { data: resolvedData, status, error, isFetching } = useQuery({
    queryKey: ['mentoring-queue', track.slug, exercise?.slug, criteria, order, page],
    queryFn: () =>
      (request as any).endpoint.request({
        trackSlug: track.slug,
        exerciseSlug: exercise?.slug,
        criteria,
        order,
        page,
      }),
    placeholderData: (previousData) => previousData,
  })

  return {
    resolvedData,
    isFetching,
    criteria,
    setCriteria,
    order,
    setOrder,
    page,
    setPage,
    status,
    error,
  }
}