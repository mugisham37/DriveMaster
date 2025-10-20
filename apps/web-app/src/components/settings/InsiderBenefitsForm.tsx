'use client'

import React, { useState } from 'react'


interface UserPreferences {
  hideAdverts: boolean
  theme: 'light' | 'dark' | 'system'
  emailNotifications: boolean
  mentorNotifications: boolean
}

interface InsiderBenefitsFormProps {
  defaultPreferences: UserPreferences
  insidersStatus: string
  links: {
    insidersPath: string
  }
}

export default function InsiderBenefitsForm({
  defaultPreferences,
  insidersStatus,
  links,
}: InsiderBenefitsFormProps): React.JSX.Element {
  const [hideAdverts, setHideAdverts] = useState(defaultPreferences.hideAdverts)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const submit = async (data: any) => {
    setIsSubmitting(true)
    setIsSuccess(false)
    
    try {
      const response = await fetch('/api/settings/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (response.ok) {
        setIsSuccess(true)
        console.log('Preferences updated successfully')
      }
    } catch (error) {
      console.error('Error updating preferences:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isInsider = insidersStatus === 'active' || insidersStatus === 'active_lifetime'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await submit({ hideAdverts })
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="!mb-8">Insider Benefits</h2>
      <InfoMessage
        isInsider={isInsider}
        insidersStatus={insidersStatus}
        insidersPath={links.insidersPath}
      />
      
      <div className="form-group">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            disabled={!isInsider}
            checked={hideAdverts}
            onChange={(e) => setHideAdverts(e.target.checked)}
          />
          Hide advertisements
        </label>
      </div>

      <div className="form-footer">
        <button
          type="submit"
          disabled={!isInsider || isSubmitting}
          className="btn-primary btn-m"
        >
          {isSubmitting ? 'Saving...' : 'Save preferences'}
        </button>
        {isSuccess && (
          <span className="text-green-600 ml-2">Saved!</span>
        )}
      </div>
    </form>
  )
}

interface InfoMessageProps {
  insidersStatus: string
  insidersPath: string
  isInsider: boolean
}

export function InfoMessage({
  insidersStatus,
  insidersPath,
  isInsider,
}: InfoMessageProps): React.JSX.Element {
  if (isInsider) {
    return (
      <p className="text-p-base mb-16">
        You have access to all Insider benefits. Thank you for supporting Exercism!
      </p>
    )
  }

  switch (insidersStatus) {
    case 'eligible':
    case 'eligible_lifetime':
      return (
        <p className="text-p-base mb-16">
          You're eligible for Insiders! 
          <a href={insidersPath} className="text-linkColor ml-1">
            Activate your benefits
          </a>
        </p>
      )
    
    default:
      return (
        <p className="text-p-base mb-16">
          <a href={insidersPath} className="text-linkColor">
            Become an Insider
          </a> to access exclusive benefits and support Exercism.
        </p>
      )
  }
}