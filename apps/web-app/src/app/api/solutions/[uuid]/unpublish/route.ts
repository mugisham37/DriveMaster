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

    const { uuid } = params

    if (!uuid) {
      return NextResponse.json(
        { error: 'Solution UUID is required' },
        { status: 400 }
      )
    }

    // In a real implementation, this would unpublish the solution in the database
    // For now, we'll just return success
    console.log(`Unpublishing solution ${uuid}`)

    return NextResponse.json({
      success: true,
      message: 'Solution unpublished successfully',
      solution: {
        uuid,
        isPublished: false
      }
    })

  } catch (error) {
    console.error('Error unpublishing solution:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}