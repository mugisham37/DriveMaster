'use client'

import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/common/Modal'
import { GraphicalIcon } from '@/components/common'
import { useAuth } from '@/hooks/useAuth'
import { JSX } from 'react/jsx-runtime'

export function WelcomeToInsidersModal(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    // Show modal if user just became an insider
    // This would typically be triggered by a URL parameter or session flag
    const urlParams = new URLSearchParams(window.location.search)
    const showWelcome = urlParams.get('welcome') === 'true'
    
    if (showWelcome && isAuthenticated && user?.isInsider) {
      setIsOpen(true)
    }
  }, [isAuthenticated, user])

  const handleClose = () => {
    setIsOpen(false)
    // Remove the welcome parameter from URL
    const url = new URL(window.location.href)
    url.searchParams.delete('welcome')
    window.history.replaceState({}, '', url.toString())
  }

  if (!isAuthenticated || !user?.isInsider) {
    return <></>
  }

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      theme="dark"
      cover={true}
      closeButton={true}
      ReactModalClassName="max-w-[600px]"
    >
      <div className="text-center p-8">
        <GraphicalIcon 
          icon="insiders" 
          className="h-[80px] w-[80px] mx-auto mb-6" 
        />
        
        <h2 className="text-h2 mb-4 !text-white">
          Welcome to Insiders!
        </h2>
        
        <p className="text-p-large !text-white mb-6">
          Thank you for supporting Exercism! You now have access to exclusive Insider benefits.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="text-center">
            <GraphicalIcon icon="feature-discord" className="h-[40px] w-[40px] mx-auto mb-2" />
            <p className="text-p-small !text-white">Private Discord</p>
          </div>
          <div className="text-center">
            <GraphicalIcon icon="feature-early-access" className="h-[40px] w-[40px] mx-auto mb-2" />
            <p className="text-p-small !text-white">Early Access</p>
          </div>
          <div className="text-center">
            <GraphicalIcon icon="feature-no-ads" className="h-[40px] w-[40px] mx-auto mb-2" />
            <p className="text-p-small !text-white">Ad-Free</p>
          </div>
        </div>
        
        <button
          onClick={handleClose}
          className="btn-primary btn-l"
        >
          Get Started
        </button>
      </div>
    </Modal>
  )
}

export default WelcomeToInsidersModal