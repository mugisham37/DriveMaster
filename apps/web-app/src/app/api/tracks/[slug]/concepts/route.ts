import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

export async function GET(
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

    const { slug } = params

    // Mock concept map data - in real implementation, this would come from the database
    const mockConceptMapData = {
      concepts: [
        {
          slug: 'basics',
          name: 'Basics',
          webUrl: `/tracks/${slug}/concepts/basics`,
          tooltipUrl: `/tracks/${slug}/concepts/basics/tooltip`
        },
        {
          slug: 'conditionals',
          name: 'Conditionals',
          webUrl: `/tracks/${slug}/concepts/conditionals`,
          tooltipUrl: `/tracks/${slug}/concepts/conditionals/tooltip`
        },
        {
          slug: 'loops',
          name: 'Loops',
          webUrl: `/tracks/${slug}/concepts/loops`,
          tooltipUrl: `/tracks/${slug}/concepts/loops/tooltip`
        }
      ],
      levels: [
        ['basics'],
        ['conditionals'],
        ['loops']
      ],
      connections: [
        { from: 'basics', to: 'conditionals' },
        { from: 'conditionals', to: 'loops' }
      ],
      status: {
        basics: 'learned',
        conditionals: 'available',
        loops: 'locked'
      },
      exercisesData: {
        basics: [
          {
            url: `/tracks/${slug}/exercises/hello-world`,
            slug: 'hello-world',
            tooltipUrl: `/tracks/${slug}/exercises/hello-world/tooltip`,
            status: 'completed',
            type: 'practice'
          }
        ],
        conditionals: [
          {
            url: `/tracks/${slug}/exercises/two-fer`,
            slug: 'two-fer',
            tooltipUrl: `/tracks/${slug}/exercises/two-fer/tooltip`,
            status: 'available',
            type: 'practice'
          }
        ],
        loops: []
      }
    }

    return NextResponse.json({
      graph: mockConceptMapData
    })

  } catch (error) {
    console.error('Error fetching concept map:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}