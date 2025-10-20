'use client'

import React, { useState } from 'react'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { FormButton } from '@/components/common/forms/FormButton'
import { InputWithValidation } from '@/components/common/forms/InputWithValidation'
import { CopyToClipboardButton } from '@/components/common/CopyToClipboardButton'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'

interface BootcampAffiliateCouponFormProps {
  insiders_status: string
  bootcamp_affiliate_coupon_code?: string
  context: string
  links: {
    insiders_path: string
    bootcamp_affiliate_coupon_code: string
  }
}

export default function BootcampAffiliateCouponForm({
  insiders_status,
  bootcamp_affiliate_coupon_code,
  context,
  links
}: BootcampAffiliateCouponFormProps): React.JSX.Element {
  const [couponCode, setCouponCode] = useState(bootcamp_affiliate_coupon_code || '')

  const { submit, isSubmitting, isSuccess, error } = useFormSubmission({
    endpoint: links.bootcamp_affiliate_coupon_code,
    method: 'PATCH',
    successMessage: 'Affiliate coupon code updated successfully!'
  })

  const isInsider = insiders_status === 'active' || insiders_status === 'active_lifetime'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submit({ bootcamp_affiliate_coupon_code: couponCode })
  }

  const generateCouponCode = () => {
    // Generate a simple coupon code based on context and random string
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase()
    const newCode = `${context.toUpperCase()}-${randomSuffix}`
    setCouponCode(newCode)
  }

  if (!isInsider) {
    return (
      <div className="bootcamp-affiliate-coupon-form">
        <h2 className="text-h3 mb-6">Bootcamp Affiliate Program</h2>
        
        <div className="insider-required p-6 bg-backgroundColorA border border-borderColor6 rounded-8">
          <div className="flex items-start gap-4">
            <GraphicalIcon icon="lock" className="text-textColor6 text-xl mt-1" />
            <div>
              <h3 className="text-h4 mb-2">Insider Feature</h3>
              <p className="text-textColor6 mb-4">
                The Bootcamp Affiliate Program is available to Exercism Insiders. 
                Earn commissions by referring people to our premium bootcamp courses.
              </p>
              <a
                href={links.insiders_path}
                className="btn-primary btn-m"
              >
                Become an Insider
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bootcamp-affiliate-coupon-form">
      <h2 className="text-h3 mb-6">Bootcamp Affiliate Program</h2>
      
      <div className="affiliate-info mb-6 p-4 bg-backgroundColorA border border-borderColor6 rounded-8">
        <h3 className="text-h4 mb-3">Earn with Exercism Bootcamp</h3>
        <p className="text-textColor2 mb-3">
          As an Insider, you can earn commissions by referring people to our bootcamp courses. 
          Create your unique affiliate coupon code to track referrals and earnings.
        </p>
        <ul className="text-textColor6 text-sm space-y-1">
          <li>• Earn 20% commission on all successful referrals</li>
          <li>• Track your referrals and earnings in real-time</li>
          <li>• Provide value to your audience with exclusive discounts</li>
          <li>• Monthly payouts via PayPal or bank transfer</li>
        </ul>
      </div>

      <div className="form-group mb-6">
        <label htmlFor="coupon-code" className="form-label">
          Your Affiliate Coupon Code
        </label>
        <div className="flex gap-3">
          <InputWithValidation
            id="coupon-code"
            type="text"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            placeholder="Enter your custom coupon code"
            className="form-input flex-1"
            pattern="[A-Z0-9-]+"
          />
          <FormButton
            onClick={generateCouponCode}
            className="btn-secondary btn-m"
            type="button"
          >
            Generate
          </FormButton>
        </div>
        <div className="form-note text-textColor6 text-sm mt-1">
          Use letters, numbers, and hyphens only. This will be your unique referral code.
        </div>
      </div>

      {couponCode && (
        <div className="coupon-preview mb-6 p-4 bg-backgroundColorB border border-borderColor6 rounded-8">
          <h4 className="text-h4 mb-3">Your Referral Link Preview</h4>
          <div className="referral-link p-3 bg-backgroundColorA border border-borderColor6 rounded font-mono text-sm">
            <div className="flex items-center justify-between">
              <span>https://exercism.org/bootcamp?coupon={couponCode}</span>
              <CopyToClipboardButton
                textToCopy={`https://exercism.org/bootcamp?coupon=${couponCode}`}
                className="btn-secondary btn-xs ml-2"
              />
            </div>
          </div>
          <p className="text-textColor6 text-sm mt-2">
            Share this link with your audience. They'll get a discount, and you'll earn a commission!
          </p>
        </div>
      )}

      <div className="form-footer">
        <FormButton
          type="submit"
          disabled={!couponCode || isSubmitting}
          className="btn-primary btn-m"
        >
          {isSubmitting ? 'Saving...' : 'Save Coupon Code'}
        </FormButton>
        
        {isSuccess && (
          <span className="text-green-600 ml-4">
            Affiliate coupon code saved! Start sharing your referral link.
          </span>
        )}
        
        {error && (
          <span className="text-red-600 ml-4">Error: {error.message}</span>
        )}
      </div>

      <div className="affiliate-terms mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-8">
        <h4 className="text-yellow-800 font-semibold mb-2">Affiliate Program Terms:</h4>
        <ul className="text-yellow-800 text-sm space-y-1">
          <li>• Commissions are paid monthly for completed bootcamp enrollments</li>
          <li>• Minimum payout threshold is $50</li>
          <li>• Self-referrals and fraudulent activity will result in account termination</li>
          <li>• Coupon codes must be family-friendly and appropriate</li>
          <li>• Exercism reserves the right to modify commission rates with 30 days notice</li>
        </ul>
      </div>
    </form>
  )
}