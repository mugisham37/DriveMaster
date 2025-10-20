import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'

/**
 * Mentoring representations API route matching Rails mentoring/representations controller
 * GET /api/mentoring/representations - List representations without feedback
 */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    
    // Representations require authentication and mentor status
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
    const onlyMentoredSolutions = searchParams.get('only_mentored_solutions') === 'true'
    const criteria = searchParams.get('criteria') || ''
    const trackSlug = searchParams.get('track_slug') || ''
    const order = searchParams.get('order') || 'most_submissions'
    const page = searchParams.get('page') || '1'
    
    // Connect to Rails API to fetch representations
    const railsApiUrl = process.env.RAILS_API_URL || 'http://localhost:3000'
    
    try {
      const queryParams = new URLSearchParams()
      if (onlyMentoredSolutions) queryParams.append('only_mentored_solutions', 'true')
      if (criteria) queryParams.append('criteria', criteria)
      if (trackSlug) queryParams.append('track_slug', trackSlug)
      if (order) queryParams.append('order', order)
      queryParams.append('page', page)
      
      const response = await fetch(`${railsApiUrl}/api/v1/mentoring/representations?${queryParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.user.id}`
        }
      })
      
      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch representations' },
          { status: response.status }
        )
      }
      
      const representationsData = await response.json()
      
      // Return representations data in Rails-compatible format
      return NextResponse.json({
        results: representationsData.representations?.map((representation: any) => ({
          id: representation.id,
          exercise: {
            title: representation.exercise?.title,
            iconUrl: representation.exercise?.icon_url,
            slug: representation.exercise?.slug
          },
          track: {
            title: representation.track?.title,
            iconUrl: representation.track?.icon_url,
            slug: representation.track?.slug
          },
          numSubmissions: representation.num_submissions,
          feedbackType: representation.feedback_type,
          lastSubmittedAt: representation.last_submitted_at,
          appearsFrequently: representation.appears_frequently,
          links: {
            self: `/mentoring/automation/representations/${representation.id}`
          }
        })) || [],
        meta: {
          currentPage: representationsData.meta?.current_page || 1,
          totalPages: representationsData.meta?.total_pages || 1,
          totalCount: representationsData.meta?.total_count || 0
        }
      })
      
    } catch (fetchError) {
      console.error('Rails API connection error:', fetchError)
      
      // Fallback mock data for development
      return NextResponse.json({
        results: [],
        meta: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 0
        }
      })
    }
    
  } catch (error) {
    console.error('Representations fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}