import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import type { RailsExerciseResponse } from '@/types/api'

/**
 * Track exercises API route matching Rails exercises controller
 * GET /api/tracks/[slug]/exercises - List exercises for a track
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const trackSlug = params.slug
    const { searchParams } = new URL(request.url)
    const criteria = searchParams.get('criteria') || ''
    const status = searchParams.get('status') || ''
    const difficulty = searchParams.get('difficulty') || ''
    
    const session = await getServerAuthSession()
    
    // Connect to Rails API to fetch exercises data
    const railsApiUrl = process.env.RAILS_API_URL || 'http://localhost:3000'
    
    try {
      const queryParams = new URLSearchParams()
      if (criteria) queryParams.append('criteria', criteria)
      if (status) queryParams.append('status', status)
      if (difficulty) queryParams.append('difficulty', difficulty)
      
      const response = await fetch(`${railsApiUrl}/api/v1/tracks/${trackSlug}/exercises?${queryParams}`, {
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
          { error: 'Failed to fetch exercises' },
          { status: response.status }
        )
      }
      
      const exercisesData = await response.json()
      
      // Return exercises data in Rails-compatible format
      return NextResponse.json({
        exercises: exercisesData.exercises.map((exercise: RailsExerciseResponse) => ({
          slug: exercise.slug,
          title: exercise.title,
          iconUrl: exercise.icon_url,
          difficulty: exercise.difficulty,
          blurb: exercise.blurb,
          isUnlocked: exercise.is_unlocked,
          isCompleted: exercise.is_completed,
          isPublished: exercise.is_published,
          hasApproaches: exercise.has_approaches,
          hasArticle: exercise.has_article,
          numSolutions: exercise.num_solutions,
          completedAt: exercise.completed_at,
          links: {
            self: `/tracks/${trackSlug}/exercises/${exercise.slug}`,
            approaches: exercise.has_approaches ? `/tracks/${trackSlug}/exercises/${exercise.slug}/approaches` : null,
            article: exercise.has_article ? `/tracks/${trackSlug}/exercises/${exercise.slug}/article` : null
          }
        })),
        numExercises: exercisesData.num_exercises || exercisesData.exercises.length
      })
      
    } catch (fetchError) {
      console.error('Rails API connection error:', fetchError)
      
      // Fallback mock data for development
      const mockExercises = [
        {
          slug: 'hello-world',
          title: 'Hello World',
          iconUrl: '/assets/exercises/hello-world.svg',
          difficulty: 1,
          blurb: 'The classical introductory exercise.',
          isUnlocked: true,
          isCompleted: false,
          isPublished: true,
          hasApproaches: false,
          hasArticle: true,
          numSolutions: 1000,
          completedAt: null,
          links: {
            self: `/tracks/${trackSlug}/exercises/hello-world`,
            approaches: null,
            article: `/tracks/${trackSlug}/exercises/hello-world/article`
          }
        },
        {
          slug: 'two-fer',
          title: 'Two Fer',
          iconUrl: '/assets/exercises/two-fer.svg',
          difficulty: 2,
          blurb: 'Create a sentence of the form "One for X, one for me."',
          isUnlocked: true,
          isCompleted: false,
          isPublished: true,
          hasApproaches: true,
          hasArticle: true,
          numSolutions: 800,
          completedAt: null,
          links: {
            self: `/tracks/${trackSlug}/exercises/two-fer`,
            approaches: `/tracks/${trackSlug}/exercises/two-fer/approaches`,
            article: `/tracks/${trackSlug}/exercises/two-fer/article`
          }
        }
      ]
      
      return NextResponse.json({
        exercises: mockExercises,
        numExercises: mockExercises.length
      })
    }
    
  } catch (error) {
    console.error('Exercises fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}