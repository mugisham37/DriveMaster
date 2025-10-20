import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect, notFound } from 'next/navigation'
import { ConceptMap } from '@/components/student'

interface ConceptsPageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: ConceptsPageProps): Promise<Metadata> {
  return {
    title: `${params.slug} Concepts - Exercism`,
    description: `Explore the concept map for the ${params.slug} track on Exercism`,
  }
}

export default async function ConceptsPage({ params }: ConceptsPageProps) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/signin')
  }

  try {
    // Fetch concept map data
    const response = await fetch(
      `${process.env.NEXTAUTH_URL}/api/tracks/${params.slug}/concepts`,
      {
        headers: {
          Cookie: `next-auth.session-token=${session.user.id}`, // Simplified for demo
        },
      }
    )

    if (!response.ok) {
      return notFound()
    }

    const data = await response.json()
    const conceptMapData = data.graph

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {params.slug.charAt(0).toUpperCase() + params.slug.slice(1)} Concepts
            </h1>
            <p className="text-gray-600">
              Explore the learning path and concept relationships
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <ConceptMap {...conceptMapData} />
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading concept map:', error)
    return notFound()
  }
}