import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'

/**
 * Test run API proxy endpoint
 * Handles test execution results from Rails backend
 */

const RAILS_API_URL = process.env.RAILS_API_URL || 'http://localhost:3000'

export async function GET(
  request: NextRequest,
  { params }: { params: { uuid: string } }
) {
  try {
    const session = await getServerAuthSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const submissionUuid = params.uuid
    
    // Forward request to Rails API
    const railsUrl = new URL(`/api/v1/submissions/${submissionUuid}/test_run`, RAILS_API_URL)
    
    const response = await fetch(railsUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${session.user.id}`
      }
    })
    
    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Test run not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch test run' },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    
    return NextResponse.json({
      submissionUuid: data.submission_uuid,
      status: data.status,
      message: data.message,
      messageHtml: data.message_html,
      output: data.output,
      outputHtml: data.output_html,
      tests: data.tests?.map((test: any) => ({
        name: test.name,
        status: test.status,
        message: test.message,
        messageHtml: test.message_html,
        output: test.output,
        outputHtml: test.output_html,
        index: test.index
      })) || [],
      version: data.version,
      links: {
        self: data.links?.self,
        submission: data.links?.submission
      }
    })
    
  } catch (error) {
    console.error('Test run fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}