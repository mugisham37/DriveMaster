import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { TrackPage } from '@/components/track/TrackPage'
import { getTrackData } from '@/lib/api/track'

interface TrackPageProps {
  params: { slug: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

export async function generateMetadata({ params }: TrackPageProps): Promise<Metadata> {
  const trackData = await getTrackData(params.slug)
  
  if (!trackData) {
    return {
      title: 'Track Not Found - Exercism'
    }
  }

  return {
    title: `${trackData.track.title} Track - Exercism`,
    description: `Learn ${trackData.track.title} with ${trackData.track.numExercises} exercises and ${trackData.track.numConcepts} concepts`,
    alternates: {
      canonical: `/tracks/${params.slug}`
    }
  }
}

export default async function Track({ params, searchParams }: TrackPageProps) {
  const user = await getCurrentUser()
  const trackData = await getTrackData(params.slug)
  
  if (!trackData) {
    notFound()
  }

  return (
    <TrackPage 
      {...trackData} 
      user={session?.user ? {
        ...session.user,
        preferences: { theme: 'system', emailNotifications: true, mentorNotifications: true },
        tracks: []
      } : null}
      searchParams={searchParams}
    />
  )
}