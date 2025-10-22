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
  trackData,
  numTracks = 67 
}: ModalManagerProps): JSX.Element {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return <></>
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