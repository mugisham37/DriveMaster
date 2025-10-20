import { NextRequest, NextResponse } from 'next/server'
import { withAuth, withErrorHandling } from '@/lib/api/middleware'

async function disconnectGitHub(request: NextRequest) {
  try {
    // TODO: Implement GitHub disconnection
    // This would typically:
    // 1. Revoke the access token
    // 2. Remove integration settings
    // 3. Clean up any synced repositories

    // Mock successful response
    return NextResponse.json({
      success: true,
      message: 'GitHub disconnected successfully'
    })
  } catch (error) {
    console.error('GitHub disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect GitHub' },
      { status: 500 }
    )
  }
}

export const DELETE = withAuth(withErrorHandling(disconnectGitHub), {
  requireAuth: true
})