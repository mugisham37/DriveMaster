import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'

export const metadata: Metadata = {
  title: 'Learning Cohorts - Exercism',
  description: 'Join our community learning cohorts and learn programming languages together with fellow developers.',
}

// Mock data - in real implementation, this would come from API
const cohorts = [
  {
    slug: 'gohort-2024',
    name: 'Gohort 2024',
    description: 'Learn Go programming with a supportive community of developers.',
    track: {
      slug: 'go',
      title: 'Go',
      iconUrl: '/assets/tracks/go.svg'
    },
    beginsAt: new Date('2024-03-01'),
    status: 'open' as const,
    participantCount: 245,
    maxParticipants: 500
  },
  {
    slug: 'exhort-elixir-2024',
    name: 'Exhort Elixir 2024',
    description: 'Discover the power of functional programming with Elixir.',
    track: {
      slug: 'elixir',
      title: 'Elixir',
      iconUrl: '/assets/tracks/elixir.svg'
    },
    beginsAt: new Date('2024-04-01'),
    status: 'open' as const,
    participantCount: 156,
    maxParticipants: 300
  },
  {
    slug: 'rust-cohort-2024',
    name: 'Rust Learning Cohort 2024',
    description: 'Master systems programming with Rust in a collaborative environment.',
    track: {
      slug: 'rust',
      title: 'Rust',
      iconUrl: '/assets/tracks/rust.svg'
    },
    beginsAt: new Date('2024-02-15'),
    status: 'closed' as const,
    participantCount: 400,
    maxParticipants: 400
  }
]

export default function CohortsPage() {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">Open</span>
      case 'closed':
        return <span className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">Closed</span>
      case 'starting-soon':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">Starting Soon</span>
      default:
        return null
    }
  }

  return (
    <div className="cohorts-page">
      <header className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-20">
        <div className="lg-container">
          <div className="text-center">
            <GraphicalIcon icon="community" className="h-16 w-16 mx-auto mb-6" />
            <h1 className="text-h0 mb-6">Learning Cohorts</h1>
            <p className="text-p-2xlarge mb-8 max-w-3xl mx-auto">
              Join our community learning cohorts and learn programming languages together 
              with fellow developers from around the world.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="#cohorts" className="btn-primary btn-l">
                Browse Cohorts
              </Link>
              <Link href="/community" className="btn-secondary btn-l">
                Join Community
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="py-20">
        <div className="lg-container">
          <div className="text-center mb-16">
            <h2 className="text-h1 mb-6">What are Learning Cohorts?</h2>
            <p className="text-p-xlarge max-w-4xl mx-auto text-gray-600">
              Learning cohorts are community-driven learning experiences where you work through 
              programming exercises alongside other learners. They're designed to be flexible, 
              supportive, and fun - perfect for staying motivated and making connections.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="text-center">
              <GraphicalIcon icon="community" className="h-12 w-12 mx-auto mb-4 text-blue-600" />
              <h3 className="text-h3 mb-4">Community Support</h3>
              <p className="text-gray-600">
                Learn alongside fellow developers and get support when you need it.
              </p>
            </div>
            <div className="text-center">
              <GraphicalIcon icon="calendar" className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <h3 className="text-h3 mb-4">Flexible Schedule</h3>
              <p className="text-gray-600">
                Learn at your own pace while staying connected with your cohort.
              </p>
            </div>
            <div className="text-center">
              <GraphicalIcon icon="mentoring" className="h-12 w-12 mx-auto mb-4 text-purple-600" />
              <h3 className="text-h3 mb-4">Expert Guidance</h3>
              <p className="text-gray-600">
                Get mentoring and feedback from experienced developers.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="cohorts" className="py-20 bg-gray-50">
        <div className="lg-container">
          <h2 className="text-h1 text-center mb-16">Available Cohorts</h2>
          
          <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {cohorts.map((cohort) => (
              <div key={cohort.slug} className="cohort-card bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="p-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Image
                        src={cohort.track.iconUrl}
                        alt={cohort.track.title}
                        width={48}
                        height={48}
                        className="mr-4"
                      />
                      <div>
                        <h3 className="text-h2">{cohort.name}</h3>
                        <p className="text-gray-600">{cohort.track.title} Programming</p>
                      </div>
                    </div>
                    {getStatusBadge(cohort.status)}
                  </div>
                  
                  <p className="text-p-large text-gray-700 mb-6">{cohort.description}</p>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-gray-600">
                      <GraphicalIcon icon="calendar" className="w-5 h-5 mr-3" />
                      <span>Begins {formatDate(cohort.beginsAt)}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <GraphicalIcon icon="users" className="w-5 h-5 mr-3" />
                      <span>{cohort.participantCount} / {cohort.maxParticipants} participants</span>
                    </div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(cohort.participantCount / cohort.maxParticipants) * 100}%` }}
                    />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-green-600">Free</span>
                    
                    {cohort.status === 'open' ? (
                      <Link 
                        href={`/cohorts/${cohort.slug}`}
                        className="btn-primary btn-m"
                      >
                        Join Cohort
                      </Link>
                    ) : (
                      <button 
                        disabled
                        className="btn-secondary btn-m opacity-50 cursor-not-allowed"
                      >
                        Registration Closed
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="lg-container text-center">
          <h2 className="text-h1 mb-8">Ready to start learning?</h2>
          <p className="text-p-xlarge mb-8 max-w-2xl mx-auto">
            Join thousands of developers who are improving their programming skills 
            through our community-driven learning approach.
          </p>
          <Link href="/auth/signup" className="btn-enhanced btn-l">
            Create Free Account
            <GraphicalIcon icon="arrow-right" />
          </Link>
        </div>
      </section>
    </div>
  )
}