import { Metadata } from 'next'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { NotificationsList } from '@/components/notifications/NotificationsList'

export const metadata: Metadata = {
  title: 'Notifications - Exercism',
  description: 'View all your notifications and updates from Exercism',
}

interface NotificationsPageProps {
  searchParams: {
    status?: 'all' | 'unread' | 'read'
    type?: string
    page?: string
  }
}

export default async function NotificationsPage({
  searchParams
}: NotificationsPageProps) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin?callbackUrl=/notifications')
  }

  const notificationsRequest = {
    endpoint: '/api/notifications',
    query: {
      status: (searchParams.status as 'all' | 'unread' | 'read') || 'all',
      type: searchParams.type || '',
      page: searchParams.page ? parseInt(searchParams.page) : 1
    },
    options: { staleTime: 0 }
  }

  return (
    <div className="notifications-page">
      <div className="lg-container">
        <header className="page-header mb-8">
          <h1 className="text-h1 mb-4">Notifications</h1>
          <p className="text-p-large text-textColor6">
            Stay up to date with your Exercism activity, mentoring discussions, and achievements.
          </p>
        </header>

        <NotificationsList 
          request={notificationsRequest}
          defaultStatus={searchParams.status || 'all'}
        />
      </div>
    </div>
  )
}