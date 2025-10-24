'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loading } from '@/components/common/Loading'
import { TrackIcon } from '@/components/common/TrackIcon'
import { Pagination } from '@/components/common/Pagination'

interface Track {
  id: number
  slug: string
  title: string
  iconUrl: string
  isActive: boolean
  numExercises: number
  numStudents: number
  numMentors: number
  lastUpdated: string
}

interface TracksResponse {
  tracks: Track[]
  meta: {
    currentPage: number
    totalCount: number
    totalPages: number
  }
}

export function TrackManagement() {
  const [currentPage, setCurrentPage] = useState(1)
  const [filter, setFilter] = useState('all')

  const { data, isLoading, error } = useQuery<TracksResponse>({
    queryKey: ['admin', 'tracks', currentPage, filter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        filter
      })
      
      const response = await fetch(`/api/admin/tracks?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch tracks')
      }
      return response.json()
    }
  })

  const handleToggleTrack = async (trackId: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/tracks/${trackId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !isActive })
      })

      if (response.ok) {
        // Refetch data
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to toggle track:', error)
    }
  }

  if (isLoading) {
    return <Loading />
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-textColor6">Failed to load tracks.</p>
      </div>
    )
  }

  const tracks = data?.tracks || []
  const meta = data?.meta || { currentPage: 1, totalCount: 0, totalPages: 1 }

  return (
    <div className="track-management">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-h2">Track Management</h2>
        
        <div className="flex items-center gap-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="form-select"
          >
            <option value="all">All Tracks</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
          
          <button className="btn-primary btn-s">
            Add New Track
          </button>
        </div>
      </div>

      <div className="tracks-table bg-backgroundColorA border border-borderColor7 rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 gap-4 p-4 bg-backgroundColorB border-b border-borderColor7 text-14 font-medium text-textColor6">
          <div>Track</div>
          <div>Status</div>
          <div>Exercises</div>
          <div>Students</div>
          <div>Mentors</div>
          <div>Last Updated</div>
          <div>Actions</div>
        </div>

        {tracks.map((track) => (
          <div key={track.id} className="grid grid-cols-7 gap-4 p-4 border-b border-borderColor7 last:border-b-0 items-center">
            <div className="flex items-center gap-3">
              <TrackIcon iconUrl={track.iconUrl} title={track.title} className="w-8 h-8" />
              <div>
                <div className="font-medium text-textColor2">{track.title}</div>
                <div className="text-13 text-textColor6">{track.slug}</div>
              </div>
            </div>
            
            <div>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-12 font-medium ${
                track.isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {track.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div className="text-textColor2">{track.numExercises}</div>
            <div className="text-textColor2">{track.numStudents.toLocaleString()}</div>
            <div className="text-textColor2">{track.numMentors}</div>
            <div className="text-13 text-textColor6">
              {new Date(track.lastUpdated).toLocaleDateString()}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggleTrack(track.id, track.isActive)}
                className={`btn-xs ${track.isActive ? 'btn-secondary' : 'btn-primary'}`}
              >
                {track.isActive ? 'Deactivate' : 'Activate'}
              </button>
              <button className="btn-xs btn-secondary">
                Edit
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