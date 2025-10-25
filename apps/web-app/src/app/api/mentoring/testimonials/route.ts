import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import type { RailsMentoringTestimonialResponse } from '@/types/api'

/**
 * Mentoring testimonials API route matching Rails mentoring/testimonials controller
 * GET /api/mentoring/testimonials - List mentor testimonials
 */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    
    // Mentoring testimonials require authentication and mentor status
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
    const criteria = searchParams.get('criteria') || ''
    const order = searchParams.get('order') || 'unrevealed'
    const trackSlug = searchParams.get('track_slug') || ''
    const page = searchParams.get('page') || '1'
    
    // Connect to Rails API to fetch testimonials
    const railsApiUrl = process.env.RAILS_API_URL || 'http://localhost:3000'
    
    try {
      const queryParams = new URLSearchParams()
      if (criteria) queryParams.append('criteria', criteria)
      if (order) queryParams.append('order', order)
      if (trackSlug) queryParams.append('track_slug', trackSlug)
      queryParams.append('page', page)
      
      const response = await fetch(`${railsApiUrl}/api/v1/mentoring/testimonials?${queryParams}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.user.id}`
        }
      })
      
      if (!response.ok) {
        return NextResponse.json(
          { error: 'Failed to fetch testimonials' },
          { status: response.status }
        )
      }
      
      const testimonialsData = await response.json()
      
      // Return testimonials data in Rails-compatible format
      return NextResponse.json({
        results: testimonialsData.testimonials?.map((testimonial: RailsMentoringTestimonialResponse) => ({
          uuid: testimonial.uuid,
          content: testimonial.content,
          student: {
            handle: testimonial.student?.handle,
            avatarUrl: testimonial.student?.avatar_url,
            flair: testimonial.student?.flair
          },
          exercise: {
            title: testimonial.exercise?.title,
            iconUrl: testimonial.exercise?.icon_url,
            slug: testimonial.exercise?.slug
          },
          track: {
            title: testimonial.track?.title,
            iconUrl: testimonial.track?.icon_url,
            slug: testimonial.track?.slug
          },
          isRevealed: testimonial.is_revealed,
          createdAt: testimonial.created_at,
          links: {
            reveal: `/api/mentoring/testimonials/${testimonial.uuid}/reveal`,
            self: `/mentoring/testimonials/${testimonial.uuid}`
          }
        })) || [],
        meta: {
          currentPage: testimonialsData.meta?.current_page || 1,
          totalPages: testimonialsData.meta?.total_pages || 1,
          totalCount: testimonialsData.meta?.total_count || 0
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
    console.error('Testimonials fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}