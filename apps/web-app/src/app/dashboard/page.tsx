import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { DashboardPage } from '@/components/dashboard/DashboardPage'
import { getDashboardData } from '@/lib/api/dashboard'
import { ModalManager } from '@/components/modals/ModalManager'

export const metadata: Metadata = {
  title: 'Dashboard - Exercism',
  description: 'Your personal learning dashboard on Exercism',
}

export default async function Dashboard() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const dashboardData = await getDashboardData()

  // Ensure user has all required properties for ExercismUser
  const exercismUser = {
    ...session.user,
    preferences: {
      theme: 'light' as const,
      emailNotifications: true,
      mentorNotifications: true
    },
    tracks: []
  }

  return (
    <>
      <DashboardPage {...dashboardData} user={exercismUser} />
      <ModalManager />
    </>
  )
}