import { Metadata } from 'next'
import Link from 'next/link'
import { GraphicalIcon } from '@/components/common'

export const metadata: Metadata = {
  title: 'Payment Cancelled - Insiders - Exercism',
  description: 'Your PayPal payment was cancelled',
}

export default function PaypalCancelledPage() {
  return (
    <div id="page-insiders">
      <div className="flex flex-col items-center pt-40 pb-40 min-h-[50vh]">
        <GraphicalIcon icon="insiders" className="h-[64px] w-[64px] mb-8" />
        <h1 className="text-h1 flex items-center mb-8">Insiders</h1>
        
        <p className="text-p-large mb-16">
          Your PayPal payment was cancelled. No charges have been made to your account.
        </p>
        
        <Link 
          href="/insiders" 
          className="btn-l btn-primary"
        >
          Return to Insiders
        </Link>
      </div>
    </div>
  )
}