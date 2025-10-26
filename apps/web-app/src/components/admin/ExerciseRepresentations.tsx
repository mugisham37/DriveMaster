'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loading } from '@/components/common/Loading'
import { TrackIcon } from '@/components/common/TrackIcon'
import { ExerciseIcon } from '@/components/common/ExerciseIcon'
import { Pagination } from '@/components/common/Pagination'

interface ExerciseRepresentation {
  id: number
  uuid: string
  exercise: {
    slug: string
    title: string
    iconUrl: string
  }
  track: {
    slug: string
    title: string
    iconUrl: string
  }
  numSubmissions: number
  feedback: string | null
  hasFeedback: boolean
  lastSubmittedAt: string
  createdAt: string
}

interface RepresentationsResponse {
  representations: ExerciseRepresentation[]
  meta: {
    currentPage: number
    totalCount: number
    totalPages: number
  }
}

export function ExerciseRepresentations() {
  const [currentPage, setCurrentPage] = useState(1)
  const [trackFilter, setTrackFilter] = useState('')
  const [feedbackFilter, setFeedbackFilter] = useState('all')

  const { data, isLoading, error } = useQuery<RepresentationsResponse>({
    queryKey: ['admin', 'representations', currentPage, trackFilter, feedbackFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        ...(trackFilter && { track: trackFilter }),
        feedback: feedbackFilter
      })
      
      const response = await fetch(`/api/admin/representations?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch representations')
      }
      return response.json()
    }
  })

  const handleAddFeedback = async (representationId: number) => {
    const feedback = prompt('Enter feedback for this representation:')
    if (!feedback) return

    try {
      const response = await fetch(`/api/admin/representations/${representationId}/feedback`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ feedback })
      })

      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to add feedback:', error)
    }
  }

  if (isLoading) {
    return <Loading />
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-textColor6">Failed to load exercise representations.</p>
      </div>
    )
  }

  const representations = data?.representations || []
  const meta = data?.meta || { currentPage: 1, totalCount: 0, totalPages: 1 }

  return (
    <div className="exercise-representations">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-h2">Exercise Representations</h2>
        
        <div className="flex items-center gap-4">
          <select
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
            className="form-select"
          >
            <option value="">All Tracks</option>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="ruby">Ruby</option>
            <option value="java">Java</option>
          </select>
          
          <select
            value={feedbackFilter}
            onChange={(e) => setFeedbackFilter(e.target.value)}
            className="form-select"
          >
            <option value="all">All Representations</option>
            <option value="with_feedback">With Feedback</option>
            <option value="without_feedback">Without Feedback</option>
          </select>
        </div>
      </div>

      <div className="representations-table bg-backgroundColorA border border-borderColor7 rounded-lg overflow-hidden">
        <div className="grid grid-cols-6 gap-4 p-4 bg-backgroundColorB border-b border-borderColor7 text-14 font-medium text-textColor6">
          <div>Exercise</div>
          <div>Track</div>
          <div>Submissions</div>
          <div>Feedback</div>
          <div>Last Submitted</div>
          <div>Actions</div>
        </div>

        {representations.map((representation) => (
          <div key={representation.id} className="grid grid-cols-6 gap-4 p-4 border-b border-borderColor7 last:border-b-0 items-center">
            <div className="flex items-center gap-3">
              <ExerciseIcon iconUrl={representation.exercise.iconUrl} className="w-8 h-8" />
              <div>
                <div className="font-medium text-textColor2">{representation.exercise.title}</div>
                <div className="text-13 text-textColor6">{representation.exercise.slug}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <TrackIcon iconUrl={representation.track.iconUrl} title={representation.track.title} className="w-6 h-6" />
              <span className="text-textColor2">{representation.track.title}</span>
            </div>
            
            <div className="text-textColor2">{representation.numSubmissions}</div>
            
            <div>
              {representation.hasFeedback ? (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Has Feedback
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  No Feedback
                </span>
              )}
            </div>
            
            <div className="text-13 text-textColor6">
              {new Date(representation.lastSubmittedAt).toLocaleDateString()}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAddFeedback(representation.id)}
                className="btn-xs btn-primary"
              >
                {representation.hasFeedback ? 'Edit Feedback' : 'Add Feedback'}
              </button>
              <button className="btn-xs btn-secondary">
                View
              </button>
            </div>
          </div>
        ))}
      </div>

      {meta.totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            current={meta.currentPage}
            total={meta.totalPages}
            setPage={setCurrentPage}
          />
        </div>
      )}
    </div>
  )
}