import { NextRequest, NextResponse } from 'next/server'

// Mock metrics data - in a real app this would come from a database
const mockMetrics = [
  {
    id: '1',
    type: 'sign_up_metric',
    coordinates: [40.7128, -74.0060], // New York
    timestamp: new Date().toISOString()
  },
  {
    id: '2',
    type: 'start_solution_metric',
    coordinates: [51.5074, -0.1278], // London
    track: {
      title: 'JavaScript',
      iconUrl: '/track-icons/javascript.svg'
    },
    timestamp: new Date().toISOString()
  },
  {
    id: '3',
    type: 'submit_submission_metric',
    coordinates: [35.6762, 139.6503], // Tokyo
    track: {
      title: 'Python',
      iconUrl: '/track-icons/python.svg'
    },
    timestamp: new Date().toISOString()
  },
  {
    id: '4',
    type: 'publish_solution_metric',
    coordinates: [37.7749, -122.4194], // San Francisco
    user: {
      handle: 'developer123',
      avatarUrl: '/avatars/developer123.jpg'
    },
    track: {
      title: 'Ruby',
      iconUrl: '/track-icons/ruby.svg'
    },
    timestamp: new Date().toISOString()
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const trackTitle = searchParams.get('track_title')
    const limit = parseInt(searchParams.get('limit') || '10')

    let metrics = mockMetrics

    // Filter by track if provided
    if (trackTitle) {
      metrics = metrics.filter(m => m.track?.title === trackTitle)
    }

    // Limit results
    metrics = metrics.slice(0, limit)

    return NextResponse.json({
      metrics: metrics.map(metric => ({
        ...metric,
        // Convert to broadcast hash format expected by the frontend
        to_broadcast_hash: metric
      }))
    })
  } catch (error) {
    console.error('Error fetching impact metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // In a real app, this would save the metric to a database
    const newMetric = {
      id: Date.now().toString(),
      ...body,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(newMetric, { status: 201 })
  } catch (error) {
    console.error('Error creating impact metric:', error)
    return NextResponse.json(
      { error: 'Failed to create metric' },
      { status: 500 }
    )
  }
}