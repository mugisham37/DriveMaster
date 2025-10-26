import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ExercisePage } from '@/components/exercise/ExercisePage'
import { getExerciseData } from '@/lib/api/exercise'

interface ExercisePageProps {
  params: { 
    slug: string
    exerciseSlug: string 
  }
}

export async function generateMetadata({ params }: ExercisePageProps): Promise<Metadata> {
  const exerciseData = await getExerciseData(params.slug, params.exerciseSlug)
  
  if (!exerciseData) {
    return {
      title: 'Exercise Not Found - Exercism'
    }
  }

  return {
    title: `${exerciseData.exercise.title} in ${exerciseData.track.title} - Exercism`,
    description: exerciseData.exercise.blurb,
    alternates: {
      canonical: `/tracks/${params.slug}/exercises/${params.exerciseSlug}`
    }
  }
}

export default async function Exercise({ params }: ExercisePageProps) {
  const session = await getServerSession(authOptions)
  const exerciseData = await getExerciseData(params.slug, params.exerciseSlug)
  
  if (!exerciseData) {
    notFound()
  }

  return (
    <ExercisePage 
      {...exerciseData} 
      user={session?.user ? {
        ...session.user,
        preferences: { theme: 'system', emailNotifications: true, mentorNotifications: true },
        tracks: []
      } : null}
    />
  )
}