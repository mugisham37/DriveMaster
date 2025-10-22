'use client'

import React, { useState, useEffect } from 'react'
import { Modal } from '@/components/common'
import { GraphicalIcon } from '@/components/common'
import { useAuth } from '@/hooks/useAuth'
import { useModalManager } from '@/hooks/useModalManager'
import { JSX } from 'react/jsx-runtime'

type SeniorityLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

export function SenioritySurveyModal(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedSeniority, setSelectedSeniority] = useState<SeniorityLevel | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { user, isAuthenticated } = useAuth()
  const { registerModal, canShowModal } = useModalManager()

  useEffect(() => {
    // Register this modal with the modal manager
    registerModal({
      id: 'seniority-survey-modal',
      priority: 3, // Higher priority than beg modal
      component: SenioritySurveyModal
    })
  }, [registerModal])

  useEffect(() => {
    const checkShouldShow = () => {
      if (!isAuthenticated || !user) return
      if (!canShowModal('seniority-survey-modal')) return

      // Show if user doesn't have seniority set (matching Ruby logic)
      if (!user.seniority) {
        // Set session flag
        sessionStorage.setItem('shown_seniority_modal_at', new Date().toISOString())
        setIsOpen(true)
      }
    }

    checkShouldShow()
  }, [isAuthenticated, user, canShowModal])

  const handleSenioritySelect = (seniority: SeniorityLevel) => {
    setSelectedSeniority(seniority)
  }

  const handleSubmit = async () => {
    if (!selectedSeniority || !user) return

    setIsLoading(true)
    
    try {
      // Update user seniority
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seniority: selectedSeniority })
      })

      if (response.ok) {
        // Dismiss the modal
        await handleDismiss()
      }
    } catch (error) {
      console.error('Error updating user seniority:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDismiss = async () => {
    const introducerSlug = 'seniority-survey-modal'
    
    try {
      await fetch(`/api/settings/introducers/${introducerSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissed: true })
      })
      setIsOpen(false)
    } catch (error) {
      console.error('Error dismissing seniority modal:', error)
      setIsOpen(false)
    }
  }

  const seniorityOptions = [
    {
      level: 'beginner' as SeniorityLevel,
      title: 'Beginner',
      description: 'New to programming or this language',
      icon: 'seedling'
    },
    {
      level: 'intermediate' as SeniorityLevel,
      title: 'Intermediate',
      description: 'Some experience with programming',
      icon: 'growing'
    },
    {
      level: 'advanced' as SeniorityLevel,
      title: 'Advanced',
      description: 'Experienced programmer',
      icon: 'tree'
    },
    {
      level: 'expert' as SeniorityLevel,
      title: 'Expert',
      description: 'Professional developer or expert',
      icon: 'expert'
    }
  ]

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
      <div className="seniority-survey-modal p-8">
        <div className="text-center mb-8">
          <GraphicalIcon 
            icon="survey" 
            className="h-[60px] w-[60px] mx-auto mb-4" 
          />
          
          <h2 className="text-h2 mb-4">
            Help us understand your experience
          </h2>
          
          <p className="text-p-large text-textColor6">
            This helps us provide better recommendations and tailor your learning experience.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {seniorityOptions.map((option) => (
            <button
              key={option.level}
              onClick={() => handleSenioritySelect(option.level)}
              className={`seniority-option p-6 border rounded-8 text-left transition-all ${
                selectedSeniority === option.level
                  ? 'border-borderColor2 bg-backgroundColorA'
                  : 'border-borderColor6 hover:border-borderColor4'
              }`}
            >
              <div className="flex items-start">
                <GraphicalIcon 
                  icon={option.icon} 
                  className="h-[32px] w-[32px] mr-4 mt-1" 
                />
                <div>
                  <h3 className="text-h5 mb-2">{option.title}</h3>
                  <p className="text-p-small text-textColor6">
                    {option.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Beginner Recommendation */}
        {selectedSeniority === 'beginner' && (
          <div className="mb-6 p-4 bg-backgroundColorA border border-borderColor6 rounded-6">
            <div className="flex items-start">
              <GraphicalIcon icon="lightbulb" className="h-[24px] w-[24px] mr-3 mt-1" />
              <div>
                <h4 className="text-h6 mb-2">New to programming?</h4>
                <p className="text-p-small text-textColor6 mb-3">
                  We recommend starting with our Coding Fundamentals course to build a solid foundation.
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
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleSubmit}
            disabled={!selectedSeniority || isLoading}
            className="btn-primary btn-l"
          >
            {isLoading ? 'Saving...' : 'Continue'}
          </button>
          
          <button
            onClick={handleDismiss}
            className="btn-secondary btn-l"
          >
            Skip for now
          </button>
        </div>
      </div>
    </Modal>
  )
}