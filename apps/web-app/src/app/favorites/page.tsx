import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { FavoritesList } from '@/components/student'

export const metadata: Metadata = {
  title: 'My Favorites - Exercism',
  description: 'View your favorite community solutions on Exercism',
}

export default async function FavoritesPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Mock data for tracks - in real implementation, this would come from the API
  const tracks = [
    {
      slug: 'javascript',
      title: 'JavaScript',
      iconUrl: '/tracks/javascript.svg',
      numSolutions: 25
    },
    {
      slug: 'python',
      title: 'Python',
      iconUrl: '/tracks/python.svg',
      numSolutions: 18
    },
    {
      slug: 'ruby',
      title: 'Ruby',
      iconUrl: '/tracks/ruby.svg',
      numSolutions: 12
    }
  ]

  const request = {
    endpoint: '/api/favorites',
    query: {
      criteria: '',
      trackSlug: '',
      page: 1
    },
    options: {
      initialData: {
        results: [],
        meta: {
          currentPage: 1,
          totalCount: 0,
          totalPages: 0,
          unscopedTotal: 0
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            My Favorites
          </h1>
          <p className="text-gray-600">
            Solutions you've starred from the community
          </p>
        </div>

        <FavoritesList
          tracks={tracks}
          request={request}
          isUserInsider={session.user.isInsider || false}
        />
      </div>
    </div>
  )
}