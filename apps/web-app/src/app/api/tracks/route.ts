import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import type { RailsTrackResponse } from '@/types/api'

/**
 * Tracks API route matching Rails tracks controller
 * GET /api/tracks - List all tracks with optional filtering
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const criteria = searchParams.get('criteria') || ''
    const tags = searchParams.get('tags') || ''
    const status = searchParams.get('status') || ''
    
    // Optional authentication for personalized data
    const user = await getCurrentUser()
    
    // Connect to Rails API to fetch tracks data
    const railsApiUrl = process.env.RAILS_API_URL || 'http://localhost:3000'
    
    try {
      const queryParams = new URLSearchParams()
      if (criteria) queryParams.append('criteria', criteria)
      if (tags) queryParams.append('tags', tags)
      if (status) queryParams.append('status', status)
      
      const response = await fetch(`${railsApiUrl}/api/v1/tracks?${queryParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(user && { 'Authorization': `Bearer ${user.id}` })
        }
      })
      
      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch tracks' },
          { status: response.status }
        )
      }
      
      const tracksData = await response.json()
      
      // Return tracks data in Rails-compatible format
      return NextResponse.json({
        tracks: tracksData.tracks.map((track: RailsTrackResponse) => ({
          slug: track.slug,
          title: track.title,
          iconUrl: track.icon_url,
          course: track.course,
          numConcepts: track.num_concepts,
          numExercises: track.num_exercises,
          numSolutions: track.num_solutions,
          tags: track.tags || [],
          links: {
            self: `/tracks/${track.slug}`,
            exercises: `/tracks/${track.slug}/exercises`,
            concepts: `/tracks/${track.slug}/concepts`
          }
        })),
        numTracks: tracksData.num_tracks,
        trackIconUrls: tracksData.track_icon_urls || []
      })
      
    } catch (fetchError) {
      console.error('Rails API connection error:', fetchError)
      
      // Fallback mock data for development
      const mockTracks = [
        {
          slug: 'javascript',
          title: 'JavaScript',
          iconUrl: '/assets/tracks/javascript.svg',
          course: true,
          numConcepts: 25,
          numExercises: 140,
          numSolutions: 50000,
          tags: ['popular', 'web'],
          links: {
            self: '/tracks/javascript',
            exercises: '/tracks/javascript/exercises',
            concepts: '/tracks/javascript/concepts'
          }
        },
        {
          slug: 'python',
          title: 'Python',
          iconUrl: '/assets/tracks/python.svg',
          course: true,
          numConcepts: 30,
          numExercises: 120,
          numSolutions: 45000,
          tags: ['popular', 'data-science'],
          links: {
            self: '/tracks/python',
            exercises: '/tracks/python/exercises',
            concepts: '/tracks/python/concepts'
          }
        }
      ]
      
      return NextResponse.json({
        tracks: mockTracks,
        numTracks: 67,
        trackIconUrls: mockTracks.slice(0, 8).map(track => track.iconUrl)
      })
    }
    
  } catch (error) {
    console.error('Tracks fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}