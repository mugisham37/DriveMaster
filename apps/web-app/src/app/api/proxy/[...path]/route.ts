import { NextRequest, NextResponse } from 'next/server'
import { getServerAuthSession } from '@/lib/auth'
import type { ExtendedNextRequest } from '@/types/api'

/**
 * API proxy endpoint for existing Rails API integration
 * Forwards requests to Rails backend while preserving authentication
 * and maintaining exact API response timing and caching behavior
 */

const RAILS_API_URL = process.env.RAILS_API_URL || 'http://localhost:3000'
const PROXY_TIMEOUT = 30000 // 30 seconds

// Headers to forward from client to Rails API
const FORWARD_HEADERS = [
  'accept',
  'accept-encoding',
  'accept-language',
  'cache-control',
  'content-type',
  'user-agent',
  'x-requested-with'
]

// Headers to forward from Rails API to client
const RESPONSE_HEADERS = [
  'cache-control',
  'content-type',
  'etag',
  'expires',
  'last-modified',
  'vary',
  'x-ratelimit-limit',
  'x-ratelimit-remaining',
  'x-ratelimit-reset'
]

async function proxyRequest(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const session = await getServerAuthSession()
    const path = params.path.join('/')
    const { searchParams } = new URL(request.url)
    
    // Construct Rails API URL
    const railsUrl = new URL(`/api/v1/${path}`, RAILS_API_URL)
    
    // Forward query parameters
    searchParams.forEach((value, key) => {
      railsUrl.searchParams.append(key, value)
    })
    
    // Prepare headers for Rails API request
    const headers = new Headers()
    
    // Forward allowed headers from client
    FORWARD_HEADERS.forEach(headerName => {
      const value = request.headers.get(headerName)
      if (value) {
        headers.set(headerName, value)
      }
    })
    
    // Add authentication if user is logged in
    if (session?.user) {
      headers.set('Authorization', `Bearer ${session.user.id}`)
    }
    
    // Add Rails-specific headers
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     (request as ExtendedNextRequest).ip || 
                     'unknown'
    headers.set('X-Forwarded-For', clientIp)
    headers.set('X-Forwarded-Proto', 'https')
    headers.set('X-Forwarded-Host', request.headers.get('host') || 'localhost')
    
    // Prepare request body
    let body: string | ArrayBuffer | null = null
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      const contentType = request.headers.get('content-type')
      
      if (contentType?.includes('application/json')) {
        body = await request.text()
      } else if (contentType?.includes('multipart/form-data')) {
        // For file uploads, forward as-is
        body = await request.arrayBuffer()
      } else {
        body = await request.text()
      }
    }
    
    // Create AbortController for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT)
    
    // Make request to Rails API
    const railsResponse = await fetch(railsUrl.toString(), {
      method: request.method,
      headers,
      body,
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    // Prepare response headers
    const responseHeaders = new Headers()
    
    // Forward allowed headers from Rails API
    RESPONSE_HEADERS.forEach(headerName => {
      const value = railsResponse.headers.get(headerName)
      if (value) {
        responseHeaders.set(headerName, value)
      }
    })
    
    // Add CORS headers
    responseHeaders.set('Access-Control-Allow-Origin', '*')
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    
    // Handle different response types
    const contentType = railsResponse.headers.get('content-type')
    
    if (contentType?.includes('application/json')) {
      const data = await railsResponse.json()
      
      // Log API calls in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`Proxy ${request.method} ${path}:`, {
          status: railsResponse.status,
          data: typeof data === 'object' ? Object.keys(data) : data
        })
      }
      
      return NextResponse.json(data, {
        status: railsResponse.status,
        headers: responseHeaders
      })
    } else {
      // Forward non-JSON responses as-is
      const responseBody = await railsResponse.arrayBuffer()
      
      return new NextResponse(responseBody, {
        status: railsResponse.status,
        headers: responseHeaders
      })
    }
    
  } catch (error) {
    console.error('Proxy request error:', error)
    
    // Handle timeout errors
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout' },
        { status: 408 }
      )
    }
    
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }
    
    // Generic error response
    return NextResponse.json(
      { error: 'Proxy error' },
      { status: 500 }
    )
  }
}

// Handle all HTTP methods
export const GET = proxyRequest
export const POST = proxyRequest
export const PUT = proxyRequest
export const PATCH = proxyRequest
export const DELETE = proxyRequest

// Handle preflight requests
export async function OPTIONS(
  _request: NextRequest,
  _params: { params: { path: string[] } }
) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400'
    }
  })
}