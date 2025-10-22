import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AdvancedJikiscriptExercisePage } from '@/components/bootcamp/exercises'

interface JikiscriptExercisePageProps {
  params: { exerciseSlug: string }
}

export async function generateMetadata({ params }: JikiscriptExercisePageProps): Promise<Metadata> {
  return {
    title: `Jikiscript Exercise: ${params.exerciseSlug} - Exercism Bootcamp`,
    description: `Complete the Jikiscript exercise: ${params.exerciseSlug}`,
  }
}

export default async function JikiscriptExercise({ params }: JikiscriptExercisePageProps) {
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

    // Mock custom functions data
    const customFunctions = [
      {
        uuid: 'func-1',
        name: 'myHelper',
        active: true,
        description: 'A helper function',
        predefined: false,
        code: 'function myHelper() { return "Hello"; }',
        tests: []
      }
    ]

    return <AdvancedJikiscriptExercisePage {...exerciseData} customFunctions={customFunctions} />
  } catch (error) {
    console.error('Error loading Jikiscript exercise:', error)
    return notFound()
  }
}