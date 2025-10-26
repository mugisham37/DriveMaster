import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

export async function POST(_: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is a lifetime insider
    if (!session.user.isInsider) {
      return NextResponse.json(
        { error: 'Free bootcamp access is only available to Lifetime Insiders' },
        { status: 403 }
      )
    }

    // Generate a unique free coupon code
    const freeCouponCode = generateFreeCouponCode(session.user.handle)
    
    console.log('Generating free bootcamp coupon for user:', session.user.handle, freeCouponCode)
    
    // TODO: Store in database
    // await createBootcampFreeCoupon(session.user.id, freeCouponCode)
    
    return NextResponse.json({
      success: true,
      message: 'Free bootcamp coupon generated successfully',
      coupon_code: freeCouponCode,
      redemption_url: `https://exercism.org/bootcamp?coupon=${freeCouponCode}`,
      expires_at: null // Free coupons for lifetime insiders don't expire
    })
  } catch (error) {
    console.error('Error generating free bootcamp coupon:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateFreeCouponCode(handle: string): string {
  // Generate a unique coupon code for free bootcamp access
  const timestamp = Date.now().toString(36).toUpperCase()
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  
  // Format: FREE-HANDLE-TIMESTAMP-RANDOM
  const cleanHandle = handle.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 8)
  return `FREE-${cleanHandle}-${timestamp}-${randomSuffix}`
}