import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is an insider
    if (!session.user.isInsider) {
      return NextResponse.json(
        { error: 'Bootcamp affiliate program is only available to Insiders' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { bootcamp_affiliate_coupon_code } = body
    
    if (!bootcamp_affiliate_coupon_code || typeof bootcamp_affiliate_coupon_code !== 'string') {
      return NextResponse.json(
        { error: 'Invalid coupon code' },
        { status: 400 }
      )
    }
    
    // Validate coupon code format
    const couponRegex = /^[A-Z0-9-]{3,20}$/
    if (!couponRegex.test(bootcamp_affiliate_coupon_code)) {
      return NextResponse.json(
        { error: 'Coupon code must be 3-20 characters and contain only uppercase letters, numbers, and hyphens' },
        { status: 400 }
      )
    }
    
    // TODO: Check if coupon code is already taken
    // const isCodeTaken = await checkCouponCodeAvailability(bootcamp_affiliate_coupon_code)
    // if (isCodeTaken) {
    //   return NextResponse.json(
    //     { error: 'This coupon code is already taken' },
    //     { status: 409 }
    //   )
    // }
    
    console.log('Setting bootcamp affiliate coupon for user:', session.user.handle, bootcamp_affiliate_coupon_code)
    
    // TODO: Update database
    // await updateBootcampAffiliateCoupon(session.user.id, bootcamp_affiliate_coupon_code)
    
    return NextResponse.json({
      success: true,
      message: 'Bootcamp affiliate coupon code updated successfully',
      coupon_code: bootcamp_affiliate_coupon_code,
      referral_url: `https://exercism.org/bootcamp?coupon=${bootcamp_affiliate_coupon_code}`
    })
  } catch (error) {
    console.error('Error updating bootcamp affiliate coupon:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}