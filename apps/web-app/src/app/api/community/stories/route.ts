import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // Mock data - in real implementation, this would come from database
    const stories = [
      {
        id: 1,
        slug: 'from-bootcamp-to-senior-dev',
        title: 'From Bootcamp to Senior Developer',
        blurb: 'Sarah shares her incredible journey from a coding bootcamp graduate to becoming a senior developer.',
        thumbnailUrl: '/assets/community/story-1.jpg',
        youtubeId: 'dQw4w9WgXcQ',
        lengthInMinutes: 45,
        interviewee: {
          name: 'Sarah Chen',
          avatarUrl: '/assets/avatars/sarah.svg'
        },
        createdAt: '2024-01-15T10:00:00Z'
      },
      {
        id: 2,
        slug: 'career-change-at-40',
        title: 'Career Change at 40: My Programming Journey',
        blurb: 'Mike talks about making a successful career transition to programming later in life.',
        thumbnailUrl: '/assets/community/story-2.jpg',
        youtubeId: 'oHg5SJYRHA0',
        lengthInMinutes: 38,
        interviewee: {
          name: 'Mike Rodriguez',
          avatarUrl: '/assets/avatars/mike.svg'
        },
        createdAt: '2024-01-10T15:30:00Z'
      }
    ]

    return NextResponse.json({
      stories,
      meta: {
        total: stories.length,
        page: 1,
        perPage: 20
      }
    })
  } catch (error) {
    console.error('Error fetching community stories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch community stories' },
      { status: 500 }
    )
  }
}