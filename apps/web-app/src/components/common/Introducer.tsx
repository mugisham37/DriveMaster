'use client'

import React, { useState, useCallback } from 'react'
import { GraphicalIcon } from './GraphicalIcon'
import { useAuth } from '@/hooks/useAuth'

interface IntroducerProps {
  slug: string
  icon: string
  children: React.ReactNode
  className?: string
}

export function Introducer({
  slug,
  icon,
  children,
  className = ''
}: IntroducerProps): React.JSX.Element | null {
  const { user } = useAuth()
  const [isHidden, setIsHidden] = useState(false)

  const handleDismiss = useCallback(async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/settings/introducers/${slug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dismissed: true })
      })

      if (response.ok) {
        setIsHidden(true)
      }
    } catch (error) {
      console.error('Failed to dismiss introducer:', error)
    }
  }, [slug, user])

  // Check if user has already dismissed this introducer
  // This would typically come from user preferences or API
  const isDismissed = user?.preferences?.dismissedIntroducers?.includes(slug)

  if (isHidden || isDismissed) {
    return null
  }

  return (
    <div className={`introducer ${className}`} data-slug={slug}>
      <div className="introducer-icon">
        <GraphicalIcon icon={icon} />
      </div>
      
      <div className="introducer-content">
        {children}
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        className="introducer-dismiss"
        title="Dismiss this message"
      >
        <GraphicalIcon icon="cross" />
      </button>
    </div>
  )
}

export default Introducer
