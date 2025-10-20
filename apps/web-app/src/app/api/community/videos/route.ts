import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Mock data - in real implementation, this would come from database
    const videos = [
      {
        id: 1,
        title: 'Introduction to Functional Programming',
        description: 'Learn the basics of functional programming concepts.',
        youtubeId: 'dQw4w9WgXcQ',
        thumbnailUrl: '/assets/community/video-1.jpg',
        duration: 1800, // 30 minutes in seconds
        category: 'tutorial',
        tags: ['functional-programming', 'concepts'],
        createdAt: '2024-01-15T10:00:00Z'
      },
      {
        id: 2,
        title: 'Building REST APIs with Go',
        description: 'Step-by-step guide to creating REST APIs using Go.',
        youtubeId: 'oHg5SJYRHA0',
        thumbnailUrl: '/assets/community/video-2.jpg',
        duration: 2700, // 45 minutes in seconds
        category: 'tutorial',
        tags: ['go', 'api', 'backend'],
        createdAt: '2024-01-12T14:20:00Z'
      }
    ]

    return NextResponse.json({
      videos,
      meta: {
        total: videos.length,
        page: 1,
        perPage: 20
      }
    })
  } catch (error) {
    console.error('Error fetching community videos:', error)
    return NextResponse.json(
      { error: 'Failed to fetch community videos' },
      { status: 500 }
    )
  }
}