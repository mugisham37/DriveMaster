import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'

/**
 * Track detail API route matching Rails tracks#show controller
 * GET /api/tracks/[slug] - Get specific track details
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const trackSlug = params.slug
    const session = await getServerAuthSession()
    
    // Connect to Rails API to fetch track data
    const railsApiUrl = process.env.RAILS_API_URL || 'http://localhost:3000'
    
    try {
      const response = await fetch(`${railsApiUrl}/api/v1/tracks/${trackSlug}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(session?.user && { 'Authorization': `Bearer ${session.user.id}` })
        }
      })
      
      if (!response.ok) {
        if (response.status === 404) {
          return NextResponse.json(
            { error: 'Track not found' },
            { status: 404 }
          )
        }
        
        return NextResponse.json(
          { error: 'Failed to fetch track' },
          { status: response.status }
        )
      }
      
      const trackData = await response.json()
      
      // Return track data in Rails-compatible format
      return NextResponse.json({
        slug: trackData.slug,
        title: trackData.title,
        iconUrl: trackData.icon_url,
        course: trackData.course,
        numConcepts: trackData.num_concepts,
        numExercises: trackData.num_exercises,
        numSolutions: trackData.num_solutions,
        description: trackData.description,
        tags: trackData.tags || [],
        concepts: trackData.concepts || [],
        exercises: trackData.exercises || [],
        links: {
          self: `/tracks/${trackData.slug}`,
          exercises: `/tracks/${trackData.slug}/exercises`,
          concepts: `/tracks/${trackData.slug}/concepts`
        }
      })
      
    } catch (fetchError) {
      console.error('Rails API connection error:', fetchError)
      
      // Fallback mock data for development
      const mockTrackData = {
        slug: trackSlug,
        title: trackSlug.charAt(0).toUpperCase() + trackSlug.slice(1),
        iconUrl: `/assets/tracks/${trackSlug}.svg`,
        course: true,
        numConcepts: 25,
        numExercises: 100,
        numSolutions: 10000,
        description: `Learn ${trackSlug} programming with Exercism`,
        tags: ['popular'],
        concepts: [],
        exercises: [],
        links: {
          self: `/tracks/${trackSlug}`,
          exercises: `/tracks/${trackSlug}/exercises`,
          concepts: `/tracks/${trackSlug}/concepts`
        }
      }
      
      return NextResponse.json(mockTrackData)
    }
    
  } catch (error) {
    console.error('Track fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}