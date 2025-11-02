'use client'

import React from 'react'
import { useAuth } from '@/hooks/useAuth'
import { BegModal } from './BegModal'

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
      <BegModal previousDonor={user?.totalDonatedInDollars ? user.totalDonatedInDollars > 0 : false} />
    </>
  )
}

export default ModalManager