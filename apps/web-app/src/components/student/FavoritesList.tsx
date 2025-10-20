'use client'

import { useState } from 'react'
import Link from 'next/link'

interface Track {
  slug: string
  title: string
  iconUrl: string
  numSolutions: number
}

interface FavoritesListProps {
  tracks: Track[]
  request: {
    endpoint: string
    query: {
      criteria: string
      trackSlug: string
      page: number
    }
    options: {
      initialData: {
        results: Array<Record<string, unknown>>
        meta: {
          currentPage: number
          totalCount: number
          totalPages: number
          unscopedTotal: number
        }
      }
    }
  }
  isUserInsider: boolean
}

export function FavoritesList({ tracks, request, isUserInsider }: FavoritesListProps) {
  const [selectedTrack, setSelectedTrack] = useState('')
  const [searchCriteria, setSearchCriteria] = useState('')

  return (
    <div className="favorites-list">
      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <select
          value={selectedTrack}
          onChange={(e) => setSelectedTrack(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All tracks</option>
          {tracks.map((track) => (
            <option key={track.slug} value={track.slug}>
              {track.title} ({track.numSolutions})
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search favorites..."
          value={searchCriteria}
          onChange={(e) => setSearchCriteria(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Insider Lock Message */}
      {!isUserInsider && (
        <div className="border border-purple-300 bg-purple-50 rounded-lg p-4 mb-6 flex items-center gap-4">
          <div className="text-purple-600 text-2xl">🔒</div>
          <div className="flex-1">
            <p className="text-purple-800 font-medium">
              Unlock the full Favorites functionality with Exercism Insiders.
            </p>
            <p className="text-purple-700 text-sm mt-1">
              <Link href="/insiders" className="font-semibold underline">
                Upgrade your account
              </Link>
              {' '}to store more than 10 favorites and add searching and filtering!
            </p>
          </div>
        </div>
      )}

      {/* Favorites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder for favorites - in real implementation, this would show actual favorites */}
        {Array.from({ length: isUserInsider ? 12 : 3 }, (_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-6 border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">JS</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Hello World</h3>
                <p className="text-sm text-gray-600">JavaScript Track</p>
              </div>
            </div>
            <p className="text-gray-700 text-sm mb-3">
              A clean and elegant solution using modern JavaScript features...
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">by @alice</span>
              <button className="text-yellow-500 hover:text-yellow-600">
                ⭐
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {request.options.initialData.results.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⭐</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No favorites yet
          </h3>
          <p className="text-gray-600 mb-4">
            Star solutions you find interesting while browsing the community solutions.
          </p>
          <Link
            href="/tracks"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Explore Tracks
          </Link>
        </div>
      )}
    </div>
  )
}