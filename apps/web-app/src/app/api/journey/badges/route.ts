import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'

/**
 * Journey Badges API route
 * GET /api/journey/badges - Get user badges data
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
  const order = searchParams.get('order') || 'newest_first'
  const page = parseInt(searchParams.get('page') || '1')

  // Mock badges data
  const badges = [
    {
      id: 1,
      uuid: "badge-uuid-1",
      name: "Rookie",
      description: "Submitted your first solution",
      iconUrl: "/badges/rookie.svg",
      rarity: "common",
      unlockedAt: "2024-01-16T10:00:00Z",
      track: null,
      percentageAwardedTo: 85.5,
      links: {
        self: "/badges/rookie"
      }
    },
    {
      id: 2,
      uuid: "badge-uuid-2",
      name: "Dedicated", 
      description: "Completed 10 exercises",
      iconUrl: "/badges/dedicated.svg",
      rarity: "rare",
      unlockedAt: "2024-02-01T15:30:00Z",
      track: null,
      percentageAwardedTo: 45.2,
      links: {
        self: "/badges/dedicated"
      }
    },
    {
      id: 3,
      uuid: "badge-uuid-3",
      name: "JavaScript Enthusiast",
      description: "Completed 25 JavaScript exercises", 
      iconUrl: "/badges/javascript-enthusiast.svg",
      rarity: "ultimate",
      unlockedAt: "2024-02-15T09:45:00Z",
      track: {
        title: "JavaScript",
        slug: "javascript",
        iconUrl: "/tracks/javascript.svg"
      },
      percentageAwardedTo: 12.8,
      links: {
        self: "/badges/javascript-enthusiast"
      }
    },
    {
      id: 4,
      uuid: "badge-uuid-4", 
      name: "Mentor",
      description: "Mentored your first student",
      iconUrl: "/badges/mentor.svg",
      rarity: "legendary",
      unlockedAt: "2024-03-01T16:20:00Z",
      track: null,
      percentageAwardedTo: 8.3,
      links: {
        self: "/badges/mentor"
      }
    },
    {
      id: 5,
      uuid: "badge-uuid-5",
      name: "Contributor",
      description: "Made your first contribution to Exercism",
      iconUrl: "/badges/contributor.svg", 
      rarity: "rare",
      unlockedAt: "2024-03-10T11:15:00Z",
      track: null,
      percentageAwardedTo: 25.7,
      links: {
        self: "/badges/contributor"
      }
    }
  ]

  // Apply filters
  let filteredBadges = badges
  
  if (criteria) {
    filteredBadges = filteredBadges.filter(badge => 
      badge.name.toLowerCase().includes(criteria.toLowerCase()) ||
      badge.description.toLowerCase().includes(criteria.toLowerCase())
    )
  }

  // Apply sorting
  if (order === 'newest_first') {
    filteredBadges.sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime())
  } else if (order === 'oldest_first') {
    filteredBadges.sort((a, b) => new Date(a.unlockedAt).getTime() - new Date(b.unlockedAt).getTime())
  }

  const totalCount = filteredBadges.length
  const perPage = 20
  const totalPages = Math.ceil(totalCount / perPage)
  const startIndex = (page - 1) * perPage
  const endIndex = startIndex + perPage
  const paginatedBadges = filteredBadges.slice(startIndex, endIndex)

  const response = {
    results: paginatedBadges,
    meta: {
      currentPage: page,
      totalCount,
      totalPages,
      unscoped_total: badges.length
    }
  }

    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Journey badges fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}