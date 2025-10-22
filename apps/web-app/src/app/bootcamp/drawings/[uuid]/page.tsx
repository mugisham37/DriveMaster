import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AdvancedDrawingPage } from '@/components/bootcamp/exercises'

interface DrawingPageProps {
  params: { uuid: string }
}

export async function generateMetadata({ params }: DrawingPageProps): Promise<Metadata> {
  return {
    title: `Drawing: ${params.uuid} - Exercism Bootcamp`,
    description: `Edit your drawing project`,
  }
}

export default async function Drawing({ params }: DrawingPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return notFound()
  }

  try {
    const response = await fetch(
      `${process.env.NEXTAUTH_URL}/api/bootcamp/drawings/${params.uuid}`,
      {
        headers: {
          'Cookie': `next-auth.session-token=${session.user.id}` // Simplified for demo
        }
      }
    )

    if (!response.ok) {
      return notFound()
    }

    const drawingData = await response.json()

    return <AdvancedDrawingPage {...drawingData} />
  } catch (error) {
    console.error('Error loading drawing:', error)
    return notFound()
  }
}