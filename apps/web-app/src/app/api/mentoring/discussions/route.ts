import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'

/**
 * Mentoring discussions API route matching Rails mentoring/discussions controller
 * GET /api/mentoring/discussions - List mentor discussions
 * POST /api/mentoring/discussions - Create new discussion
 */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    
    // Mentoring requires authentication
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const trackSlug = searchParams.get('track_slug') || ''
    const page = searchParams.get('page') || '1'
    
    // Connect to Rails API to fetch discussions data
    const railsApiUrl = process.env.RAILS_API_URL || 'http://localhost:3000'
    
    try {
      const queryParams = new URLSearchParams()
      if (status !== 'all') queryParams.append('status', status)
      if (trackSlug) queryParams.append('track_slug', trackSlug)
      queryParams.append('page', page)
      
      const response = await fetch(`${railsApiUrl}/api/v1/mentoring/discussions?${queryParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.user.id}`
        }
      })
      
      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch discussions' },
          { status: response.status }
        )
      }
      
      const discussionsData = await response.json()
      
      // Return discussions data in Rails-compatible format
      return NextResponse.json({
        discussions: discussionsData.discussions?.map((discussion: any) => ({
          uuid: discussion.uuid,
          student: {
            handle: discussion.student?.handle,
            avatarUrl: discussion.student?.avatar_url,
            flair: discussion.student?.flair
          },
          exercise: {
            title: discussion.exercise?.title,
            iconUrl: discussion.exercise?.icon_url,
            slug: discussion.exercise?.slug
          },
          track: {
            title: discussion.track?.title,
            iconUrl: discussion.track?.icon_url,
            slug: discussion.track?.slug
          },
          isFinished: discussion.is_finished,
          isStale: discussion.is_stale,
          postsCount: discussion.posts_count,
          iterationsCount: discussion.iterations_count,
          updatedAt: discussion.updated_at,
          createdAt: discussion.created_at,
          links: {
            self: `/mentoring/discussions/${discussion.uuid}`,
            posts: `/mentoring/discussions/${discussion.uuid}/posts`
          }
        })) || [],
        meta: {
          currentPage: discussionsData.meta?.current_page || 1,
          totalPages: discussionsData.meta?.total_pages || 1,
          totalCount: discussionsData.meta?.total_count || 0
        }
      })
      
    } catch (fetchError) {
      console.error('Rails API connection error:', fetchError)
      
      // Fallback mock data for development
      return NextResponse.json({
        discussions: [],
        meta: {
          currentPage: 1,
          totalPages: 1,
          totalCount: 0
        }
      })
    }
    
  } catch (error) {
    console.error('Discussions fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    
    // Mentoring requires authentication
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const requestData = await request.json()
    const { exerciseSlug, trackSlug, iterationUuid } = requestData
    
    if (!exerciseSlug || !trackSlug || !iterationUuid) {
      return NextResponse.json(
        { error: 'Missing required fields: exerciseSlug, trackSlug, iterationUuid' },
        { status: 400 }
      )
    }
    
    // Connect to Rails API to create discussion
    const railsApiUrl = process.env.RAILS_API_URL || 'http://localhost:3000'
    
    try {
      const response = await fetch(`${railsApiUrl}/api/v1/mentoring/discussions`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.user.id}`
        },
        body: JSON.stringify({
          exercise_slug: exerciseSlug,
          track_slug: trackSlug,
          iteration_uuid: iterationUuid
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
          { error: 'Failed to create discussion' },
          { status: response.status }
        )
      }
      
      const discussionData = await response.json()
      
      return NextResponse.json({
        uuid: discussionData.uuid,
        student: {
          handle: discussionData.student?.handle,
          avatarUrl: discussionData.student?.avatar_url,
          flair: discussionData.student?.flair
        },
        exercise: {
          title: discussionData.exercise?.title,
          iconUrl: discussionData.exercise?.icon_url,
          slug: discussionData.exercise?.slug
        },
        track: {
          title: discussionData.track?.title,
          iconUrl: discussionData.track?.icon_url,
          slug: discussionData.track?.slug
        },
        isFinished: false,
        isStale: false,
        postsCount: 0,
        iterationsCount: 1,
        updatedAt: discussionData.updated_at,
        createdAt: discussionData.created_at,
        links: {
          self: `/mentoring/discussions/${discussionData.uuid}`,
          posts: `/mentoring/discussions/${discussionData.uuid}/posts`
        }
      }, { status: 201 })
      
    } catch (fetchError) {
      console.error('Rails API connection error:', fetchError)
      
      return NextResponse.json(
        { error: 'Failed to create discussion' },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('Discussion creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}