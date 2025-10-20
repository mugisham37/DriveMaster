import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

export async function POST(
  request: NextRequest,
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

    const { dismissed } = await request.json()
    const { slug } = params

    if (!slug || typeof dismissed !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request data' },
        { status: 400 }
      )
    }

    // In a real implementation, you would save this to your database
    // For now, we'll just return success
    // Example: await updateUserPreferences(session.user.id, { dismissedIntroducers: [...existing, slug] })

    return NextResponse.json({ 
      success: true,
      message: `Introducer ${slug} ${dismissed ? 'dismissed' : 'restored'}`
    })

  } catch (error) {
    console.error('Error updating introducer preference:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}