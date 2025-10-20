import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { Layout } from '@/components/layout/Layout'
import { CopyToClipboardButton } from '@/components/common/CopyToClipboardButton'
import Link from 'next/link'

interface Perk {
  id: number
  partner: {
    name: string
    websiteDomain: string
  }
  offerSummaryHtml: string
  offerDetails: string
  buttonText: string
  voucherCode?: string
  externalUrl?: string
}

async function getPerkData(id: string): Promise<Perk | null> {
  // TODO: Replace with actual API call
  const perkId = parseInt(id)
  
  if (perkId === 1) {
    return {
      id: 1,
      partner: {
        name: 'GoLang Bridge',
        websiteDomain: 'golangbridge.org'
      },
      offerSummaryHtml: '<strong>Free access</strong> to premium Go courses',
      offerDetails: 'Access premium Go programming courses and mentorship sessions for Exercism users',
      buttonText: 'Access Courses',
      voucherCode: 'EXERCISM2024',
      externalUrl: 'https://golangbridge.org/courses?code=EXERCISM2024'
    }
  }

  if (perkId === 2) {
    return {
      id: 2,
      partner: {
        name: 'DevTools Pro',
        websiteDomain: 'devtools.pro'
      },
      offerSummaryHtml: '<strong>50% off</strong> premium developer tools',
      offerDetails: 'Get 50% off premium developer tools and IDE extensions',
      buttonText: 'Get Discount',
      voucherCode: 'EXERCISM50',
      externalUrl: 'https://devtools.pro/discount?code=EXERCISM50'
    }
  }

  return null
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const perk = await getPerkData(params.id)
  
  if (!perk) {
    return {
      title: 'Perk Not Found - Exercism'
    }
  }

  return {
    title: `Claim ${perk.partner.name} Perk - Exercism`,
    description: perk.offerDetails
  }
}

export default async function ClaimPerkPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    redirect(`/auth/signin?callbackUrl=/perks/${params.id}/claim`)
  }

  const perk = await getPerkData(params.id)

  if (!perk) {
    notFound()
  }

  return (
    <Layout>
      <div className="lg-container py-24">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h1 className="text-h1 mb-6">Claim Your Perk</h1>
            
            <div className="mb-8">
              <h2 className="text-h2 mb-4">{perk.partner.name}</h2>
              <div 
                className="text-p-large mb-4"
                dangerouslySetInnerHTML={{ __html: perk.offerSummaryHtml }} 
              />
              <p className="text-p-base text-gray-600 dark:text-gray-300">
                {perk.offerDetails}
              </p>
            </div>

            {perk.voucherCode && (
              <div className="mb-8">
                <h3 className="text-h3 mb-4">Your Voucher Code</h3>
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                  <CopyToClipboardButton text={perk.voucherCode} />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Copy this code and use it when claiming your perk
                </p>
              </div>
            )}

            <div className="flex gap-4">
              {perk.externalUrl && (
                <Link
                  href={perk.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-m btn-primary"
                >
                  {perk.buttonText}
                </Link>
              )}
              
              <Link
                href="/perks"
                className="btn-m btn-default"
              >
                Back to Perks
              </Link>
            </div>

            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h4 className="font-semibold mb-2">How to claim:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Copy the voucher code above</li>
                <li>Click "{perk.buttonText}" to visit {perk.partner.websiteDomain}</li>
                <li>Enter the code during checkout or registration</li>
                <li>Enjoy your exclusive Exercism member benefit!</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}