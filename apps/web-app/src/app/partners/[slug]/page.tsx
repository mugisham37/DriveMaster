import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Layout } from '@/components/layout/Layout'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'
import { CopyToClipboardButton } from '@/components/common/CopyToClipboardButton'


interface Partner {
  id: number
  name: string
  lightLogo: string
  darkLogo: string
  websiteDomain: string
  headline: string
  description: string
  descriptionHtml: string
  supportMarkdown?: string
  supportHtml?: string
}

interface Perk {
  id: number
  partner: Partner
  previewText: string
  offerSummaryHtml: string
  offerDetails: string
  buttonText: string
  voucherCode?: string
  links: {
    claim: string
    partner: string
  }
}

async function getPartnerData(slug: string): Promise<{ partner: Partner, perk: Perk } | null> {
  // TODO: Replace with actual API call
  if (slug === 'gobridge') {
    const partner: Partner = {
      id: 1,
      name: 'GoLang Bridge',
      lightLogo: '/assets/partners/gobridge-light.png',
      darkLogo: '/assets/partners/gobridge-dark.png',
      websiteDomain: 'golangbridge.org',
      headline: 'Learn Go with the Community',
      description: 'GoLang Bridge is a community-driven organization focused on helping developers learn Go.',
      descriptionHtml: '<p>GoLang Bridge is a community-driven organization focused on helping developers learn Go.</p>',
      supportMarkdown: 'We provide mentorship and resources for Go developers.',
      supportHtml: '<p>We provide mentorship and resources for Go developers.</p>'
    }

    const perk: Perk = {
      id: 1,
      partner,
      previewText: 'Get exclusive access to Go learning resources',
      offerSummaryHtml: '<strong>Free access</strong> to premium Go courses',
      offerDetails: 'Access premium Go programming courses and mentorship sessions for Exercism users',
      buttonText: 'Claim Your Free Access',
      voucherCode: 'EXERCISM2024',
      links: {
        claim: '/perks/1/claim',
        partner: `https://${partner.websiteDomain}`
      }
    }

    return { partner, perk }
  }

  return null
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await getPartnerData(params.slug)
  
  if (!data) {
    return {
      title: 'Partner Not Found - Exercism'
    }
  }

  return {
    title: `${data.partner.name} - Partners - Exercism`,
    description: data.partner.description
  }
}

function PartnerShowClient({ partner, perk }: { partner: Partner, perk: Perk }) {
  // This would use useAuth hook in a client component
  const isSignedIn = false // TODO: Get from auth context

  return (
    <div className="lg-container flex flex-col gap-x-40 gap-y-32 lg:flex-row">
      <div className="lhs">
        <h1 className="text-h1 mb-20">{partner.headline}</h1>

        <div className="c-textual-content --large">
          <div dangerouslySetInnerHTML={{ __html: partner.descriptionHtml }} />
        </div>

        {partner.supportHtml && (
          <>
            <hr className="c-divider mt-24 mb-32" />
            <div className="c-textual-content --large">
              <h2 className="text-h2">Support from {partner.name}</h2>
              <div 
                className="text-p-large mb-40"
                dangerouslySetInnerHTML={{ __html: partner.supportHtml }} 
              />
            </div>
          </>
        )}
      </div>

      <div className="rhs">
        <div className="border-gradient-lightPurple border-2 p-20 rounded-8 shadow-smZ1 mb-32">
          <div className="text-adaptivePurple font-semibold leading-150 flex items-center mb-4">
            Exclusive Perk
          </div>
          <h2 className="text-textColor1 text-p-xlarge font-semibold mb-8">
            <div dangerouslySetInnerHTML={{ __html: perk.offerSummaryHtml }} />
          </h2>
          <p className="text-p-base mb-20">{perk.offerDetails}</p>
          
          {!isSignedIn ? (
            <Link 
              href="/auth/signin" 
              className="btn-m btn-primary"
            >
              Sign in to claim perk
            </Link>
          ) : (
            <>
              {perk.voucherCode && (
                <div className="mb-20">
                  <CopyToClipboardButton text={perk.voucherCode} />
                </div>
              )}
              <Link 
                href={perk.links.claim} 
                className="btn-m btn-primary"
              >
                {perk.buttonText}
              </Link>
            </>
          )}
        </div>

        <div className="border-1 border-borderColor8 p-20 rounded-8 shadow-base">
          <h2 className="text-p-xlarge font-semibold mb-8">
            Learn more about {partner.name}
          </h2>
          <p className="text-p-base mb-20">
            Visit {partner.websiteDomain} to learn more about {partner.name} and their services.
          </p>
          <Link 
            href={perk.links.partner} 
            className="btn-m btn-default"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit {partner.websiteDomain}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default async function PartnerShowPage({ params }: { params: { slug: string } }) {
  const data = await getPartnerData(params.slug)

  if (!data) {
    notFound()
  }

  const { partner, perk } = data

  return (
    <Layout>
      <div id="page-perk">
        <header className="pt-20 pb-24">
          <div className="lg-container">
            <Link href="/partners" className="c-prominent-link mb-24">
              <GraphicalIcon icon="arrow-left" />
              <span>All Partners</span>
            </Link>

            <Image
              src={partner.lightLogo}
              alt={`${partner.name} logo`}
              width={200}
              height={80}
              className="logo logo-light"
            />
            <Image
              src={partner.darkLogo}
              alt={`${partner.name} logo`}
              width={200}
              height={80}
              className="logo logo-dark"
            />
          </div>
        </header>

        <PartnerShowClient partner={partner} perk={perk} />
      </div>
    </Layout>
  )
}