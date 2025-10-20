import { NextRequest, NextResponse } from 'next/server';
import { getServerAuthSession } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerAuthSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscriptionId = params.id;

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'Subscription ID is required' },
        { status: 400 }
      );
    }

    // TODO: Implement actual subscription cancellation with Stripe
    // This would cancel the subscription with your payment provider
    console.log('Cancelling subscription:', {
      subscription_id: subscriptionId,
      user_id: session.user.id
    });

    // Mock successful cancellation
    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
      subscription: {
        id: subscriptionId,
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}