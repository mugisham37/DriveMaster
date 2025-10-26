import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'

/**
 * Journey Solutions API route
 * GET /api/journey/solutions - Get user solutions data
 */

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    
    // Journey requires authentication
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    const { searchParams } = new URL(request.url)
  
  const criteria = searchParams.get('criteria') || ''
  const trackSlug = searchParams.get('track_slug') || ''
  const status = searchParams.get('status') || ''
  // Note: These parameters are extracted but not used in the mock implementation
  // const mentoringStatus = searchParams.get('mentoring_status') || ''
  // const syncStatus = searchParams.get('sync_status') || ''
  // const testsStatus = searchParams.get('tests_status') || ''
  // const headTestsStatus = searchParams.get('head_tests_status') || ''
  const page = parseInt(searchParams.get('page') || '1')
  // const order = searchParams.get('order') || 'newest_first'

  // Mock paginated solutions data
  const solutions = [
    {
      id: 1,
      uuid: "sol-uuid-1",
      exercise: {
        title: "Two Fer",
        slug: "two-fer",
        iconUrl: "/exercises/two-fer.svg"
      },
      track: {
        title: "JavaScript", 
        slug: "javascript",
        iconUrl: "/tracks/javascript.svg"
      },
      status: "completed",
      mentoringStatus: "finished",
      testsStatus: "passed",
      headTestsStatus: "passed",
      syncStatus: "synced",
      numStars: 3,
      numComments: 2,
      numIterations: 2,
      publishedAt: "2024-01-20T10:00:00Z",
      completedAt: "2024-01-18T15:30:00Z",
      updatedAt: "2024-01-20T10:00:00Z",
      isOutOfDate: false,
      privateUrl: "/tracks/javascript/exercises/two-fer",
      publicUrl: "/tracks/javascript/exercises/two-fer/solutions/sol-uuid-1",
      links: {
        self: "/api/solutions/sol-uuid-1",
        publicUrl: "/tracks/javascript/exercises/two-fer/solutions/sol-uuid-1"
      }
    },
    {
      id: 2,
      uuid: "sol-uuid-2", 
      exercise: {
        title: "Hello World",
        slug: "hello-world",
        iconUrl: "/exercises/hello-world.svg"
      },
      track: {
        title: "Python",
        slug: "python", 
        iconUrl: "/tracks/python.svg"
      },
      status: "published",
      mentoringStatus: "none",
      testsStatus: "passed",
      headTestsStatus: "passed", 
      syncStatus: "synced",
      numStars: 5,
      numComments: 3,
      numIterations: 1,
      publishedAt: "2024-01-15T14:20:00Z",
      completedAt: "2024-01-15T12:00:00Z",
      updatedAt: "2024-01-15T14:20:00Z",
      isOutOfDate: false,
      privateUrl: "/tracks/python/exercises/hello-world",
      publicUrl: "/tracks/python/exercises/hello-world/solutions/sol-uuid-2",
      links: {
        self: "/api/solutions/sol-uuid-2",
        publicUrl: "/tracks/python/exercises/hello-world/solutions/sol-uuid-2"
      }
    }
  ]

  // Apply filters
  let filteredSolutions = solutions
  
  if (criteria) {
    filteredSolutions = filteredSolutions.filter(sol => 
      sol.exercise.title.toLowerCase().includes(criteria.toLowerCase()) ||
      sol.track.title.toLowerCase().includes(criteria.toLowerCase())
    )
  }
  
  if (trackSlug) {
    filteredSolutions = filteredSolutions.filter(sol => sol.track.slug === trackSlug)
  }
  
  if (status) {
    filteredSolutions = filteredSolutions.filter(sol => sol.status === status)
  }

  const totalCount = filteredSolutions.length
  const perPage = 20
  const totalPages = Math.ceil(totalCount / perPage)
  const startIndex = (page - 1) * perPage
  const endIndex = startIndex + perPage
  const paginatedSolutions = filteredSolutions.slice(startIndex, endIndex)

  const response = {
    results: paginatedSolutions,
    meta: {
      currentPage: page,
      totalCount,
      totalPages,
      unscoped_total: solutions.length
    }
  }

    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Journey solutions fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}