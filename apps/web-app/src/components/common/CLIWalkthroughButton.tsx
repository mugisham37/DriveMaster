'use client'

import React, { useState } from 'react'
import { GraphicalIcon } from './GraphicalIcon'
import { Modal } from './Modal'
import { CLIWalkthrough } from './CLIWalkthrough'
import { useAuth } from '@/hooks/useAuth'

interface CLIWalkthroughButtonProps {
  user?: any
  className?: string
  buttonText?: string
}

export function CLIWalkthroughButton({
  user,
  className = '',
  buttonText = 'CLI Setup Guide'
}: CLIWalkthroughButtonProps): React.JSX.Element {
  const { user: currentUser } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const userToUse = user || currentUser

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={`cli-walkthrough-button ${className}`}
        title="Learn how to set up the Exercism CLI"
      >
        <GraphicalIcon icon="terminal" />
        <span>{buttonText}</span>
      </button>

      {isModalOpen && (
        <Modal onClose={() => setIsModalOpen(false)}>
          <CLIWalkthrough user={userToUse} />
        </Modal>
      )}
    </>
  )
}

export default CLIWalkthroughButton
