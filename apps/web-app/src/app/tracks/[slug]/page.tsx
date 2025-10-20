import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
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
  const session = await getServerSession(authOptions)
  const trackData = await getTrackData(params.slug)
  
  if (!trackData) {
    notFound()
  }

  return (
    <TrackPage 
      {...trackData} 
      user={session?.user || null}
      searchParams={searchParams}
    />
  )
}