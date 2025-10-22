import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AdvancedCSSExercisePage } from '@/components/bootcamp/exercises'

interface CSSExercisePageProps {
  params: { exerciseSlug: string }
}

export async function generateMetadata({ params }: CSSExercisePageProps): Promise<Metadata> {
  return {
    title: `CSS Exercise: ${params.exerciseSlug} - Exercism Bootcamp`,
    description: `Complete the CSS exercise: ${params.exerciseSlug}`,
  }
}

export default async function CSSExercise({ params }: CSSExercisePageProps) {
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

    return <AdvancedCSSExercisePage {...exerciseData} />
  } catch (error) {
    console.error('Error loading CSS exercise:', error)
    return notFound()
  }
}