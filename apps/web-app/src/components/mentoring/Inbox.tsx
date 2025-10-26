'use client'

import React, { useState, useEffect } from 'react'
import { DiscussionList } from './inbox/DiscussionList'
import { StatusTab } from './inbox/StatusTab'
import { TextFilter } from './TextFilter'
import { Sorter } from './Sorter'
import { TrackFilter } from './inbox/TrackFilter'
import {
  usePaginatedRequestQuery,
  type Request as RequestQueryType,
} from '@/hooks/request-query'
import { useHistory, removeEmpty } from '@/hooks/use-history'
import { useList } from '@/hooks/use-list'
import { ResultsZone } from '../ResultsZone'
import type { Discussion, DiscussionStatus } from '../types'
import { useAppTranslation } from '@/i18n/useAppTranslation'

export type SortOption = {
  value: string
  label: string
}

export type APIResponse = {
  results: Discussion[]
  meta: {
    currentPage: number
    totalPages: number
    awaitingMentorTotal: number
    awaitingStudentTotal: number
    finishedTotal: number
  }
}

export type RequestQuery = {
  status: DiscussionStatus
  order?: string | undefined
  criteria?: string | undefined
  page?: number | undefined
  trackSlug?: string | undefined
}

export type MentoringRequest = RequestQueryType & {
  query?: RequestQuery
}

type Links = {
  queue: string
}

export default function Inbox({
  tracksRequest,
  sortOptions,
  discussionsRequest,
  links,
}: {
  tracksRequest: MentoringRequest
  discussionsRequest: MentoringRequest
  sortOptions: readonly SortOption[]
  links: Links
}): React.JSX.Element {
  const { t } = useAppTranslation('components/mentoring/Inboxtsx')
  const [criteria, setCriteria] = useState<string | undefined>(discussionsRequest.query?.criteria as string)
  const {
    request,
    setCriteria: setRequestCriteria,
    setOrder,
    setPage,
    setQuery,
  } = useList(discussionsRequest)
  const {
    status,
    data: resolvedData,
    isFetching,
    refetch,
  } = usePaginatedRequestQuery<APIResponse>(
    ['mentor-discussion-list', request.endpoint, JSON.stringify(request.query)],
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
    const query: MentoringRequest['query'] = {
      ...(request.query || {}),
      trackSlug: trackSlug || undefined,
      page: undefined,
      status: (request.query?.status as DiscussionStatus) || 'awaiting_mentor'
    }
    setQuery(query)
  }

  const setStatus = (status: DiscussionStatus) => {
    const query: MentoringRequest['query'] = {
      ...(request.query || {}),
      status,
      page: undefined
    }
    setQuery(query)
  }

  return (
    <div className="c-mentor-inbox">
      <div className="tabs">
        <StatusTab<DiscussionStatus>
          status="awaiting_mentor"
          currentStatus={(request.query?.status as DiscussionStatus) || 'awaiting_mentor'}
          setStatus={setStatus}
        >
          {t('inbox.inbox')}
          {resolvedData ? (
            <div className="count">{resolvedData.meta.awaitingMentorTotal}</div>
          ) : null}
        </StatusTab>
        <StatusTab<DiscussionStatus>
          status="awaiting_student"
          currentStatus={(request.query?.status as DiscussionStatus) || 'awaiting_mentor'}
          setStatus={setStatus}
        >
          {t('inbox.awaitingStudent')}
          {resolvedData ? (
            <div className="count">
              {resolvedData.meta.awaitingStudentTotal}
            </div>
          ) : null}
        </StatusTab>
        <StatusTab<DiscussionStatus>
          status="finished"
          currentStatus={(request.query?.status as DiscussionStatus) || 'awaiting_mentor'}
          setStatus={setStatus}
        >
          {t('inbox.finished')}
          {resolvedData ? (
            <div className="count">{resolvedData.meta.finishedTotal}</div>
          ) : null}
        </StatusTab>
      </div>
      <div className="container">
        <header className="c-search-bar inbox-header">
          <TrackFilter
            request={{
              endpoint: tracksRequest.endpoint,
              query: { status: (request.query?.status as DiscussionStatus) || 'awaiting_mentor' },
            }}
            value={(request.query?.trackSlug as string) || null}
            setTrack={setTrack}
          />
          <TextFilter
            filter={criteria}
            setFilter={setCriteria}
            id="discussion-filter"
            placeholder={t('inbox.filterByStudentOrExerciseName')}
          />
          <Sorter
            sortOptions={sortOptions}
            order={(request.query?.order as string) || sortOptions[0]?.value || ''}
            setOrder={setOrder}
            setPage={setPage}
          />
        </header>
        <ResultsZone isFetching={isFetching}>
          <DiscussionList
            resolvedData={resolvedData || null}
            status={status === 'pending' ? 'loading' : status}
            refetch={refetch}
            setPage={setPage}
            links={links}
          />
        </ResultsZone>
      </div>
    </div>
  )
}