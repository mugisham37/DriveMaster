'use client'

import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/common/Modal'
import { GraphicalIcon } from '@/components/common'
import { useAuth } from '@/hooks/useAuth'

interface TrackWelcomModalProps {
  track: {
    slug: string
    title: string
    iconUrl: string
  }
  userSeniority?: string
  userJoinedDaysAgo: number
}

export default function TrackWelcomeModal({ 
  track, 
  userSeniority, 
  userJoinedDaysAgo 
}: TrackWelcomModalProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    // Check if user should see track welcome modal
    const checkShouldShow = async () => {
      if (!isAuthenticated || !user || !track) return

      try {
        // Check if introducer is dismissed
        const introducerSlug = `track-welcome-modal-${track.slug}`
        const isDismissed = user.preferences?.dismissedIntroducers?.includes(introducerSlug)
        
        if (isDismissed) return

        // Check if tutorial exercise is completed (Hello World)
        const response = await fetch(`/api/tracks/${track.slug}/exercises/hello-world`)
        if (response.ok) {
          const exerciseData = await response.json()
          if (exerciseData.isCompleted) return
        }

        setIsOpen(true)
      } catch (error) {
        console.error('Error checking track welcome modal conditions:', error)
      }
    }

    checkShouldShow()
  }, [isAuthenticated, user, track])

  const handleDismiss = async () => {
    const introducerSlug = `track-welcome-modal-${track.slug}`
    
    try {
      await fetch(`/api/settings/introducers/${introducerSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissed: true })
      })
      setIsOpen(false)
    } catch (error) {
      console.error('Error dismissing track welcome modal:', error)
      setIsOpen(false)
    }
  }

  const handleModeSelection = async (mode: 'practice' | 'learning') => {
    setIsLoading(true)
    
    try {
      const endpoint = mode === 'practice' 
        ? `/api/tracks/${track.slug}/activate-practice-mode`
        : `/api/tracks/${track.slug}/activate-learning-mode`
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        // Redirect to Hello World exercise
        window.location.href = `/tracks/${track.slug}/exercises/hello-world`
      }
    } catch (error) {
      console.error(`Error activating ${mode} mode:`, error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated || !user || !track) {
    return <></>
  }

  return (
    <Modal
      open={isOpen}
      onClose={handleDismiss}
      theme="light"
      cover={true}
      closeButton={true}
      ReactModalClassName="max-w-[800px]"
    >
      <div className="track-welcome-modal p-8">
        <div className="text-center mb-6">
          <img 
            src={track.iconUrl} 
            alt={track.title}
            className="h-[80px] w-[80px] mx-auto mb-4"
          />
          <h2 className="text-h2 mb-2">
            Welcome to {track.title}!
          </h2>
          <p className="text-p-large text-textColor6">
            Let's get you started on your {track.title} journey
          </p>
        </div>

        {/* Mode Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="mode-option border border-borderColor6 rounded-8 p-6 hover:border-borderColor4 transition-colors">
            <div className="flex items-center mb-4">
              <GraphicalIcon icon="concepts" className="h-[40px] w-[40px] mr-3" />
              <h3 className="text-h4">Learning Mode</h3>
            </div>
            <p className="text-p-base text-textColor6 mb-4">
              Learn {track.title} step by step with our structured curriculum, concepts, and exercises.
            </p>
            <button
              onClick={() => handleModeSelection('learning')}
              disabled={isLoading}
              className="btn-primary btn-m w-full"
            >
              {isLoading ? 'Starting...' : 'Start Learning'}
            </button>
          </div>

          <div className="mode-option border border-borderColor6 rounded-8 p-6 hover:border-borderColor4 transition-colors">
            <div className="flex items-center mb-4">
              <GraphicalIcon icon="exercises" className="h-[40px] w-[40px] mr-3" />
              <h3 className="text-h4">Practice Mode</h3>
            </div>
            <p className="text-p-base text-textColor6 mb-4">
              Jump straight into solving exercises. Perfect if you already know {track.title}.
            </p>
            <button
              onClick={() => handleModeSelection('practice')}
              disabled={isLoading}
              className="btn-secondary btn-m w-full"
            >
              {isLoading ? 'Starting...' : 'Start Practicing'}
            </button>
          </div>
        </div>

        {/* Additional Resources */}
        <div className="border-t border-borderColor6 pt-6">
          <h4 className="text-h5 mb-4">Helpful Resources</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a 
              href={`/tracks/${track.slug}/installation`}
              className="resource-link flex items-center p-3 border border-borderColor6 rounded-6 hover:border-borderColor4 transition-colors"
            >
              <GraphicalIcon icon="cli" className="h-[24px] w-[24px] mr-2" />
              <span className="text-p-small">Setup Guide</span>
            </a>
            
            <a 
              href="/cli-walkthrough"
              className="resource-link flex items-center p-3 border border-borderColor6 rounded-6 hover:border-borderColor4 transition-colors"
            >
              <GraphicalIcon icon="terminal" className="h-[24px] w-[24px] mr-2" />
              <span className="text-p-small">CLI Walkthrough</span>
            </a>
            
            <a 
              href={`/tracks/${track.slug}/learning`}
              className="resource-link flex items-center p-3 border border-borderColor6 rounded-6 hover:border-borderColor4 transition-colors"
            >
              <GraphicalIcon icon="docs" className="h-[24px] w-[24px] mr-2" />
              <span className="text-p-small">Learning Resources</span>
            </a>
          </div>
        </div>

        {/* Beginner Recommendation */}
        {userSeniority === 'beginner' && (
          <div className="mt-6 p-4 bg-backgroundColorA border border-borderColor6 rounded-6">
            <div className="flex items-start">
              <GraphicalIcon icon="lightbulb" className="h-[24px] w-[24px] mr-3 mt-1" />
              <div>
                <h5 className="text-h6 mb-2">New to programming?</h5>
                <p className="text-p-small text-textColor6 mb-3">
                  We recommend starting with our Coding Fundamentals course to build a solid foundation.
                </p>
                <a 
                  href="/courses/coding-fundamentals"
                  className="btn-cta btn-xs"
                >
                  Try Coding Fundamentals
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mt-6">
          <button
            onClick={handleDismiss}
            className="text-textColor6 hover:text-textColor2 text-p-small"
          >
            I'll decide later
          </button>
        </div>
      </div>
    </Modal>
  )
}