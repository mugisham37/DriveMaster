import { Metadata } from 'next'
import { getServerAuthSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { TrainingDataHeader } from '@/components/training-data/TrainingDataHeader'

export const metadata: Metadata = {
  title: 'Training Data - Exercism',
  description: 'Help train Exercism\'s neural network by tagging code samples',
}

interface TrainingDataLayoutProps {
  children: React.ReactNode
}

export default async function TrainingDataLayout({
  children,
}: TrainingDataLayoutProps) {
  const session = await getServerAuthSession()

  // Require authentication for training data pages
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/training-data')
  }

  // In real implementation, check if user is eligible for training data access
  // For now, allow all authenticated users

  return (
    <div className="training-data-layout">
      <TrainingDataHeader selectedTab="tags" />
      <div className="lg-container">
        {children}
      </div>
    </div>
  )
}