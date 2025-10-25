import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import { withErrorHandling, withAuth } from '@/lib/api/middleware'

async function getAdminStats(_request: NextRequest) {
  const session = await getServerAuthSession()
  
  if (!session?.user || !session.user.isInsider) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    )
  }

  try {
    // Mock statistics data - in real implementation, this would come from database
    const stats = {
      users: {
        total: 125430,
        active: 45230,
        mentors: 2340,
        insiders: 156
      },
      tracks: {
        total: 67,
        active: 65,
        maintained: 58
      },
      exercises: {
        total: 3420,
        published: 3180,
        wip: 240
      },
      solutions: {
        total: 1250000,
        published: 89000,
        completed: 780000
      },
      discussions: {
        total: 45600,
        active: 1200,
        finished: 44400
      }
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Get admin stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin statistics' },
      { status: 500 }
    )
  }
}

export const GET = withErrorHandling(withAuth(getAdminStats))