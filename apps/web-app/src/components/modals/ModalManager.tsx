'use client'

import React from 'react'
import { useAuth } from '@/hooks/useAuth'
import { BegModal } from './BegModal'
import { SenioritySurveyModal } from './SenioritySurveyModal'
import { WelcomeModal } from './WelcomeModal'
import WelcomeToInsidersModal from './WelcomeToInsidersModal'

interface ModalManagerProps {
  trackData?: {
    slug: string
    title: string
    iconUrl: string
  }
  numTracks?: number
}

export function ModalManager({ 
  numTracks = 67 
}: Omit<ModalManagerProps, 'trackData'>): React.JSX.Element {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return <></> as React.JSX.Element
  }

  return (
    <>
      <WelcomeModal numTracks={numTracks} />
      <SenioritySurveyModal />
      <BegModal previousDonor={user?.totalDonatedInDollars ? user.totalDonatedInDollars > 0 : false} />
      <WelcomeToInsidersModal />
    </>
  )
}

export default ModalManager