'use client'

import React, { useState, useEffect } from 'react'
import { usePaginatedRequestQuery, type Request as RequestQueryType } from '@/hooks/request-query'
import { useHistory, removeEmpty } from '@/hooks/use-history'
import { useList } from '@/hooks/use-list'
import { ResultsZone } from '../../common/ResultsZone'
import { Introducer } from '../../common/Introducer'
import { RepresentationsList } from './RepresentationsList'
import type { ExerciseRepresentation } from '../../../types'

interface Track {
  slug: string
  title: string
  iconUrl: string
}

export type SortOption = {
  value: string
  label: string
}

export type APIResponse = {
  results: readonly ExerciseRepresentation[]
  meta: {
    currentPage: number
    totalPages: number
    totalCount: number
  }
}

export type AdminRequest = RequestQueryType & {
  query?: {
    onlyMentoredSolutions?: boolean
    criteria?: string
    trackSlug?: string
    order?: string
    page?: number
  }
}

type Links = {
  withoutFeedback: string
  withFeedback: string
  hideIntroducer: string
}

type Props = {
  representationsRequest: AdminRequest
  tracks: readonly Track[]
  counts: Record<string, number>
  links: Links
  sortOptions: readonly SortOption[]
  isIntroducerHidden: boolean
}

export function Admin({
  representationsRequest,
  tracks,
  counts,
  links,
  sortOptions,
  isIntroducerHidden
}: Props): React.JSX.Element {
  const [criteria, setCriteria] = useState(representationsRequest.query?.criteria)
  const [onlyMentoredSolutions, setOnlyMentoredSolutions] = useState(
    representationsRequest.query?.onlyMentoredSolutions || false
  )
  
  const {
    request,
    setCriteria: setRequestCriteria,
    setOrder,
    setPage,
    setQuery,
  } = useList(representationsRequest)

  const {
    status,
    data: resolvedData,
    isFetching,
    refetch,
  } = usePaginatedRequestQuery<APIResponse>(
    ['admin-representations', request.endpoint, JSON.stringify(request.query)],
    {
      endpoint: request.endpoint,
      query: request.query || {},
      ...(request.options && { options: request.options })
    }
  )

  useEffect(() => {
    const handler = setTimeout(() => {
      if (criteria === undefined || criteria === null) return
      setRequestCriteria(criteria)
    }, 200)

    return () => {
      clearTimeout(handler)
    }
  }, [setRequestCriteria, criteria])

  useHistory({ pushOn: removeEmpty(request.query || {}) })

  const setTrack = (trackSlug: string | null) => {
    setQuery({ ...request.query, trackSlug: trackSlug || '', page: 1 })
  }

  const handleMentoredSolutionsToggle = (checked: boolean) => {
    setOnlyMentoredSolutions(checked)
    setQuery({ 
      ...request.query, 
      onlyMentoredSolutions: checked, 
      page: 1 
    })
  }

  return (
    <div className="c-mentor-representations-admin">
      {!isIntroducerHidden && (
        <Introducer
          slug="feedback_automation"
          icon="automation"
        >
          <h3>Automate your mentoring with representations</h3>
          <p>
            Use representations to provide feedback on common solutions automatically.
            This helps you mentor more efficiently and consistently.
          </p>
        </Introducer>
      )}

      <div className="tabs">
        <a 
          href={links.withoutFeedback}
          className="tab"
        >
          Without Feedback
          <div className="count">{counts.without_feedback || 0}</div>
        </a>
        <a 
          href={links.withFeedback}
          className="tab"
        >
          With Feedback
          <div className="count">{counts.with_feedback || 0}</div>
        </a>
        <div className="tab --active">
          Admin
          <div className="count">{counts.admin || 0}</div>
        </div>
      </div>

      <div className="container">
        <header className="c-search-bar">
          <select
            value={(request.query?.trackSlug as string) || ''}
            onChange={(e) => setTrack(e.target.value || null)}
            className="track-selector"
          >
            <option value="">All tracks</option>
            {tracks.map((track) => (
              <option key={track.slug} value={track.slug}>
                {track.title}
              </option>
            ))}
          </select>
          
          <input
            type="text"
            value={criteria || ''}
            onChange={(e) => setCriteria(e.target.value)}
            id="representations-filter"
            placeholder="Filter by exercise name..."
            className="text-filter"
          />

          <label className="checkbox-wrapper">
            <input
              type="checkbox"
              checked={onlyMentoredSolutions}
              onChange={(e) => handleMentoredSolutionsToggle(e.target.checked)}
            />
            Only mentored solutions
          </label>

          <select
            value={(request.query?.order as string) || ''}
            onChange={(e) => setOrder(e.target.value)}
            className="sort-selector"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </header>

        <ResultsZone isFetching={isFetching}>
          <RepresentationsList
            resolvedData={resolvedData}
            status={status === 'pending' ? 'loading' : status}
            refetch={refetch}
            setPage={setPage}
            type="admin"
          />
        </ResultsZone>
      </div>
    </div>
  )
}

export default Admin