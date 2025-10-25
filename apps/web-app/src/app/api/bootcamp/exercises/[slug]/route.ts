import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const exerciseSlug = params.slug

    // Mock exercise data - in real implementation, fetch from database
    const exerciseData = {
      project: { slug: 'web-development' },
      exercise: {
        id: 1,
        slug: exerciseSlug,
        title: `Exercise: ${exerciseSlug}`,
        introduction_html: '<p>Complete this exercise by following the instructions.</p>',
        css_checks: ['Use flexbox for layout', 'Add hover effects'],
        html_checks: ['Use semantic HTML elements'],
        config: {
          title: `Exercise: ${exerciseSlug}`,
          description: 'A bootcamp exercise',
          allowed_properties: ['display', 'flex-direction', 'justify-content'],
          disallowed_properties: ['float'],
          expected: {
            html: '<div class="container"><h1>Hello World</h1></div>',
            css: '.container { display: flex; justify-content: center; }'
          }
        }
      },
      solution: {
        uuid: 'solution-uuid-123',
        status: 'started',
        passed_basic_tests: false
      },
      code: {
        normalize_css: `* { box-sizing: border-box; margin: 0; padding: 0; }`,
        default: {
          css: '/* Default CSS */'
        },
        stub: {
          css: '/* Write your CSS here */',
          html: '<!-- Write your HTML here -->',
          js: '// Write your JavaScript here'
        },
        aspect_ratio: 1.5,
        code: null,
        stored_at: new Date().toISOString()
      },
      links: {
        post_submission: `/api/bootcamp/solutions/solution-uuid-123/submissions`,
        complete_solution: `/api/bootcamp/solutions/solution-uuid-123/complete`,
        projects_index: '/bootcamp/projects',
        dashboard_index: '/bootcamp/dashboard',
        bootcamp_level_url: '/bootcamp/level/1',
        custom_fns_dashboard: '/bootcamp/custom-functions'
      }
    }

    return NextResponse.json(exerciseData)
  } catch (error) {
    console.error('Error fetching exercise:', error)
    return NextResponse.json(
      { error: 'Failed to fetch exercise' },
      { status: 500 }
    )
  }
}