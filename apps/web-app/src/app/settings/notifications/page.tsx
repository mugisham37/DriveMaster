import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { NotificationPreferences } from '@/components/notifications'
import { CommunicationPreferencesForm } from '@/components/settings'

export const metadata: Metadata = {
  title: 'Notification Settings - Exercism',
  description: 'Manage your notification preferences, quiet hours, and delivery channels'
}

async function getCommunicationPreferences() {
  // Legacy communication preferences for backward compatibility
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
        <article className="space-y-8">
          {/* Enhanced Notification Preferences */}
          <section>
            <NotificationPreferences />
          </section>

          {/* Legacy Communication Preferences for backward compatibility */}
          <section className="border-t border-borderColor6 pt-8">
            <div className="mb-6">
              <h3 className="text-h4 mb-2">Legacy Email Preferences</h3>
              <p className="text-textColor6 text-sm">
                These are legacy email preferences. For comprehensive notification management, 
                use the notification preferences above.
              </p>
            </div>
            <CommunicationPreferencesForm
              preferences={communicationPreferences}
              links={{
                update: '/api/settings/communication-preferences'
              }}
            />
          </section>
        </article>
      </div>
    </div>
  )
}