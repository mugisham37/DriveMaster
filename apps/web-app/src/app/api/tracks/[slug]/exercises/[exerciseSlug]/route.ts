import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'

/**
 * Exercise detail API route matching Rails exercises#show controller
 * GET /api/tracks/[slug]/exercises/[exerciseSlug] - Get specific exercise details
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string; exerciseSlug: string } }
) {
  try {
    const { slug: trackSlug, exerciseSlug } = params
    const session = await getServerAuthSession()
    
    // Connect to Rails API to fetch exercise data
    const railsApiUrl = process.env.RAILS_API_URL || 'http://localhost:3000'
    
    try {
      const response = await fetch(`${railsApiUrl}/api/v1/tracks/${trackSlug}/exercises/${exerciseSlug}`, {
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
            { error: 'Exercise not found' },
            { status: 404 }
          )
        }
        
        return NextResponse.json(
          { error: 'Failed to fetch exercise' },
          { status: response.status }
        )
      }
      
      const exerciseData = await response.json()
      
      // Return exercise data in Rails-compatible format
      return NextResponse.json({
        slug: exerciseData.slug,
        title: exerciseData.title,
        iconUrl: exerciseData.icon_url,
        difficulty: exerciseData.difficulty,
        blurb: exerciseData.blurb,
        instructions: exerciseData.instructions,
        source: exerciseData.source,
        sourceUrl: exerciseData.source_url,
        isUnlocked: exerciseData.is_unlocked,
        isCompleted: exerciseData.is_completed,
        isPublished: exerciseData.is_published,
        hasApproaches: exerciseData.has_approaches,
        hasArticle: exerciseData.has_article,
        numSolutions: exerciseData.num_solutions,
        completedAt: exerciseData.completed_at,
        files: exerciseData.files || [],
        testFiles: exerciseData.test_files || [],
        solutionFiles: exerciseData.solution_files || [],
        links: {
          self: `/tracks/${trackSlug}/exercises/${exerciseData.slug}`,
          approaches: exerciseData.has_approaches ? `/tracks/${trackSlug}/exercises/${exerciseData.slug}/approaches` : null,
          article: exerciseData.has_article ? `/tracks/${trackSlug}/exercises/${exerciseData.slug}/article` : null,
          edit: `/tracks/${trackSlug}/exercises/${exerciseData.slug}/edit`
        }
      })
      
    } catch (fetchError) {
      console.error('Rails API connection error:', fetchError)
      
      // Fallback mock data for development
      const mockExerciseData = {
        slug: exerciseSlug,
        title: exerciseSlug.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '),
        iconUrl: `/assets/exercises/${exerciseSlug}.svg`,
        difficulty: 2,
        blurb: `Practice exercise: ${exerciseSlug}`,
        instructions: `# Instructions\n\nImplement the ${exerciseSlug} exercise.`,
        source: 'Exercism',
        sourceUrl: 'https://exercism.org',
        isUnlocked: true,
        isCompleted: false,
        isPublished: true,
        hasApproaches: false,
        hasArticle: false,
        numSolutions: 100,
        completedAt: null,
        files: [
          {
            filename: `${exerciseSlug}.js`,
            content: '// Implement your solution here\n'
          }
        ],
        testFiles: [
          {
            filename: `${exerciseSlug}.test.js`,
            content: '// Test file content\n'
          }
        ],
        solutionFiles: [],
        links: {
          self: `/tracks/${trackSlug}/exercises/${exerciseSlug}`,
          approaches: null,
          article: null,
          edit: `/tracks/${trackSlug}/exercises/${exerciseSlug}/edit`
        }
      }
      
      return NextResponse.json(mockExerciseData)
    }
    
  } catch (error) {
    console.error('Exercise fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}