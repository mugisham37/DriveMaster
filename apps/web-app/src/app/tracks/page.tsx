import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TracksPage } from '@/components/tracks/TracksPage'
import { getTracksData } from '@/lib/api/tracks'

export const metadata: Metadata = {
  title: 'Programming Language Tracks - Exercism',
  description: 'Learn programming with our structured tracks covering 67+ programming languages',
  alternates: {
    canonical: '/tracks'
  }
}

interface TracksPageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function Tracks({ searchParams }: TracksPageProps) {
  const session = await getServerSession(authOptions)
  const tracksData = await getTracksData(searchParams)

  return (
    <TracksPage 
      {...tracksData} 
      user={session?.user || null}
      searchParams={searchParams}
    />
  )
}