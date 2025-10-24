import { useCallback, useEffect, useRef, useState } from 'react'
import { usePaginatedRequestQuery, type Request } from '@/hooks/request-query'
import { useList } from '@/hooks/use-list'
import { useQueryParams } from '@/hooks/use-query-params'
import type { CommunityVideoType, VideoTrack } from '@/types'

export type APIResponse = {
  results: CommunityVideoType[]
  meta: {
    currentPage: number
    totalCount: number
    totalPages: number
    unscopedTotal: number
  }
}

export type HandleTrackChangeType = (track: VideoTrack) => void

export type UseVideoGridReturnType = {
  handleTrackChange: HandleTrackChangeType
  selectedTrack: VideoTrack
  resolvedData: APIResponse | undefined
  isFetching: boolean
  page: number
  setPage: (page: number) => void
  criteria: string
  setCriteria: (criteria: string) => void
  request: Request
}

export function useVideoGrid(
  videoRequest: Request,
  tracks: VideoTrack[]
): UseVideoGridReturnType {
  const initialTrack =
    tracks.find((t) => t.slug === videoRequest.query?.videoTrackSlug) ||
    tracks[0]

  const [criteria, setCriteria] = useState(videoRequest.query?.criteria as string || '')
  const [selectedTrack, setSelectedTrack] = useState<VideoTrack>(() => {
    const track = initialTrack || tracks[0]
    if (!track) {
      throw new Error('No tracks available')
    }
    return track
  })

  const {
    request,
    setCriteria: setRequestCriteria,
    setPage,
    setQuery,
  } = useList(videoRequest)

  const { data: resolvedData, isFetching } =
    usePaginatedRequestQuery<APIResponse>(
      [
        'community-video-grid-key',
        request.query?.criteria,
        request.query?.videoTrackSlug,
        request.query?.videoPage,
      ],
      request
    )

  const handlePageChange = useCallback(
    (page: number) => {
      setPage(page)
      const queryObject = Object.assign(request.query || {}, { videoPage: page })
      setQuery(queryObject)
    },
    [request.query, setPage, setQuery]
  )

  // don't refetch everything with an empty criteria after mounting
  const didMount = useRef(false)
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true
      return
    }

    const handler = setTimeout(() => {
      if (criteria === undefined || criteria === null) return
      if (criteria.length > 2 || criteria === '') {
        setRequestCriteria(criteria)
        setQuery({ ...(request.query || {}), criteria })
      }
    }, 500)

    return () => {
      clearTimeout(handler)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criteria])

  const handleTrackChange = useCallback(
    (track: VideoTrack) => {
      handlePageChange(1)
      setCriteria('')
      setSelectedTrack(track)

      setQuery({
        ...(request.query || {}),
        videoTrackSlug: track.slug,
        videoPage: 1,
      })
    },
    [handlePageChange, setQuery, request.query]
  )

  useQueryParams(request.query as Record<string, string> || {})

  return {
    handleTrackChange,
    selectedTrack,
    resolvedData,
    isFetching,
    page: (request.query?.videoPage as number) || 1,
    setPage: handlePageChange,
    criteria: (request.query?.criteria as string) || '',
    setCriteria,
    request,
  }
}
