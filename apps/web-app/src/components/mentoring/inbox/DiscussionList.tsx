import React from 'react'
import { LoadingSpinner } from '../../common/LoadingSpinner'
import type { Discussion } from '@/components/types'
import { Pagination } from '../../common/Pagination'

interface Props {
  resolvedData: {
    results: Discussion[]
    meta: {
      currentPage: number
      totalPages: number
    }
  } | null
  status: 'idle' | 'loading' | 'error' | 'success'
  setPage: (page: number) => void
  refetch?: () => void
  links?: {
    queue: string
  }
}

export function DiscussionList({ resolvedData, status, setPage }: Props): React.JSX.Element {
  if (status === 'loading' || !resolvedData) {
    return <LoadingSpinner />
  }

  return (
    <div className="discussion-list">
      {resolvedData.results.map((discussion) => (
        <div key={discussion.id} className="discussion-item">
          <h3>{discussion.title}</h3>
          <div className="metadata">
            <span>Track: {discussion.track.title}</span>
            <span>Exercise: {discussion.exercise.title}</span>
            <span>Student: {discussion.student.handle}</span>
          </div>
          <a href={discussion.links.self} className="view-discussion">
            View Discussion
          </a>
        </div>
      ))}
      <Pagination
        current={resolvedData.meta.currentPage}
        total={resolvedData.meta.totalPages}
        setPage={setPage}
      />
    </div>
  )
}