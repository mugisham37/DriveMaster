/**
 * Next.js API Routes for GDPR Consent Management
 * 
 * Implements:
 * - /api/users/gdpr/consent routes for consent management
 * - Authentication middleware using existing auth-service integration
 * - Request validation and sanitization for GDPR consent endpoints
 * - Requirements: 5.1, 5.2, 5.3, 5.4 (Task 9.4)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { userServiceClient } from '@/lib/user-service'
import { z } from 'zod'
import type { ConsentRecord } from '@/types/user-service'

// ============================================================================
// Validation Schemas
// ============================================================================

const ConsentUpdateSchema = z.object({
  consentType: z.enum([
    'data_processing', 'marketing', 'analytics', 'cookies', 'third_party_sharing'
  ]),
  granted: z.boolean(),
  version: z.string().min(1),
  source: z.enum(['user_action', 'registration', 'settings_update']).default('user_action'),
})

const BulkConsentSchema = z.object({
  consents: z.array(ConsentUpdateSchema).min(1),
})

// ============================================================================
// Authentication Middleware
// ============================================================================

async function authenticateRequest(request: NextRequest) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: { type: 'authorization', message: 'Authentication required' } },
      { status: 401 }
    )
  }
  
  return { userId: session.user.id.toString(), session }
}

// ============================================================================
// GET /api/users/gdpr/consent - Get Current Consent Status
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { userId } = authResult
    
    // Fetch current consent status from user-service
    const consentRecords = await userServiceClient.getConsentRecords(userId)
    
    // Enhance with additional information
    const enhancedConsents = {
      consents: consentRecords,
      summary: {
        totalConsents: consentRecords.length,
        grantedConsents: consentRecords.filter(c => c.granted).length,
        lastUpdated: consentRecords.reduce((latest, consent) => 
          consent.timestamp > latest ? consent.timestamp : latest, 
          new Date(0)
        ),
      },
      consentTypes: getConsentTypeDescriptions(),
      legalBasis: getLegalBasisInformation(),
    }
    
    return NextResponse.json({
      success: true,
      data: enhancedConsents,
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Consent fetch error:', error)
    
    if (error && typeof error === 'object' && 'type' in error) {
      const userServiceError = error as { type: string; message: string; code?: string }
      return NextResponse.json(
        {
          success: false,
          error: {
            type: userServiceError.type,
            message: userServiceError.message,
            code: userServiceError.code,
          },
          timestamp: new Date().toISOString(),
        },
        { status: userServiceError.type === 'authorization' ? 403 : 500 }
      )
    }
    
    return NextResponse.json(
      {
        success: false,
        error: {
          type: 'service',
          message: 'Failed to fetch consent records',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST /api/users/gdpr/consent - Update Consent
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { userId } = authResult
    
    // Parse and validate request body
    const body = await request.json()
    const validationResult = ConsentUpdateSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'validation',
            message: 'Invalid consent data',
            details: validationResult.error.issues,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }
    
    const consentData = validationResult.data
    
    // Create consent record
    const consentRecord: Omit<ConsentRecord, 'id'> = {
      userId,
      consentType: consentData.consentType,
      granted: consentData.granted,
      version: consentData.version,
      source: consentData.source,
      timestamp: new Date(),
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || '',
    }
    
    // Update consent via user-service
    const updatedConsent = await userServiceClient.updateConsentRecord(consentRecord)
    
    // Log the consent change for audit purposes
    await logGDPRActivity(userId, 'consent_updated', {
      consentType: consentData.consentType,
      granted: consentData.granted,
      version: consentData.version,
      source: consentData.source,
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || '',
    })
    
    return NextResponse.json({
      success: true,
      data: updatedConsent,
      message: `Consent ${consentData.granted ? 'granted' : 'withdrawn'} successfully`,
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Consent update error:', error)
    
    if (error && typeof error === 'object' && 'type' in error) {
      const userServiceError = error as { type: string; message: string; code?: string }
      return NextResponse.json(
        {
          success: false,
          error: {
            type: userServiceError.type,
            message: userServiceError.message,
            code: userServiceError.code,
          },
          timestamp: new Date().toISOString(),
        },
        { status: userServiceError.type === 'validation' ? 400 : 500 }
      )
    }
    
    return NextResponse.json(
      {
        success: false,
        error: {
          type: 'service',
          message: 'Failed to update consent',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// PATCH /api/users/gdpr/consent - Bulk Update Consents
// ============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) return authResult
    
    const { userId } = authResult
    
    // Parse and validate request body
    const body = await request.json()
    const validationResult = BulkConsentSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'validation',
            message: 'Invalid bulk consent data',
            details: validationResult.error.issues,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    }
    
    const { consents } = validationResult.data
    
    // Process each consent update
    const updatedConsents = []
    const errors = []
    
    for (const consentData of consents) {
      try {
        const consentRecord: Omit<ConsentRecord, 'id'> = {
          userId,
          consentType: consentData.consentType,
          granted: consentData.granted,
          version: consentData.version,
          source: consentData.source,
          timestamp: new Date(),
          ipAddress: getClientIP(request),
          userAgent: request.headers.get('user-agent') || '',
        }
        
        const updatedConsent = await userServiceClient.updateConsentRecord(consentRecord)
        updatedConsents.push(updatedConsent)
        
        // Log each consent change
        await logGDPRActivity(userId, 'consent_updated', {
          consentType: consentData.consentType,
          granted: consentData.granted,
          version: consentData.version,
          source: consentData.source,
          ipAddress: getClientIP(request),
          userAgent: request.headers.get('user-agent') || '',
        })
        
      } catch (error) {
        errors.push({
          consentType: consentData.consentType,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }
    
    return NextResponse.json({
      success: errors.length === 0,
      data: {
        updated: updatedConsents,
        errors: errors.length > 0 ? errors : undefined,
      },
      message: `${updatedConsents.length} consents updated successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}`,
      timestamp: new Date().toISOString(),
    })
    
  } catch (error) {
    console.error('Bulk consent update error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: {
          type: 'service',
          message: 'Failed to update consents',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function logGDPRActivity(
  userId: string, 
  action: string, 
  details: Record<string, unknown>
): Promise<void> {
  try {
    await userServiceClient.recordActivity({
      id: `gdpr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      userId,
      activityType: 'profile_update',
      metadata: {
        gdprAction: action,
        ...details,
      },
      deviceType: 'web',
      appVersion: '1.0.0',
      platform: 'web',
      userAgent: details.userAgent as string || '',
      ipAddress: details.ipAddress as string || '0.0.0.0',
      timestamp: new Date(),
    })
  } catch (error) {
    console.warn('Failed to log GDPR activity:', error)
  }
}

function getConsentTypeDescriptions(): Record<string, { title: string; description: string; required: boolean }> {
  return {
    data_processing: {
      title: 'Data Processing',
      description: 'Allow us to process your personal data to provide our services',
      required: true,
    },
    marketing: {
      title: 'Marketing Communications',
      description: 'Receive marketing emails and promotional content',
      required: false,
    },
    analytics: {
      title: 'Analytics',
      description: 'Allow us to collect analytics data to improve our services',
      required: false,
    },
    cookies: {
      title: 'Cookies',
      description: 'Allow us to use cookies for functionality and analytics',
      required: false,
    },
    third_party_sharing: {
      title: 'Third-party Sharing',
      description: 'Allow us to share data with trusted third-party partners',
      required: false,
    },
  }
}

function getLegalBasisInformation(): Record<string, string> {
  return {
    data_processing: 'Legitimate interest and contract performance',
    marketing: 'Consent',
    analytics: 'Legitimate interest',
    cookies: 'Consent and legitimate interest',
    third_party_sharing: 'Consent',
  }
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const clientIP = request.headers.get('x-client-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || '0.0.0.0'
  } else if (realIP) {
    return realIP
  } else if (clientIP) {
    return clientIP
  } else {
    return '0.0.0.0'
  }
}