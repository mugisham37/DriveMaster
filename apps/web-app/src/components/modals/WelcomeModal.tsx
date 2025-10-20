'use client'

import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/common/Modal'
import { GraphicalIcon } from '@/components/common'
import { useAuth } from '@/hooks/useAuth'
import { useModalManager } from '@/hooks/useModalManager'
import { JSX } from 'react/jsx-runtime'

interface WelcomeModalProps {
  numTracks?: number
}

export function WelcomeModal({ numTracks = 67 }: WelcomeModalProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { user, isAuthenticated } = useAuth()
  const { registerModal, canShowModal } = useModalManager()

  useEffect(() => {
    // Register this modal with the modal manager
    registerModal({
      id: 'welcome-modal',
      priority: 4, // Highest priority - should show first
      component: WelcomeModal
    })
  }, [registerModal])

  useEffect(() => {
    const checkShouldShow = async () => {
      if (!isAuthenticated || !user) return
      if (!canShowModal('welcome-modal')) return

      try {
        // Check if introducer is dismissed
        const introducerSlug = 'welcome-modal'
        const isDismissed = user.preferences?.dismissedIntroducers?.includes(introducerSlug)
        
        if (isDismissed) return

        // Check solution count (auto-dismiss if >= 2 solutions)
        const response = await fetch('/api/journey/solutions')
        if (response.ok) {
          const data = await response.json()
          if (data.solutions.length >= 2) {
            // Auto-dismiss the modal
            await fetch(`/api/settings/introducers/${introducerSlug}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ dismissed: true })
            })
            return
          }
        }

        setIsOpen(true)
      } catch (error) {
        console.error('Error checking welcome modal conditions:', error)
      }
    }

    checkShouldShow()
  }, [isAuthenticated, user, canShowModal])

  const handleDismiss = async () => {
    const introducerSlug = 'welcome-modal'
    
    try {
      await fetch(`/api/settings/introducers/${introducerSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissed: true })
      })
      setIsOpen(false)
    } catch (error) {
      console.error('Error dismissing welcome modal:', error)
      setIsOpen(false)
    }
  }

  const handleGetStarted = async () => {
    setIsLoading(true)
    
    try {
      // Redirect to tracks page
      window.location.href = '/tracks'
    } catch (error) {
      console.error('Error navigating to tracks:', error)
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
      ReactModalClassName="max-w-[700px]"
    >
      <div className="welcome-modal p-8 text-center">
        <GraphicalIcon 
          icon="exercism-face" 
          className="h-[80px] w-[80px] mx-auto mb-6" 
        />
        
        <h2 className="text-h2 mb-4">
          Welcome to Exercism!
        </h2>
        
        <p className="text-p-large text-textColor6 mb-8">
          Start your coding journey with our structured learning paths. 
          Choose from {numTracks} programming languages and get mentored by experienced developers.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="feature text-center">
            <GraphicalIcon icon="exercises" className="h-[48px] w-[48px] mx-auto mb-3" />
            <h3 className="text-h5 mb-2">Practice Exercises</h3>
            <p className="text-p-small text-textColor6">
              Solve real coding challenges designed by experts
            </p>
          </div>
          
          <div className="feature text-center">
            <GraphicalIcon icon="mentoring" className="h-[48px] w-[48px] mx-auto mb-3" />
            <h3 className="text-h5 mb-2">Human Mentoring</h3>
            <p className="text-p-small text-textColor6">
              Get personalized feedback from experienced developers
            </p>
          </div>
          
          <div className="feature text-center">
            <GraphicalIcon icon="concepts" className="h-[48px] w-[48px] mx-auto mb-3" />
            <h3 className="text-h5 mb-2">Learn Concepts</h3>
            <p className="text-p-small text-textColor6">
              Master programming concepts step by step
            </p>
          </div>
        </div>

        {/* Beginner Recommendation */}
        <div className="mb-8 p-4 bg-backgroundColorA border border-borderColor6 rounded-6">
          <div className="flex items-start justify-center">
            <GraphicalIcon icon="lightbulb" className="h-[24px] w-[24px] mr-3 mt-1" />
            <div className="text-left">
              <h4 className="text-h6 mb-2">New to programming?</h4>
              <p className="text-p-small text-textColor6 mb-3">
                Start with our Coding Fundamentals course to build a solid foundation before diving into specific languages.
              </p>
              <a 
                href="/courses/coding-fundamentals"
                className="btn-cta btn-xs"
                target="_blank"
                rel="noopener noreferrer"
              >
                Try Coding Fundamentals
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleGetStarted}
            disabled={isLoading}
            className="btn-primary btn-l"
          >
            {isLoading ? 'Loading...' : 'Explore Tracks'}
          </button>
          
          <button
            onClick={handleDismiss}
            className="btn-secondary btn-l"
          >
            I'll explore later
          </button>
        </div>

        <p className="text-p-xs text-textColor6 mt-6">
          Exercism is 100% free. No ads, no premium features, just great learning.
        </p>
      </div>
    </Modal>
  )
}