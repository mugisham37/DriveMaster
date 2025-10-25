import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'

interface RailsIterationResponse {
  uuid: string
  submission_uuid: string
  idx: number
  status: string
  num_essential_automated_comments: number
  num_actionable_automated_comments: number
  num_non_actionable_automated_comments: number
  submission_method: string
  created_at: string
  submitted_at?: string
  tests_status: string
  representation_status: string
  analysis_status: string
  files?: unknown[]
  links?: {
    self?: string
    solution?: string
    test_run?: string
    files?: string
  }
}

/**
 * Iterations API proxy endpoint
 * Handles iteration submission and test running with Rails backend
 */

const RAILS_API_URL = process.env.RAILS_API_URL || 'http://localhost:3000'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const requestData = await request.json()
    const { solutionUuid, files } = requestData
    
    if (!solutionUuid || !files) {
      return NextResponse.json(
        { error: 'Missing required fields: solutionUuid, files' },
        { status: 400 }
      )
    }
    
    // Forward request to Rails API
    const railsUrl = new URL('/api/v1/iterations', RAILS_API_URL)
    
    const response = await fetch(railsUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${session.user.id}`
      },
      body: JSON.stringify({
        solution_uuid: solutionUuid,
        files: files
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      
      if (response.status === 422) {
        return NextResponse.json(
          { error: errorData.message || 'Validation failed' },
          { status: 422 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to submit iteration' },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    
    return NextResponse.json({
      uuid: data.uuid,
      submissionUuid: data.submission_uuid,
      idx: data.idx,
      status: data.status,
      numEssentialAutomatedComments: data.num_essential_automated_comments,
      numActionableAutomatedComments: data.num_actionable_automated_comments,
      numNonActionableAutomatedComments: data.num_non_actionable_automated_comments,
      submittedAt: data.submitted_at,
      testsStatus: data.tests_status,
      representationStatus: data.representation_status,
      analysisStatus: data.analysis_status,
      files: data.files || [],
      links: {
        self: data.links?.self,
        solution: data.links?.solution,
        testRun: data.links?.test_run
      }
    }, { status: 201 })
    
  } catch (error) {
    console.error('Iteration submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerAuthSession()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const solutionUuid = searchParams.get('solution_uuid')
    
    if (!solutionUuid) {
      return NextResponse.json(
        { error: 'Missing required parameter: solution_uuid' },
        { status: 400 }
      )
    }
    
    // Forward request to Rails API
    const railsUrl = new URL('/api/v1/iterations', RAILS_API_URL)
    railsUrl.searchParams.append('solution_uuid', solutionUuid)
    
    const response = await fetch(railsUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${session.user.id}`
      }
    })
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch iterations' },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    
    return NextResponse.json({
      iterations: data.iterations?.map((iteration: RailsIterationResponse) => ({
        uuid: iteration.uuid,
        submissionUuid: iteration.submission_uuid,
        idx: iteration.idx,
        status: iteration.status,
        numEssentialAutomatedComments: iteration.num_essential_automated_comments,
        numActionableAutomatedComments: iteration.num_actionable_automated_comments,
        numNonActionableAutomatedComments: iteration.num_non_actionable_automated_comments,
        submittedAt: iteration.submitted_at,
        testsStatus: iteration.tests_status,
        representationStatus: iteration.representation_status,
        analysisStatus: iteration.analysis_status,
        files: iteration.files || [],
        links: {
          self: iteration.links?.self,
          solution: iteration.links?.solution,
          testRun: iteration.links?.test_run
        }
      })) || []
    })
    
  } catch (error) {
    console.error('Iterations fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}