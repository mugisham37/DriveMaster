'use client'

import React, { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useModalManager } from '@/hooks/useModalManager'
import { BegModal } from '@/components/modals/BegModal'
import { SenioritySurveyModal } from '@/components/modals/SenioritySurveyModal'
import { WelcomeModal } from '@/components/modals/WelcomeModal'
import WelcomeToInsidersModal from '@/components/modals/WelcomeToInsidersModal'
import TrackWelcomeModal from '@/components/modals/TrackWelcomeModal'
import { JSX } from 'react/jsx-runtime'

interface ModalProviderProps {
  children: React.ReactNode
  trackData?: {
    slug: string
    title: string
    iconUrl: string
  }
  numTracks?: number
}

export function ModalProvider({ 
  children, 
  trackData,
  numTracks = 67 
}: ModalProviderProps): JSX.Element {
  const { user, isAuthenticated } = useAuth()
  const modalManager = useModalManager()

  // Calculate user joined days ago
  const userJoinedDaysAgo = user?.createdAt 
    ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <>
      {children}
      
      {/* Render all modals - they will manage their own visibility */}
      {isAuthenticated && (
        <>
          <WelcomeModal numTracks={numTracks} />
          <SenioritySurveyModal />
          <BegModal previousDonor={user?.totalDonatedInDollars > 0} />
          <WelcomeToInsidersModal />
          
          {/* Track-specific modal */}
          {trackData && (
            <TrackWelcomeModal 
              track={trackData}
              userSeniority={user?.seniority}
              userJoinedDaysAgo={userJoinedDaysAgo}
            />
          )}
        </>
      )}
    </>
  )
}

export default ModalProvider