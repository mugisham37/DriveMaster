import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'

/**
 * Journey Reputation API route
 * GET /api/journey/reputation - Get user reputation data
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
  
  const category = searchParams.get('category') || ''
  const track = searchParams.get('track') || ''
  const page = parseInt(searchParams.get('page') || '1')

  // Mock reputation tokens data
  const reputationTokens = [
    {
      id: 1,
      uuid: "rep-uuid-1",
      type: "exercise_contribution",
      value: 12,
      reason: "Added hints to Two Fer exercise",
      earnedOn: "2024-03-15T14:30:00Z",
      track: {
        title: "JavaScript",
        slug: "javascript", 
        iconUrl: "/tracks/javascript.svg"
      },
      exercise: {
        title: "Two Fer",
        slug: "two-fer",
        iconUrl: "/exercises/two-fer.svg"
      },
      links: {
        self: "/reputation/tokens/rep-uuid-1"
      }
    },
    {
      id: 2,
      uuid: "rep-uuid-2",
      type: "mentoring_session",
      value: 5,
      reason: "Mentored student on Hello World",
      earnedOn: "2024-03-14T10:15:00Z",
      track: {
        title: "Python",
        slug: "python",
        iconUrl: "/tracks/python.svg"
      },
      exercise: {
        title: "Hello World", 
        slug: "hello-world",
        iconUrl: "/exercises/hello-world.svg"
      },
      links: {
        self: "/reputation/tokens/rep-uuid-2"
      }
    },
    {
      id: 3,
      uuid: "rep-uuid-3",
      type: "solution_star",
      value: 3,
      reason: "Your solution was starred",
      earnedOn: "2024-03-13T16:45:00Z",
      track: {
        title: "JavaScript",
        slug: "javascript",
        iconUrl: "/tracks/javascript.svg"
      },
      exercise: {
        title: "Leap",
        slug: "leap", 
        iconUrl: "/exercises/leap.svg"
      },
      links: {
        self: "/reputation/tokens/rep-uuid-3"
      }
    },
    {
      id: 4,
      uuid: "rep-uuid-4",
      type: "code_review",
      value: 8,
      reason: "Provided helpful code review",
      earnedOn: "2024-03-12T09:20:00Z",
      track: {
        title: "Python",
        slug: "python",
        iconUrl: "/tracks/python.svg"
      },
      exercise: {
        title: "Raindrops",
        slug: "raindrops",
        iconUrl: "/exercises/raindrops.svg"
      },
      links: {
        self: "/reputation/tokens/rep-uuid-4"
      }
    },
    {
      id: 5,
      uuid: "rep-uuid-5",
      type: "publishing_solution",
      value: 1,
      reason: "Published your solution",
      earnedOn: "2024-03-11T13:10:00Z",
      track: {
        title: "JavaScript",
        slug: "javascript",
        iconUrl: "/tracks/javascript.svg"
      },
      exercise: {
        title: "Resistor Color",
        slug: "resistor-color",
        iconUrl: "/exercises/resistor-color.svg"
      },
      links: {
        self: "/reputation/tokens/rep-uuid-5"
      }
    }
  ]

  // Apply filters
  let filteredTokens = reputationTokens
  
  if (category) {
    filteredTokens = filteredTokens.filter(token => token.type === category)
  }
  
  if (track) {
    filteredTokens = filteredTokens.filter(token => token.track.slug === track)
  }

  // Sort by newest first
  filteredTokens.sort((a, b) => new Date(b.earnedOn).getTime() - new Date(a.earnedOn).getTime())

  const totalCount = filteredTokens.length
  const perPage = 20
  const totalPages = Math.ceil(totalCount / perPage)
  const startIndex = (page - 1) * perPage
  const endIndex = startIndex + perPage
  const paginatedTokens = filteredTokens.slice(startIndex, endIndex)

  // Calculate total reputation
  const totalReputation = reputationTokens.reduce((sum, token) => sum + token.value, 0)

  const response = {
    results: paginatedTokens,
    meta: {
      currentPage: page,
      totalCount,
      totalPages,
      unscoped_total: reputationTokens.length,
      totalReputation
    }
  }

    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Journey reputation fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}