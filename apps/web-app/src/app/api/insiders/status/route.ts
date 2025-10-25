import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // In a real implementation, this would check the user's insider status
    // For now, we'll return the session data
    return NextResponse.json({
      user: {
        handle: session.user.handle,
        insidersStatus: session.user.isInsider ? 'active' : 'ineligible'
      }
    })
  } catch (error) {
    console.error('Error fetching insider status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}