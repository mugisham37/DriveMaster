import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { uuid: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { iteration_idx } = await request.json()
    const { uuid } = params

    if (!iteration_idx || !uuid) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // In a real implementation, this would update the published iteration in the database
    // For now, we'll just return success
    console.log(`Changing published iteration for solution ${uuid} to iteration ${iteration_idx}`)

    return NextResponse.json({
      success: true,
      message: `Published iteration changed to ${iteration_idx}`,
      solution: {
        uuid,
        publishedIterationIdx: iteration_idx
      }
    })

  } catch (error) {
    console.error('Error changing published iteration:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}