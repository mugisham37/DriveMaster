import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'

/**
 * Solutions API proxy endpoint
 * Handles solution submission and retrieval with Rails backend
 */

const RAILS_API_URL = process.env.RAILS_API_URL || 'http://localhost:3000'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const trackSlug = searchParams.get('track_slug')
    const exerciseSlug = searchParams.get('exercise_slug')
    const page = searchParams.get('page') || '1'
    
    // Forward request to Rails API
    const railsUrl = new URL('/api/v1/solutions', RAILS_API_URL)
    if (trackSlug) railsUrl.searchParams.append('track_slug', trackSlug)
    if (exerciseSlug) railsUrl.searchParams.append('exercise_slug', exerciseSlug)
    railsUrl.searchParams.append('page', page)
    
    const response = await fetch(railsUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${session.user.id}`
      }
    })
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch solutions' },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    
    return NextResponse.json({
      solutions: data.solutions?.map((solution: any) => ({
        uuid: solution.uuid,
        exercise: {
          slug: solution.exercise?.slug,
          title: solution.exercise?.title,
          iconUrl: solution.exercise?.icon_url
        },
        track: {
          slug: solution.track?.slug,
          title: solution.track?.title,
          iconUrl: solution.track?.icon_url
        },
        status: solution.status,
        mentoringStatus: solution.mentoring_status,
        publishedAt: solution.published_at,
        completedAt: solution.completed_at,
        updatedAt: solution.updated_at,
        numStars: solution.num_stars,
        numComments: solution.num_comments,
        numIterations: solution.num_iterations,
        links: {
          self: `/tracks/${solution.track?.slug}/exercises/${solution.exercise?.slug}`,
          publicUrl: solution.links?.public_url
        }
      })) || [],
      meta: data.meta || { currentPage: 1, totalPages: 1, totalCount: 0 }
    })
    
  } catch (error) {
    console.error('Solutions fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const requestData = await request.json()
    const { trackSlug, exerciseSlug, files } = requestData
    
    if (!trackSlug || !exerciseSlug || !files) {
      return NextResponse.json(
        { error: 'Missing required fields: trackSlug, exerciseSlug, files' },
        { status: 400 }
      )
    }
    
    // Forward request to Rails API
    const railsUrl = new URL('/api/v1/solutions', RAILS_API_URL)
    
    const response = await fetch(railsUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${session.user.id}`
      },
      body: JSON.stringify({
        track_slug: trackSlug,
        exercise_slug: exerciseSlug,
        files: files
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      if (response.status === 422) {
        return NextResponse.json(
          { error: errorData.message || 'Validation failed' },
          { status: 422 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to submit solution' },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    
    return NextResponse.json({
      uuid: data.uuid,
      status: data.status,
      iterationUuid: data.iteration_uuid,
      submittedAt: data.submitted_at,
      links: {
        self: `/tracks/${trackSlug}/exercises/${exerciseSlug}`,
        iteration: `/tracks/${trackSlug}/exercises/${exerciseSlug}/iterations/${data.iteration_uuid}`
      }
    }, { status: 201 })
    
  } catch (error) {
    console.error('Solution submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}