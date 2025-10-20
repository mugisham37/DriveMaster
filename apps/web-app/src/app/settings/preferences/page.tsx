import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { 
  ThemePreferenceForm, 
  CommentsPreferenceForm,
  BootcampAffiliateCouponForm,
  BootcampFreeCouponForm
} from '@/components/settings'

export const metadata: Metadata = {
  title: 'Preferences - Exercism',
  description: 'Manage your Exercism preferences and settings'
}

async function getPreferencesData(userId: number) {
  // TODO: Fetch actual preferences from database
  
  const mockData = {
    theme_preference: 'light',
    comments_preference: true,
    num_published_solutions: 42,
    num_solutions_with_comments_enabled: 38,
    bootcamp_affiliate_coupon_code: '',
    bootcamp_free_coupon_code: null
  }

  return mockData
}

export default async function PreferencesSettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/settings/preferences')
  }

  const preferencesData = await getPreferencesData(session.user.id)

  return (
    <div id="page-settings-preferences" className="page-settings">
      <div className="lg-container">
        <article>
          <h1 className="text-h2 mb-8">Preferences</h1>
          
          <section id="theme-preference-form" className="mb-12">
            <ThemePreferenceForm
              default_theme_preference={preferencesData.theme_preference}
              insiders_status={session.user.isInsider ? 'active' : 'ineligible'}
              links={{
                update: '/api/settings/preferences',
                insiders_path: '/insiders'
              }}
            />
          </section>
          
          <section id="comments-preference-form" className="mb-12">
            <CommentsPreferenceForm
              current_preference={preferencesData.comments_preference}
              label="Allow comments on published solutions"
              num_published_solutions={preferencesData.num_published_solutions}
              num_solutions_with_comments_enabled={preferencesData.num_solutions_with_comments_enabled}
              links={{
                update: '/api/settings/preferences',
                enable_comments_on_all_solutions: '/api/settings/preferences',
                disable_comments_on_all_solutions: '/api/settings/preferences'
              }}
            />
          </section>

          {session.user.isInsider && (
            <>
              <section id="bootcamp-affiliate-coupon-form" className="mb-12">
                <BootcampAffiliateCouponForm
                  insiders_status={session.user.isInsider ? 'active' : 'ineligible'}
                  bootcamp_affiliate_coupon_code={preferencesData.bootcamp_affiliate_coupon_code}
                  context="INSIDER"
                  links={{
                    insiders_path: '/insiders',
                    bootcamp_affiliate_coupon_code: '/api/settings/bootcamp-affiliate-coupon'
                  }}
                />
              </section>

              <section id="bootcamp-free-coupon-form" className="mb-12">
                <BootcampFreeCouponForm
                  insiders_status={session.user.isInsider ? 'active' : 'ineligible'}
                  bootcamp_free_coupon_code={preferencesData.bootcamp_free_coupon_code}
                  links={{
                    bootcamp_free_coupon_code: '/api/settings/bootcamp-free-coupon'
                  }}
                />
              </section>
            </>
          )}
        </article>
      </div>
    </div>
  )
}