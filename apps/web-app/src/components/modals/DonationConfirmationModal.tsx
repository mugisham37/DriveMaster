'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/common'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'
import { useModalManager } from '@/hooks/useModalManager'
import Link from 'next/link'

interface DonationDetails {
  amount: number
  currency: string
  isRecurring: boolean
  frequency?: 'monthly' | 'yearly'
  transactionId: string
  donorName?: string
}

interface DonationConfirmationModalProps {
  donation?: DonationDetails
}

export function DonationConfirmationModal({ donation }: DonationConfirmationModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { registerModal, canShowModal } = useModalManager()

  useEffect(() => {
    // Register this modal with the modal manager
    registerModal({
      id: 'donation-confirmation-modal',
      priority: 6, // High priority for payment confirmation
      component: DonationConfirmationModal
    })
  }, [registerModal])

  useEffect(() => {
    if (donation && canShowModal('donation-confirmation-modal')) {
      setIsOpen(true)
    }
  }, [donation, canShowModal])

  const handleClose = () => {
    setIsOpen(false)
  }

  if (!donation) return null

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100) // Assuming amount is in cents
  }

  const getDonationTypeText = () => {
    if (donation.isRecurring) {
      return `${formatAmount(donation.amount, donation.currency)} ${donation.frequency}`
    }
    return `${formatAmount(donation.amount, donation.currency)} one-time`
  }

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      className="donation-confirmation-modal"
      ReactModalClassName="max-w-[500px]"
    >
      <div className="text-center p-8">
        <div className="mb-6">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraphicalIcon 
              icon="heart" 
              className="w-10 h-10 text-green-600 dark:text-green-400" 
            />
          </div>
        </div>

        <h2 className="text-h2 mb-4 text-green-700 dark:text-green-300">
          Thank You for Your Donation!
        </h2>
        
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 mb-6">
          <div className="text-lg font-semibold mb-2">
            {getDonationTypeText()}
          </div>
          
          {donation.donorName && (
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              From: {donation.donorName}
            </div>
          )}
          
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Transaction ID: {donation.transactionId}
          </div>
        </div>

        <div className="text-p-base text-gray-700 dark:text-gray-300 mb-6">
          Your generous contribution helps us keep Exercism free for everyone. 
          We&apos;ll send you a receipt via email shortly.
        </div>

        {donation.isRecurring && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Recurring Donation:</strong> You&apos;ll be charged {formatAmount(donation.amount, donation.currency)} 
              {' '}{donation.frequency}. You can manage or cancel this anytime in your settings.
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Link
            href="/settings/donations"
            className="btn-s btn-default"
          >
            Manage Donations
          </Link>
          
          <Link
            href="/dashboard"
            className="btn-s btn-primary"
          >
            Continue Learning
          </Link>
        </div>

        <div className="mt-6 text-xs text-gray-500 dark:text-gray-400">
          Questions about your donation? <Link href="/contact" className="text-linkColor">Contact us</Link>
        </div>
      </div>
    </Modal>
  )
}

export default DonationConfirmationModal