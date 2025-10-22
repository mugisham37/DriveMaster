'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/common'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'
import { useModalManager } from '@/hooks/useModalManager'

interface Badge {
  id: string
  name: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'ultimate'
  iconUrl: string
  reason: string
  earnedAt: string
}

interface BadgeModalProps {
  badge?: Badge
}

export function BadgeModal({ badge }: BadgeModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { registerModal, canShowModal } = useModalManager()

  useEffect(() => {
    // Register this modal with the modal manager
    registerModal({
      id: 'badge-modal',
      priority: 5, // High priority for achievement feedback
      component: BadgeModal
    })
  }, [registerModal])

  useEffect(() => {
    if (badge && canShowModal('badge-modal')) {
      setIsOpen(true)
    }
  }, [badge, canShowModal])

  const handleClose = () => {
    setIsOpen(false)
  }

  if (!badge) return null

  const getRarityClass = (rarity: string) => {
    switch (rarity) {
      case 'ultimate': return '--ultimate'
      case 'legendary': return '--legendary'
      case 'epic': return '--epic'
      case 'rare': return '--rare'
      default: return '--common'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      className="m-badge c-modal --cover"
      ReactModalClassName={`--modal-content ${getRarityClass(badge.rarity)}`}
    >
      <div className={`c-badge-medallion ${getRarityClass(badge.rarity)}`}>
        <GraphicalIcon icon="concept-exercise" />
      </div>

      <h2 className="text-h2 mb-4">New Badge Earned!</h2>
      
      <div className="name text-p-xlarge font-semibold mb-2">
        {badge.name}
      </div>
      
      <div className="rarity text-p-base text-gray-600 dark:text-gray-400 mb-4 capitalize">
        {badge.rarity} Badge
      </div>
      
      <hr className="c-divider --small mb-4" />
      
      <div className="reason text-p-base mb-4">
        {badge.reason}
      </div>
      
      <div className="earned-at text-sm text-gray-500 dark:text-gray-400">
        Earned on {formatDate(badge.earnedAt)}
      </div>

      <div className="mt-6 flex justify-center">
        <button
          onClick={handleClose}
          className="btn-m btn-primary"
        >
          Awesome!
        </button>
      </div>
    </Modal>
  )
}

export default BadgeModal