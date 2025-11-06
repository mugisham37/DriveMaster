import { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DonationsSettingsPage } from '@/components/settings/DonationsSettingsPage';

export const metadata: Metadata = {
  title: 'Donation Settings - Exercism',
  description: 'Manage your donations and subscriptions to Exercism'
};

async function getDonationsData(_userId: number) {
  // TODO: Fetch actual donations data from database
  // This would typically fetch user's payment history and current subscription
  
  const mockPayments = [
    {
      id: 1,
      amount_in_dollars: 10,
      created_at: '2024-01-15T10:00:00Z',
      subscription: true,
      provider: 'stripe',
      external_receipt_url: 'https://stripe.com/receipt/123'
    },
    {
      id: 2,
      amount_in_dollars: 25,
      created_at: '2024-01-01T10:00:00Z',
      subscription: false,
      provider: 'stripe',
      external_receipt_url: 'https://stripe.com/receipt/124'
    }
  ];

  const mockSubscription = {
    id: 'sub_123',
    provider: 'stripe',
    amount_in_cents: 1000,
    status: 'active',
    created_at: '2024-01-01T10:00:00Z'
  };

  const mockTotals = {
    total_subscription_donations_in_dollars: 50,
    total_one_off_donations_in_dollars: 75
  };

  return {
    payments: mockPayments,
    currentSubscription: mockSubscription,
    totals: mockTotals
  };
}

export default async function DonationsSettingsPageRoute() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/auth/signin?callbackUrl=/settings/donations');
  }

  const donationsData = await getDonationsData(user.id);

  return (
    <DonationsSettingsPage
      user={{
        ...user,
        preferences: { theme: 'system', emailNotifications: true, mentorNotifications: true },
        tracks: []
      }}
      payments={donationsData.payments}
      currentSubscription={donationsData.currentSubscription}
      totals={donationsData.totals}
    />
  );
}