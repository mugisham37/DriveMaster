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

  // Calculate user joined days ago
  const userJoinedDaysAgo = session?.user?.createdAt 
    ? Math.floor((Date.now() - new Date(session.user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <>
      {children}
      {trackInfo && session?.user && (
        <TrackWelcomeModal 
          track={trackInfo}
          userSeniority={(session.user as any)?.seniority}
          userJoinedDaysAgo={userJoinedDaysAgo}
        />
      )}
    </>
  )
}