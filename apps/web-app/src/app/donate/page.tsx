import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { DonationsForm } from '@/components/donations/DonationsForm'
import { DonationsAlternatives } from '@/components/donations/DonationsAlternatives'
import { GraphicalIcon } from '@/components/common'

export const metadata: Metadata = {
  title: 'Donate - Exercism',
  description: 'Support Exercism and help us provide free programming education to everyone',
}

async function getDonationsData() {
  // Mock data for the progress bar - in real implementation, this would come from the database
  const target = 25000.0
  const actual = 18750.0 // Current monthly donations
  const progress = Math.min(1, actual / target) * 100

  return {
    target,
    actual,
    progress
  }
}

export default async function DonatePage() {
  const session = await getServerSession(authOptions)
  const { target, actual, progress } = await getDonationsData()

  return (
    <div id="page-donate">
      <header className="pt-24 md:mt-40 md:shadow-lgZ1">
        <div className="lg-container flex flex-col items-center c-shapes">
          <GraphicalIcon 
            icon="community-with-exercism-logo" 
            category="graphics"
            className="mb-8"
          />
          <h1 className="text-h1 mb-4">
            <strong className="text-gradient">Support</strong> Exercism
          </h1>

          <div className="text-textColor1 text-20 text-center leading-150 mb-32 max-w-4xl">
            <p>
              Exercism is a{' '}
              <a href="/about" className="underline hover:text-prominentLinkColor">
                mission
              </a>
              -driven platform providing free programming education. Your support helps us maintain our{' '}
              <a href="/about/impact" className="underline hover:text-prominentLinkColor">
                impact
              </a>
              {' '}and grow our{' '}
              <a href="/about/team" className="underline hover:text-prominentLinkColor">
                team
              </a>
              .
            </p>
          </div>
        </div>

        <div className="sm-container !pb-28">
          <div className="border-1 border-borderColor6 shadow-smZ1 rounded-8 p-32 w-100 lg:mb-128 mb-32">
            <div className="c-progress relative">
              <div 
                className="bar bg-gradient-to-r from-blue-500 to-purple-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
              
              <div 
                className="current-icon absolute top-0 transform -translate-y-1/2"
                style={{ left: `calc(${Math.round(progress)}% - 18px)` }}
              >
                <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">$</span>
                </div>
              </div>

              <div 
                className="actual-number hidden md:block absolute -top-16"
                style={{ left: `calc(${Math.round(progress)}% - 160px)` }}
              >
                <div className="bg-white px-4 py-2 rounded-lg shadow-md border">
                  <div className="text-sm text-gray-600">Monthly donations</div>
                  <div className="font-semibold text-lg">${actual.toLocaleString()}</div>
                </div>
              </div>

              <div className="target-icon absolute top-0 right-0 transform -translate-y-1/2">
                <GraphicalIcon icon="party-popper" className="w-9 h-9" />
              </div>

              <div className="goal absolute -top-16 right-0">
                <div className="bg-white px-4 py-2 rounded-lg shadow-md border">
                  <div className="text-sm text-gray-600">Sustainable at</div>
                  <div className="font-semibold text-lg">${target.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="lg-container">
        <div id="anchor-donate" />
        <article className="pt-40">
          {session?.user ? (
            <section className="form-section">
              <DonationsForm user={{
                ...session.user,
                preferences: { theme: 'system', emailNotifications: true, mentorNotifications: true },
                tracks: []
              }} />
              <DonationsAlternatives />
            </section>
          ) : (
            <section className="form-section flex-shrink-0 md:w-[500px] w-full">
              <div className="c-donations-form p-32 text-center bg-white rounded-lg shadow-lg">
                <h2 className="text-h4 mb-8">Support Exercism</h2>
                <p className="text-p-base mb-8">
                  Please{' '}
                  <a href="/auth/signin" className="text-prominentLinkColor underline">
                    log in
                  </a>
                  {' '}or{' '}
                  <a href="/auth/signup" className="text-prominentLinkColor underline">
                    sign up
                  </a>
                  {' '}to make a donation.
                </p>
              </div>
              <DonationsAlternatives />
            </section>
          )}

          <section className="info-section pt-48 lg:pt-0">
            <h2 className="text-h2 mb-2">Why donate to Exercism?</h2>
            <p className="text-p-large mb-16">
              Your support helps us provide free, high-quality programming education to everyone, everywhere.
            </p>

            <div className="w-full mb-40">
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <GraphicalIcon icon="play-circle" className="w-16 h-16 text-gray-400 mb-4" />
                  <p className="text-gray-500">Video: The Impact of Exercism</p>
                </div>
              </div>
            </div>

            <h2 className="text-h2 mb-32">Ways to support us</h2>

            <div className="flex md:flex-row flex-col gap-20 shadow-baseZ1 p-24 rounded-16 bg-backgroundColorA mb-16 border-2 border-gradient relative">
              <GraphicalIcon 
                icon="money-contribution" 
                category="graphics" 
                className="h-[96px] w-[96px]"
              />
              <div className="flex flex-col">
                <div className="text-h4 mb-4">Monthly Donations</div>
                <div className="text-prose text-textColor5">
                  <span className="hidden lg:inline">
                    Set up a recurring monthly donation to provide steady support for our mission. 
                    Even small amounts make a big difference when sustained over time.{' '}
                    <span className="font-semibold">
                      Monthly donors get special recognition and early access to new features!
                    </span>
                  </span>
                  <span className="inline lg:hidden">
                    Monthly donations provide steady support for our mission.{' '}
                    <span className="font-semibold">
                      Get special recognition and early access to new features!
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div className="flex md:flex-row flex-col gap-20 shadow-base p-24 rounded-16 bg-backgroundColorA mb-16">
              <GraphicalIcon 
                icon="organisation-contribution" 
                category="graphics" 
                className="h-[96px] w-[96px]"
              />
              <div className="flex flex-col">
                <div className="text-h4 mb-4">Corporate Sponsorship</div>
                <div className="text-prose text-textColor5">
                  Is your company interested in supporting developer education? We offer corporate 
                  sponsorship packages with benefits like logo placement and recruitment opportunities.{' '}
                  <a 
                    href="mailto:fundraising@exercism.org" 
                    className="text-prominentLinkColor font-medium underline"
                  >
                    Contact us at fundraising@exercism.org
                  </a>
                </div>
              </div>
            </div>

            <div className="flex md:flex-row flex-col gap-20 shadow-base p-24 rounded-16 bg-backgroundColorA mb-16">
              <GraphicalIcon 
                icon="social-contribution" 
                category="graphics" 
                className="h-[96px] w-[96px]"
              />
              <div className="flex flex-col">
                <div className="text-h4 mb-4">Spread the Word</div>
                <div className="text-prose text-textColor5">
                  Help us reach more developers by sharing Exercism on social media! Follow us on{' '}
                  <a 
                    href="https://twitter.com/exercism_io" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-prominentLinkColor font-medium underline"
                  >
                    Twitter
                  </a>
                  ,{' '}
                  <a 
                    href="https://github.com/exercism" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-prominentLinkColor font-medium underline"
                  >
                    GitHub
                  </a>
                  , and{' '}
                  <a 
                    href="https://www.linkedin.com/company/exercism/" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-prominentLinkColor font-medium underline"
                  >
                    LinkedIn
                  </a>
                </div>
              </div>
            </div>
          </section>
        </article>
      </div>
    </div>
  )
}