import { Metadata } from 'next'
import { getServerAuthSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MentorHeader } from '@/components/mentoring/MentorHeader'

export const metadata: Metadata = {
  title: 'Mentoring - Exercism',
  description: 'Help students improve their coding skills through mentoring',
}

interface MentoringLayoutProps {
  children: React.ReactNode
}

export default async function MentoringLayout({
  children,
}: MentoringLayoutProps) {
  const session = await getServerAuthSession()

  // Require authentication for all mentoring pages
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/mentoring')
  }

  // Require mentor status for all mentoring pages
  if (!session.user.isMentor) {
    redirect('/dashboard')
  }

  // Determine selected tab based on current path
  // In a real implementation, this would be passed from the page component
  const selectedTab = 'workspace' // Default tab

  return (
    <div className="mentoring-layout">
      <MentorHeader selectedTab={selectedTab} />
      <div className="lg-container">
        {children}
      </div>
    </div>
  )
}