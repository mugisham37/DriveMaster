'use client'

import React, { useState } from 'react'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { FormButton } from '@/components/common/forms/FormButton'
import { CopyToClipboardButton } from '@/components/common/CopyToClipboardButton'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'

interface BootcampFreeCouponFormProps {
  insiders_status: string
  bootcamp_free_coupon_code?: string
  links: {
    bootcamp_free_coupon_code: string
  }
}

export default function BootcampFreeCouponForm({
  insiders_status,
  bootcamp_free_coupon_code,
  links
}: BootcampFreeCouponFormProps): React.JSX.Element {
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentCoupon, setCurrentCoupon] = useState(bootcamp_free_coupon_code)

  const { submit, isSubmitting, error } = useFormSubmission({
    endpoint: links.bootcamp_free_coupon_code,
    method: 'POST',
    onSuccess: (data: any) => {
      if (data.coupon_code) {
        setCurrentCoupon(data.coupon_code)
      }
    }
  })

  const isInsider = insiders_status === 'active' || insiders_status === 'active_lifetime'

  const handleGenerateCoupon = async () => {
    setIsGenerating(true)
    await submit({})
    setIsGenerating(false)
  }

  if (!isInsider) {
    return (
      <div className="bootcamp-free-coupon-form">
        <h2 className="text-h3 mb-6">Free Bootcamp Access</h2>
        
        <div className="insider-required p-6 bg-backgroundColorA border border-borderColor6 rounded-8">
          <div className="flex items-start gap-4">
            <GraphicalIcon icon="lock" className="text-textColor6 text-xl mt-1" />
            <div>
              <h3 className="text-h4 mb-2">Insider Benefit</h3>
              <p className="text-textColor6 mb-4">
                Lifetime Insiders get free access to all Exercism Bootcamp courses. 
                This is one of our premium benefits for supporting the platform.
              </p>
              <p className="text-textColor6 text-sm">
                Become a Lifetime Insider to unlock this and other exclusive benefits.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bootcamp-free-coupon-form">
      <h2 className="text-h3 mb-6">Free Bootcamp Access</h2>
      
      <div className="insider-benefit mb-6 p-4 bg-green-50 border border-green-200 rounded-8">
        <div className="flex items-start gap-3">
          <GraphicalIcon icon="check-circle" className="text-green-600 text-xl mt-1" />
          <div>
            <h3 className="text-h4 text-green-800 mb-2">Insider Benefit Active</h3>
            <p className="text-green-700 mb-3">
              As a Lifetime Insider, you have free access to all Exercism Bootcamp courses! 
              Generate your personal coupon code to redeem this benefit.
            </p>
          </div>
        </div>
      </div>

      {currentCoupon ? (
        <div className="current-coupon mb-6">
          <h3 className="text-h4 mb-4">Your Free Bootcamp Coupon</h3>
          
          <div className="coupon-display p-4 bg-backgroundColorB border border-borderColor6 rounded-8">
            <div className="coupon-code mb-3">
              <div className="flex items-center justify-between p-3 bg-backgroundColorA border border-borderColor6 rounded font-mono text-lg">
                <span className="text-prominentLinkColor font-bold">{currentCoupon}</span>
                <CopyToClipboardButton
                  textToCopy={currentCoupon}
                  className="btn-secondary btn-xs"
                />
              </div>
            </div>
            
            <div className="coupon-link">
              <label className="form-label text-sm mb-2 block">Redemption Link:</label>
              <div className="flex items-center justify-between p-2 bg-backgroundColorA border border-borderColor6 rounded font-mono text-sm">
                <span>https://exercism.org/bootcamp?coupon={currentCoupon}</span>
                <CopyToClipboardButton
                  textToCopy={`https://exercism.org/bootcamp?coupon=${currentCoupon}`}
                  className="btn-secondary btn-xs ml-2"
                />
              </div>
            </div>
          </div>

          <div className="coupon-instructions mt-4 p-4 bg-blue-50 border border-blue-200 rounded-8">
            <h4 className="text-blue-800 font-semibold mb-2">How to Use Your Coupon:</h4>
            <ol className="text-blue-700 text-sm space-y-1 list-decimal list-inside">
              <li>Visit the Exercism Bootcamp page</li>
              <li>Select the course you want to take</li>
              <li>Enter your coupon code at checkout</li>
              <li>Enjoy free access to the entire course!</li>
            </ol>
          </div>
        </div>
      ) : (
        <div className="generate-coupon mb-6">
          <h3 className="text-h4 mb-4">Generate Your Free Coupon</h3>
          
          <div className="generate-section p-4 bg-backgroundColorA border border-borderColor6 rounded-8">
            <p className="text-textColor2 mb-4">
              Click the button below to generate your personal free bootcamp coupon code. 
              This code will give you complete access to all bootcamp courses.
            </p>
            
            <FormButton
              onClick={handleGenerateCoupon}
              disabled={isSubmitting || isGenerating}
              className="btn-primary btn-m"
              type="button"
            >
              <GraphicalIcon icon="gift" className="mr-2" />
              {isSubmitting || isGenerating ? 'Generating...' : 'Generate Free Coupon'}
            </FormButton>
          </div>
        </div>
      )}

      {error && (
        <div className="error-message mb-6 p-4 bg-red-50 border border-red-200 rounded-8">
          <span className="text-red-700">Error: {error.message}</span>
        </div>
      )}

      <div className="bootcamp-info p-4 bg-backgroundColorA border border-borderColor6 rounded-8">
        <h4 className="text-h4 mb-3">About Exercism Bootcamp</h4>
        <p className="text-textColor2 mb-3">
          Our bootcamp courses provide intensive, project-based learning experiences 
          designed to take you from beginner to job-ready developer.
        </p>
        
        <div className="bootcamp-features grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="feature flex items-center gap-2">
            <GraphicalIcon icon="check" className="text-green-600" />
            <span>Live coding sessions</span>
          </div>
          <div className="feature flex items-center gap-2">
            <GraphicalIcon icon="check" className="text-green-600" />
            <span>1-on-1 mentoring</span>
          </div>
          <div className="feature flex items-center gap-2">
            <GraphicalIcon icon="check" className="text-green-600" />
            <span>Real-world projects</span>
          </div>
          <div className="feature flex items-center gap-2">
            <GraphicalIcon icon="check" className="text-green-600" />
            <span>Career guidance</span>
          </div>
        </div>
      </div>
    </div>
  )
}