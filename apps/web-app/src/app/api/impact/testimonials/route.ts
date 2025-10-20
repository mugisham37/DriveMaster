import { NextRequest, NextResponse } from 'next/server'

// Mock testimonials data - in a real app this would come from a database
const mockTestimonials = [
  {
    id: '1',
    uuid: 'testimonial-1',
    content: 'The mentoring on Exercism has been incredible. My mentor helped me understand not just the solution, but the thinking process behind it.',
    createdAt: '2024-01-15T10:30:00Z',
    student: {
      handle: 'student123',
      avatarUrl: '/avatars/student123.jpg'
    },
    mentor: {
      handle: 'mentor456',
      avatarUrl: '/avatars/mentor456.jpg'
    },
    exercise: {
      title: 'Two Fer'
    },
    track: {
      title: 'JavaScript',
      iconUrl: '/track-icons/javascript.svg'
    }
  },
  {
    id: '2',
    uuid: 'testimonial-2',
    content: 'Amazing feedback that helped me improve my coding style and learn best practices. The community here is so supportive!',
    createdAt: '2024-01-14T15:45:00Z',
    student: {
      handle: 'learner789',
      avatarUrl: '/avatars/learner789.jpg'
    },
    mentor: {
      handle: 'expert101',
      avatarUrl: '/avatars/expert101.jpg'
    },
    exercise: {
      title: 'Leap'
    },
    track: {
      title: 'Python',
      iconUrl: '/track-icons/python.svg'
    }
  },
  {
    id: '3',
    uuid: 'testimonial-3',
    content: 'The detailed explanations and alternative approaches shown by my mentor opened my eyes to new ways of thinking about problems.',
    createdAt: '2024-01-13T09:20:00Z',
    student: {
      handle: 'coder202',
      avatarUrl: '/avatars/coder202.jpg'
    },
    mentor: {
      handle: 'guide303',
      avatarUrl: '/avatars/guide303.jpg'
    },
    exercise: {
      title: 'Hamming'
    },
    track: {
      title: 'Ruby',
      iconUrl: '/track-icons/ruby.svg'
    }
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const uuid = searchParams.get('uuid')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    let testimonials = mockTestimonials

    // Filter by UUID if provided
    if (uuid) {
      testimonials = testimonials.filter(t => t.uuid === uuid)
    }

    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedTestimonials = testimonials.slice(startIndex, endIndex)

    return NextResponse.json({
      testimonials: paginatedTestimonials,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(testimonials.length / limit),
        totalCount: testimonials.length,
        hasNextPage: endIndex < testimonials.length,
        hasPreviousPage: page > 1
      }
    })
  } catch (error) {
    console.error('Error fetching impact testimonials:', error)
    return NextResponse.json(
      { error: 'Failed to fetch testimonials' },
      { status: 500 }
    )
  }
}