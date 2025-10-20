import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { GraphicalIcon } from '@/components/common'
import { InsidersStatus } from '@/components/insiders'

export const metadata: Metadata = {
  title: 'Insiders - Exercism',
  description: 'Support Exercism and get exclusive benefits as an Insider',
}

export default async function InsidersPage() {
  const session = await getServerSession(authOptions)
  
  const insidersStatusData = {
    status: session?.user?.isInsider ? 'active' as const : 'unset' as const,
    insidersStatusRequest: '/api/insiders/status',
    activateInsiderLink: '/api/insiders/activate',
    userSignedIn: !!session?.user,
    captchaRequired: false,
    recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || '',
    amount: 499,
    links: {
      insiders: '/insiders',
      paymentPending: '/insiders/payment-pending'
    }
  }

  return (
    <div id="page-insiders">
      <div className="gradient-container pt-20 md:pt-48 pb-48">
        <div className="lg-container">
          <div className="top-lhs">
            <h1 className="text-h1 flex items-center gap-20 mb-0 sm:mb-8 lg:text-48 text-30 sm:text-32">
              Insiders
              <GraphicalIcon icon="insiders" className="h-[32px] md:h-[60px] w-[32px] md:w-[60px]" />
            </h1>
            <p className="text-h3 mb-24">Thank you for supporting Exercism!</p>
            <p className="text-p-xlarge mb-8">
              Your support helps us keep Exercism free and accessible to everyone.
            </p>
            
            {session?.user && (
              <div className="mt-8">
                <InsidersStatus {...insidersStatusData} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="gradient-container py-48">
        <div className="lg-container">
          <h2 className="text-h2 mb-32">Your Insider Benefits</h2>
          
          <div className="features grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="feature p-6 bg-white rounded-lg shadow">
              <GraphicalIcon icon="feature-discord" className="filter-yellowPrompt mb-4" />
              <h4 className="text-h4 mb-2">Private Discord Channel</h4>
              <p>Access to our exclusive Insiders Discord channel for direct communication with the team.</p>
            </div>
            
            <div className="feature p-6 bg-white rounded-lg shadow">
              <GraphicalIcon icon="feature-early-access" className="filter-yellowPrompt mb-4" />
              <h4 className="text-h4 mb-2">Early Access</h4>
              <p>Get early access to new features and tracks before they're released to the public.</p>
            </div>
            
            <div className="feature p-6 bg-white rounded-lg shadow">
              <GraphicalIcon icon="feature-no-ads" className="filter-yellowPrompt mb-4" />
              <h4 className="text-h4 mb-2">Ad-Free Experience</h4>
              <p>Enjoy Exercism without any advertisements for a cleaner learning experience.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}