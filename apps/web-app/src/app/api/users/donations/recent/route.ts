import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

interface Donation {
  id: string
  amount_in_dollars: number
  created_at: string
  user_id: number
}

export async function GET(_: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // In a real implementation, you would check the database for donations
    // For now, we'll return mock data based on user preferences or session
    
    // Calculate 35 days ago
    const thirtyFiveDaysAgo = new Date()
    thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35)

    // Mock logic - in real implementation, query donations table
    // SELECT * FROM donations WHERE user_id = ? AND created_at > ?
    const mockDonations: Donation[] = [
      // Add mock donations here if needed for testing
    ]

    const donatedInLast35Days = mockDonations.length > 0

    return NextResponse.json({
      donatedInLast35Days,
      lastDonationDate: mockDonations.length > 0 ? mockDonations[0]?.created_at : null,
      totalDonatedInDollars: mockDonations.reduce((sum, donation) => sum + donation.amount_in_dollars, 0)
    })

  } catch (error) {
    console.error('Error checking recent donations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}