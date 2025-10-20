'use client'

import { useEffect, useRef } from 'react'
import { loadStripe } from '@stripe/stripe-js'

interface BootcampCheckoutProps {
  className?: string
  checkoutElementId?: string
}

export function BootcampCheckout({ 
  className = '',
  checkoutElementId = 'checkout'
}: BootcampCheckoutProps) {
  const checkoutRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)

  useEffect(() => {
    const initialize = async () => {
      if (initializedRef.current) return
      
      // Check if we're on a bootcamp payment page
      if (!window.location.pathname.match(/\/courses\/[\w-]+\/pay/)) {
        return
      }

      const stripeMetaTag = 'meta[name="stripe-publishable-key"]'
      const publishableKeyElement = document.querySelector(stripeMetaTag) as HTMLMetaElement

      if (!publishableKeyElement) {
        console.log(`%cCouldn't find ${stripeMetaTag}`, 'color: yellow')
        return
      }

      try {
        const stripe = await loadStripe(publishableKeyElement.content)
        if (!stripe) {
          throw new Error('Failed to load Stripe')
        }

        const fetchClientSecret = async () => {
          const response = await fetch('/courses/stripe/create-checkout-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
            },
          })

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const data = await response.json()
          return data.clientSecret
        }

        const checkout = await stripe.initEmbeddedCheckout({
          fetchClientSecret,
        })

        if (checkoutRef.current) {
          checkout.mount(checkoutRef.current)
          initializedRef.current = true
        }
      } catch (error) {
        console.error('Failed to initialize Stripe checkout:', error)
      }
    }

    initialize()
  }, [])

  return (
    <div 
      ref={checkoutRef}
      id={checkoutElementId}
      className={className}
    />
  )
}