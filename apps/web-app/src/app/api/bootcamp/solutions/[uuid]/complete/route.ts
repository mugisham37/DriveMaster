import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(
  _request: NextRequest,
  { params }: { params: { uuid: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const solutionUuid = params.uuid

    // Mock solution completion - in real implementation:
    // 1. Verify the solution has passed required tests
    // 2. Mark solution as completed
    // 3. Update user progress
    // 4. Unlock next exercises if applicable
    
    console.log('Completing solution:', solutionUuid)

    return NextResponse.json({
      solution: {
        uuid: solutionUuid,
        status: 'completed',
        completed_at: new Date().toISOString()
      },
      message: 'Solution completed successfully!'
    })
  } catch (error) {
    console.error('Error completing solution:', error)
    return NextResponse.json(
      { error: 'Failed to complete solution' },
      { status: 500 }
    )
  }
}