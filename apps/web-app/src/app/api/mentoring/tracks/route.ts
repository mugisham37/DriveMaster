import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'

/**
 * Mentoring tracks API route matching Rails mentoring/tracks controller
 * GET /api/mentoring/tracks - List tracks available for mentoring
 */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    
    // Mentoring tracks require authentication and mentor status
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!session.user.isMentor) {
      return NextResponse.json(
        { error: 'Mentor access required' },
        { status: 403 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    
    // Connect to Rails API to fetch mentoring tracks
    const railsApiUrl = process.env.RAILS_API_URL || 'http://localhost:3000'
    
    try {
      const queryParams = new URLSearchParams()
      if (status) queryParams.append('status', status)
      
      const response = await fetch(`${railsApiUrl}/api/v1/mentoring/tracks?${queryParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.user.id}`
        }
      })
      
      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch mentoring tracks' },
          { status: response.status }
        )
      }
      
      const tracksData = await response.json()
      
      // Return tracks data in Rails-compatible format
      return NextResponse.json({
        tracks: tracksData.tracks?.map((track: any) => ({
          slug: track.slug,
          title: track.title,
          iconUrl: track.icon_url,
          numDiscussions: track.num_discussions || 0,
          numStudents: track.num_students || 0,
          numSolutionsQueued: track.num_solutions_queued || 0,
          links: {
            exercises: `/api/mentoring/tracks/${track.slug}/exercises`,
            self: `/tracks/${track.slug}`
          }
        })) || []
      })
      
    } catch (fetchError) {
      console.error('Rails API connection error:', fetchError)
      
      // Fallback mock data for development
      return NextResponse.json({
        tracks: []
      })
    }
    
  } catch (error) {
    console.error('Mentoring tracks fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}