import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const criteria = searchParams.get('criteria') || ''
    const trackSlug = searchParams.get('trackSlug') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 20

    // Mock data for favorites - in real implementation, this would query the database
    const mockFavorites = [
      {
        uuid: 'favorite-1',
        url: '/tracks/javascript/exercises/two-fer/solutions/user1',
        user: {
          handle: 'user1',
          flair: null,
          reputation: '1,234',
          avatarUrl: '/avatars/user1.jpg'
        },
        exercise: {
          title: 'Two Fer',
          iconUrl: '/exercises/two-fer.svg'
        },
        track: {
          title: 'JavaScript',
          iconUrl: '/tracks/javascript.svg'
        },
        publishedAt: '2024-01-15T10:30:00Z',
        numStars: 15,
        numComments: 3,
        numLoc: 25,
        isStarred: true,
        language: {
          name: 'JavaScript',
          indent: 2
        },
        snippet: 'export function twoFer(name = "you") {\n  return `One for ${name}, one for me.`;\n}'
      }
    ]

    // Filter by criteria and track if provided
    let filteredFavorites = mockFavorites
    if (criteria) {
      filteredFavorites = filteredFavorites.filter(fav => 
        fav.user.handle.toLowerCase().includes(criteria.toLowerCase()) ||
        fav.exercise.title.toLowerCase().includes(criteria.toLowerCase())
      )
    }
    if (trackSlug) {
      filteredFavorites = filteredFavorites.filter(fav => 
        fav.track.title.toLowerCase().replace(/\s+/g, '-') === trackSlug
      )
    }

    // Pagination
    const totalCount = filteredFavorites.length
    const totalPages = Math.ceil(totalCount / limit)
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedResults = filteredFavorites.slice(startIndex, endIndex)

    return NextResponse.json({
      results: paginatedResults,
      meta: {
        currentPage: page,
        totalCount,
        totalPages,
        unscopedTotal: mockFavorites.length
      }
    })

  } catch (error) {
    console.error('Error fetching favorites:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}