import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { withErrorHandling, withAuth } from '@/lib/api/middleware'

async function getAdminTracks(request: NextRequest) {
  const session = await getServerAuthSession()
  
  if (!session?.user || !session.user.isInsider) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const filter = searchParams.get('filter') || 'all'
    const perPage = 20

    // Mock tracks data - in real implementation, this would come from database
    const mockTracks = [
      {
        id: 1,
        slug: 'javascript',
        title: 'JavaScript',
        iconUrl: '/assets/tracks/javascript.svg',
        isActive: true,
        numExercises: 142,
        numStudents: 45230,
        numMentors: 234,
        lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        slug: 'python',
        title: 'Python',
        iconUrl: '/assets/tracks/python.svg',
        isActive: true,
        numExercises: 138,
        numStudents: 38920,
        numMentors: 198,
        lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        slug: 'ruby',
        title: 'Ruby',
        iconUrl: '/assets/tracks/ruby.svg',
        isActive: true,
        numExercises: 125,
        numStudents: 22340,
        numMentors: 156,
        lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 4,
        slug: 'java',
        title: 'Java',
        iconUrl: '/assets/tracks/java.svg',
        isActive: false,
        numExercises: 89,
        numStudents: 15670,
        numMentors: 87,
        lastUpdated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]

    // Filter tracks based on status
    let filteredTracks = mockTracks
    if (filter === 'active') {
      filteredTracks = filteredTracks.filter(t => t.isActive)
    } else if (filter === 'inactive') {
      filteredTracks = filteredTracks.filter(t => !t.isActive)
    }

    // Pagination
    const totalCount = filteredTracks.length
    const totalPages = Math.ceil(totalCount / perPage)
    const startIndex = (page - 1) * perPage
    const endIndex = startIndex + perPage
    const paginatedTracks = filteredTracks.slice(startIndex, endIndex)

    return NextResponse.json({
      tracks: paginatedTracks,
      meta: {
        currentPage: page,
        totalCount,
        totalPages
      }
    })

  } catch (error) {
    console.error('Get admin tracks error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tracks' },
      { status: 500 }
    )
  }
}

export const GET = withErrorHandling(withAuth(getAdminTracks))