import { Metadata } from 'next'
import { GraphicalIcon } from '@/components/common'
import { PaymentPending } from '@/components/insiders'

export const metadata: Metadata = {
  title: 'Payment Pending - Insiders - Exercism',
  description: 'Your payment is being processed',
}

export default function PaymentPendingPage() {
  const paymentPendingData = {
    endpoint: '/api/insiders/status',
    insidersRedirectPath: '/insiders'
  }

  return (
    <div id="page-insiders">
      <div className="flex flex-col items-center pt-40 pb-40 min-h-[50vh]">
        <GraphicalIcon icon="insiders" className="h-[64px] w-[64px] mb-8" />
        <h1 className="text-h1 flex items-center mb-8">Insiders</h1>
        
        <p className="text-p-large mb-24">
          Your payment is being processed. Please wait while we confirm your transaction.
        </p>
        
        <GraphicalIcon 
          icon="spinner" 
          className="filter-textColor6 h-[64px] w-[64px] animate-spin-slow" 
        />
        
        <PaymentPending {...paymentPendingData} />
      </div>
    </div>
  )
}