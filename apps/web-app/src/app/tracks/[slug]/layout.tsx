import { ReactNode } from 'react'
import { getTrackData } from '@/lib/api/track'
import TrackWelcomeModal from '@/components/modals/TrackWelcomeModal'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

interface TrackLayoutProps {
  children: ReactNode
  params: { slug: string }
}

export default async function TrackLayout({ children, params }: TrackLayoutProps) {
  const session = await getServerSession(authOptions)
  const trackData = await getTrackData(params.slug)
  
  const trackInfo = trackData ? {
    slug: trackData.track.slug,
    title: trackData.track.title,
    iconUrl: trackData.track.iconUrl
  } : undefined

  return (
    <>
      {children}
      {trackInfo && session?.user && (
        <TrackWelcomeModal 
          track={trackInfo}
          userSeniority={session.user.seniority || 'beginner'}
        />
      )}
    </>
  )
}