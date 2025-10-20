import { Metadata } from 'next'
import { Layout } from '@/components/layout/Layout'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'
import { PartnerPerk } from '@/components/partner/PartnerPerk'

export const metadata: Metadata = {
  title: 'Partners - Exercism',
  description: 'Discover exclusive perks and offers from our amazing partners',
}

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

async function getPartnersData(): Promise<{ perks: Perk[] }> {
  // TODO: Replace with actual API call
  const mockPartners: Partner[] = [
    {
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
  ]

  const mockPerks: Perk[] = mockPartners.map((partner, index) => ({
    id: index + 1,
    partner,
    previewText: 'Get exclusive access to Go learning resources',
    offerSummaryHtml: '<strong>Free access</strong> to premium Go courses',
    offerDetails: 'Access premium Go programming courses and mentorship sessions',
    buttonText: 'Claim Perk',
    voucherCode: 'EXERCISM2024',
    links: {
      claim: '/perks/1/claim',
      partner: '/partners/gobridge'
    }
  }))

  return { perks: mockPerks }
}

export default async function PartnersPage() {
  const { perks } = await getPartnersData()

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
              <h1 className="text-h1 mb-12">Our Partners</h1>
              <p className="text-p-large mb-16">
                Discover exclusive perks and offers from our amazing partners who support the Exercism community.
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