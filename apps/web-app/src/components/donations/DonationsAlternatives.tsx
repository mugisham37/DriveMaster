'use client'

import { GraphicalIcon } from '@/components/common'

export function DonationsAlternatives() {
  return (
    <div className="mt-28 max-w-[550px]">
      <h2 className="text-h5 mb-4">Alternative ways to donate</h2>
      <p className="text-p-base mb-8">
        Prefer a different payment method? You can also support us through these platforms. 
        For any issues, please{' '}
        <a href="mailto:jeremy@exercism.org" className="text-prominentLinkColor underline">
          contact Jeremy
        </a>
        .
      </p>
      
      <div className="flex flex-col items-start gap-12">
        <a
          href="https://www.paypal.com/donate/?hosted_button_id=PAYPAL_BUTTON_ID"
          className="btn-m btn-secondary flex items-center gap-3"
          target="_blank"
          rel="noopener noreferrer"
        >
          <GraphicalIcon 
            icon="paypal" 
            category="graphics" 
            className="!filter-none w-6 h-6"
          />
          <span>Donate with PayPal</span>
        </a>
        
        <a
          href="https://github.com/sponsors/exercism"
          className="btn-m btn-secondary flex items-center gap-3"
          target="_blank"
          rel="noopener noreferrer"
        >
          <GraphicalIcon 
            icon="external-site-github"
            className="w-6 h-6"
          />
          <span>GitHub Sponsors</span>
        </a>
      </div>
    </div>
  )
}