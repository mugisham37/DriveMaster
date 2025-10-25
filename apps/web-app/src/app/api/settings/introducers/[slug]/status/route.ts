import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { slug } = params

    if (!slug) {
      return NextResponse.json(
        { error: 'Introducer slug is required' },
        { status: 400 }
      )
    }

    // In a real implementation, you would query the database for dismissal info
    // For now, we'll return mock data
    // SELECT dismissed_at FROM dismissed_introducers WHERE user_id = ? AND slug = ?
    
    const mockDismissalData = {
      isDismissed: false,
      dismissedAt: null
    }

    return NextResponse.json(mockDismissalData)

  } catch (error) {
    console.error('Error getting introducer status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { slug } = params

    if (!slug) {
      return NextResponse.json(
        { error: 'Introducer slug is required' },
        { status: 400 }
      )
    }

    // In a real implementation, you would delete the dismissal record
    // DELETE FROM dismissed_introducers WHERE user_id = ? AND slug = ?
    
    return NextResponse.json({ 
      success: true,
      message: `Introducer dismissal reset for ${slug}`
    })

  } catch (error) {
    console.error('Error resetting introducer dismissal:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}