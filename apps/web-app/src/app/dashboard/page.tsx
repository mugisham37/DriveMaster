import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
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

  const dashboardData = await getDashboardData(session.user.id)

  return (
    <>
      <DashboardPage {...dashboardData} user={session.user} />
      <ModalManager />
    </>
  )
}