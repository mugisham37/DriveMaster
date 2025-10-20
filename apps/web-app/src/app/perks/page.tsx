import { Metadata } from 'next'
import { Layout } from '@/components/layout/Layout'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'
import { PartnerPerk } from '@/components/partner/PartnerPerk'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Perks - Exercism',
  description: 'Exclusive perks and offers for Exercism community members',
}

interface Partner {
  id: number
  name: string
  lightLogo: string
  darkLogo: string
  websiteDomain: string
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

async function getPerksData(): Promise<Perk[]> {
  // TODO: Replace with actual API call
  const mockPartner: Partner = {
    id: 1,
    name: 'GoLang Bridge',
    lightLogo: '/assets/partners/gobridge-light.png',
    darkLogo: '/assets/partners/gobridge-dark.png',
    websiteDomain: 'golangbridge.org'
  }

  return [
    {
      id: 1,
      partner: mockPartner,
      previewText: 'Get exclusive access to Go learning resources and mentorship sessions.',
      offerSummaryHtml: '<strong>Free access</strong> to premium Go courses',
      offerDetails: 'Access premium Go programming courses and mentorship sessions for Exercism users',
      buttonText: 'Claim Perk',
      voucherCode: 'EXERCISM2024',
      links: {
        claim: '/perks/1/claim',
        partner: '/partners/gobridge'
      }
    },
    {
      id: 2,
      partner: {
        id: 2,
        name: 'DevTools Pro',
        lightLogo: '/assets/partners/devtools-light.png',
        darkLogo: '/assets/partners/devtools-dark.png',
        websiteDomain: 'devtools.pro'
      },
      previewText: 'Professional development tools at a discounted rate.',
      offerSummaryHtml: '<strong>50% off</strong> premium developer tools',
      offerDetails: 'Get 50% off premium developer tools and IDE extensions',
      buttonText: 'Get Discount',
      voucherCode: 'EXERCISM50',
      links: {
        claim: '/perks/2/claim',
        partner: '/partners/devtools-pro'
      }
    }
  ]
}

export default async function PerksPage() {
  const perks = await getPerksData()

  return (
    <Layout>
      <div id="page-partners">
        <nav className="c-header-with-bg mb-32">
          <div className="lg-container flex mt-24 mb-24">
            <div className="content max-w-[820px]">
              <GraphicalIcon 
                icon="contributing-header" 
                className="w-[64px] h-[64px] mb-16" 
              />
              <h1 className="text-h1 mb-12">Perks</h1>
              <p className="text-p-large mb-16">
                Exclusive perks and offers for Exercism community members. 
                <Link 
                  href="/insiders" 
                  className="font-semibold text-linkColor"
                >
                  Insiders
                </Link> get access to even more benefits.
              </p>
            </div>
            <GraphicalIcon 
              icon="contributing-header" 
              className="w-[220px] h-[220px] ml-auto hidden md:block" 
            />
            <div className="decorations"></div>
          </div>
        </nav>

        <div className="lg-container mt-24 mb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-24">
            {perks.map((perk) => (
              <PartnerPerk key={perk.id} perk={perk} />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}