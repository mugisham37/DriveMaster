import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { FrontendExercisePage } from '@/components/bootcamp/exercises'

interface FrontendExercisePageProps {
  params: { exerciseSlug: string }
}

export async function generateMetadata({ params }: FrontendExercisePageProps): Promise<Metadata> {
  return {
    title: `Frontend Exercise: ${params.exerciseSlug} - Exercism Bootcamp`,
    description: `Complete the frontend exercise: ${params.exerciseSlug}`,
  }
}

export default async function FrontendExercise({ params }: FrontendExercisePageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return notFound()
  }

  try {
    const response = await fetch(
      `${process.env.NEXTAUTH_URL}/api/bootcamp/exercises/${params.exerciseSlug}`,
      {
        headers: {
          'Cookie': `next-auth.session-token=${session.user.id}` // Simplified for demo
        }
      }
    )

    if (!response.ok) {
      return notFound()
    }

    const exerciseData = await response.json()

    return <FrontendExercisePage {...exerciseData} />
  } catch (error) {
    console.error('Error loading frontend exercise:', error)
    return notFound()
  }
}