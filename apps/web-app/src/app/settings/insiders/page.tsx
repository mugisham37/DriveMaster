import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { InsiderBenefitsForm } from '@/components/settings'

export const metadata: Metadata = {
  title: 'Insider Settings - Exercism',
  description: 'Manage your Insider benefits and preferences',
}

export default async function InsidersSettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return (
      <div className="page-settings">
        <div className="lg-container">
          <p>Please sign in to access Insider settings.</p>
        </div>
      </div>
    )
  }

  const insiderBenefitsData = {
    defaultPreferences: {
      hideAdverts: session.user.isInsider,
      theme: 'system' as const,
      emailNotifications: true,
      mentorNotifications: true
    },
    insidersStatus: session.user.isInsider ? 'active' : 'ineligible',
    links: {
      insidersPath: '/insiders'
    }
  }

  return (
    <div id="page-settings-preferences" className="page-settings">
      <div className="lg-container">
        <article>
          <h1>Insiders</h1>
          
          <section id="insider-benefits-form">
            <InsiderBenefitsForm {...insiderBenefitsData} />
          </section>
          
          {session.user.isInsider && (
            <section id="bootcamp-free-coupon-form" className="mt-8">
              <h2>Bootcamp Benefits</h2>
              <p>As a lifetime insider, you have access to exclusive bootcamp benefits.</p>
            </section>
          )}
        </article>
      </div>
    </div>
  )
}