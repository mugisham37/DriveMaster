'use client'

import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/common/Modal'
import { GraphicalIcon } from '@/components/common'
import { useAuth } from '@/hooks/useAuth'
import { useModalManager } from '@/hooks/useModalManager'
import { JSX } from 'react/jsx-runtime'

interface BegModalProps {
  previousDonor?: boolean
}

export function BegModal({ previousDonor = false }: BegModalProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { user, isAuthenticated } = useAuth()
  const { registerModal, canShowModal } = useModalManager()

  useEffect(() => {
    // Register this modal with the modal manager
    registerModal({
      id: 'beg-modal',
      priority: 2, // Lower priority than welcome modals
      component: BegModal
    })
  }, [registerModal])

  useEffect(() => {
    const checkShouldShow = async () => {
      if (!isAuthenticated || !user) return
      if (!canShowModal('beg-modal')) return

      try {
        // Check all conditions from Ruby version
        const conditions = await Promise.all([
          checkSubscriptionStatus(),
          checkDonationHistory(),
          checkSolutionCount(),
          checkIntroducerDismissal(),
          checkSeniorityModalRecent()
        ])

        const [
          hasSubscription,
          donatedRecently,
          hasSufficientSolutions,
          isIntroducerDismissed,
          recentlySawSeniorityModal
        ] = conditions

        // Show modal if all conditions are met (matching Ruby logic)
        if (!hasSubscription && 
            !donatedRecently && 
            hasSufficientSolutions && 
            !isIntroducerDismissed &&
            !recentlySawSeniorityModal) {
          setIsOpen(true)
        }
      } catch (error) {
        console.error('Error checking beg modal conditions:', error)
      }
    }

    checkShouldShow()
  }, [isAuthenticated, user, canShowModal])

  const checkSubscriptionStatus = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/payments/subscriptions')
      if (response.ok) {
        const data = await response.json()
        return data.currentSubscription !== null
      }
    } catch (error) {
      console.error('Error checking subscription status:', error)
    }
    return false
  }

  const checkDonationHistory = async (): Promise<boolean> => {
    try {
      // Check if user donated in last 35 days
      const response = await fetch('/api/users/donations/recent')
      if (response.ok) {
        const data = await response.json()
        return data.donatedInLast35Days
      }
    } catch (error) {
      console.error('Error checking donation history:', error)
    }
    return false
  }

  const checkSolutionCount = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/journey/solutions')
      if (response.ok) {
        const data = await response.json()
        return data.solutions.length >= 5
      }
    } catch (error) {
      console.error('Error checking solution count:', error)
    }
    return false
  }

  const checkIntroducerDismissal = async (): Promise<boolean> => {
    const introducerSlug = 'beg-modal'
    
    // Check if dismissed and if dismissal was more than 1 month ago
    const dismissedIntroducers = user?.preferences?.dismissedIntroducers || []
    const isDismissed = dismissedIntroducers.includes(introducerSlug)
    
    if (!isDismissed) return false

    try {
      // Check dismissal date from server
      const response = await fetch(`/api/settings/introducers/${introducerSlug}/status`)
      if (response.ok) {
        const data = await response.json()
        if (data.dismissedAt) {
          const dismissedDate = new Date(data.dismissedAt)
          const oneMonthAgo = new Date()
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
          
          // If dismissed more than a month ago, reset dismissal
          if (dismissedDate < oneMonthAgo) {
            await fetch(`/api/settings/introducers/${introducerSlug}`, {
              method: 'DELETE'
            })
            return false
          }
        }
      }
    } catch (error) {
      console.error('Error checking introducer dismissal:', error)
    }
    
    return true
  }

  const checkSeniorityModalRecent = (): boolean => {
    // Check if seniority modal was shown recently (within 5 minutes)
    const shownAt = sessionStorage.getItem('shown_seniority_modal_at')
    if (!shownAt) return false

    try {
      const shownDate = new Date(shownAt)
      const fiveMinutesAgo = new Date()
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5)
      
      return shownDate > fiveMinutesAgo
    } catch (error) {
      return false
    }
  }

  const handleDismiss = async () => {
    const introducerSlug = 'beg-modal'
    
    try {
      await fetch(`/api/settings/introducers/${introducerSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissed: true })
      })
      setIsOpen(false)
    } catch (error) {
      console.error('Error dismissing beg modal:', error)
      setIsOpen(false)
    }
  }

  const handleDonateClick = async () => {
    setIsLoading(true)
    try {
      // Redirect to donations page
      window.location.href = '/settings/donations'
    } catch (error) {
      console.error('Error navigating to donations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated || !user) {
    return <></>
  }

  return (
    <Modal
      open={isOpen}
      onClose={handleDismiss}
      theme="light"
      cover={true}
      closeButton={true}
      ReactModalClassName="max-w-[600px]"
    >
      <div className="beg-modal p-8 text-center">
        <GraphicalIcon 
          icon="donation-superhero" 
          className="h-[80px] w-[80px] mx-auto mb-6" 
        />
        
        <h2 className="text-h2 mb-4">
          Help Keep Exercism Free
        </h2>
        
        <p className="text-p-large text-textColor6 mb-6">
          {previousDonor 
            ? "Thank you for your previous support! Your continued donations help us keep Exercism free for everyone."
            : "Exercism is free thanks to the generosity of our community. Consider supporting us to help keep it that way."
          }
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="text-center">
            <GraphicalIcon icon="globe" className="h-[40px] w-[40px] mx-auto mb-2" />
            <p className="text-p-small text-textColor6">Free for Everyone</p>
          </div>
          <div className="text-center">
            <GraphicalIcon icon="mentoring" className="h-[40px] w-[40px] mx-auto mb-2" />
            <p className="text-p-small text-textColor6">Human Mentoring</p>
          </div>
          <div className="text-center">
            <GraphicalIcon icon="exercises" className="h-[40px] w-[40px] mx-auto mb-2" />
            <p className="text-p-small text-textColor6">Quality Exercises</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleDonateClick}
            disabled={isLoading}
            className="btn-primary btn-l"
          >
            {isLoading ? 'Loading...' : 'Support Exercism'}
          </button>
          
          <button
            onClick={handleDismiss}
            className="btn-secondary btn-l"
          >
            Maybe Later
          </button>
        </div>

        <p className="text-p-xs text-textColor6 mt-4">
          Even small donations make a big difference
        </p>
      </div>
    </Modal>
  )
}