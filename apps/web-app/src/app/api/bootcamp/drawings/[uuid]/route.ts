import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { uuid: drawingUuid } = await params

    // Mock drawing data - in real implementation, fetch from database
    const drawingData = {
      drawing: {
        uuid: drawingUuid,
        title: 'My Drawing',
        background_slug: 'room'
      },
      code: {
        code: `// Sample drawing code
draw.setColor('blue')
draw.drawCircle(100, 100, 50)
draw.setColor('red')
draw.fillRect(200, 200, 100, 100)`,
        stored_at: new Date().toISOString()
      },
      backgrounds: [
        {
          slug: 'none',
          title: 'No background',
          image_url: null
        },
        {
          slug: 'room',
          title: 'A room to decorate',
          image_url: 'https://shared.cdn.galeriekodl.cz/plain/w:1200/rs:fit:1200:909:1/czM6Ly9zaGFyZWQucHJhZ3VlL2l0ZW1zLzAzMjY0NzQxLWFiNDQtNGE0Mi1iNDg2LTk2NjEwOWFkYTJlNS5qcGVn'
        }
      ],
      links: {
        update_code: `/api/bootcamp/drawings/${drawingUuid}`,
        drawings_index: '/bootcamp/projects/drawing'
      }
    }

    return NextResponse.json(drawingData)
  } catch (error) {
    console.error('Error fetching drawing:', error)
    return NextResponse.json(
      { error: 'Failed to fetch drawing' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { uuid: drawingUuid } = await params
    const body = await request.json()
    const { code, background_slug } = body

    // Mock drawing update - in real implementation:
    // 1. Validate the drawing code
    // 2. Save to database
    // 3. Return updated drawing data
    
    console.log('Updating drawing:', drawingUuid)
    console.log('New code:', code)
    console.log('Background:', background_slug)

    return NextResponse.json({
      drawing: {
        uuid: drawingUuid,
        code,
        background_slug,
        updated_at: new Date().toISOString()
      },
      message: 'Drawing updated successfully!'
    })
  } catch (error) {
    console.error('Error updating drawing:', error)
    return NextResponse.json(
      { error: 'Failed to update drawing' },
      { status: 500 }
    )
  }
}