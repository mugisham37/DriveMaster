import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { CommunicationPreferencesForm } from '@/components/settings'

export const metadata: Metadata = {
  title: 'Notification Settings - Exercism',
  description: 'Manage your email and notification preferences'
}

async function getCommunicationPreferences() {
  // TODO: Fetch actual communication preferences from database
  
  const mockPreferences = [
    {
      key: 'email_on_mentor_started_discussion',
      label: 'Mentor started discussion',
      description: 'When a mentor starts discussing your solution',
      enabled: true,
      category: 'email' as const
    },
    {
      key: 'email_on_mentor_replied_to_discussion',
      label: 'Mentor replied to discussion',
      description: 'When a mentor replies in an ongoing discussion',
      enabled: true,
      category: 'email' as const
    },
    {
      key: 'email_on_student_replied_to_discussion',
      label: 'Student replied to discussion',
      description: 'When a student replies to your mentoring discussion',
      enabled: true,
      category: 'email' as const
    },
    {
      key: 'email_on_acquired_badge',
      label: 'Badge acquired',
      description: 'When you earn a new badge',
      enabled: false,
      category: 'email' as const
    },
    {
      key: 'notification_on_mentor_started_discussion',
      label: 'Mentor started discussion',
      description: 'In-app notification when a mentor starts discussing your solution',
      enabled: true,
      category: 'notifications' as const
    },
    {
      key: 'notification_on_mentor_replied_to_discussion',
      label: 'Mentor replied to discussion',
      description: 'In-app notification when a mentor replies in a discussion',
      enabled: true,
      category: 'notifications' as const
    },
    {
      key: 'notification_on_acquired_badge',
      label: 'Badge acquired',
      description: 'In-app notification when you earn a new badge',
      enabled: true,
      category: 'notifications' as const
    },
    {
      key: 'marketing_emails',
      label: 'Marketing emails',
      description: 'Updates about new features, courses, and community events',
      enabled: false,
      category: 'marketing' as const
    },
    {
      key: 'product_updates',
      label: 'Product updates',
      description: 'Important announcements about Exercism platform changes',
      enabled: true,
      category: 'marketing' as const
    }
  ]

  return mockPreferences
}

export default async function NotificationSettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/settings/notifications')
  }

  const communicationPreferences = await getCommunicationPreferences()

  return (
    <div id="page-settings-notifications" className="page-settings">
      <div className="lg-container">
        <article>
          <CommunicationPreferencesForm
            preferences={communicationPreferences}
            links={{
              update: '/api/settings/communication-preferences'
            }}
          />
        </article>
      </div>
    </div>
  )
}