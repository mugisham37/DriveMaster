import { Metadata } from 'next'
import Link from 'next/link'
import { GraphicalIcon } from '@/components/common'

export const metadata: Metadata = {
  title: 'Thank You - Donation Successful - Exercism',
  description: 'Thank you for your donation to Exercism!',
}

export default function DonationSuccessPage() {
  return (
    <div className="pt-40">
      <div className="flex flex-col items-center pb-40 min-h-[50vh] max-w-[650px] m-auto text-center">
        <GraphicalIcon icon="insiders" className="h-[64px] w-[64px] mb-8" />
        <h1 className="text-h1 flex items-center mb-20">Thank you for your donation!</h1>

        <p className="text-p-large mb-8">
          Your generous support helps us keep Exercism free and accessible to developers worldwide. 
          We&apos;re incredibly grateful for your contribution to our mission.
        </p>
        
        <p className="text-p-large mb-24">
          As a token of our appreciation, you may be eligible for{' '}
          <Link href="/insiders" className="text-prominentLinkColor font-semibold underline">
            Exercism Insiders
          </Link>
          {' '}benefits, including exclusive content and early access to new features.
        </p>
        
        <p className="text-p-large mb-24">
          <Link 
            href="/dashboard" 
            className="btn btn-large btn-primary"
          >
            Go to Dashboard
          </Link>
        </p>
      </div>
    </div>
  )
}