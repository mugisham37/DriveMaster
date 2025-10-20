import { Metadata } from 'next'
import { CohortPage } from '@/components/cohorts/CohortPage'

interface Props {
  params: { slug: string }
}

// Mock data - in real implementation, this would come from API
const getCohortBySlug = (slug: string) => {
  const cohorts = {
    'gohort-2024': {
      slug: 'gohort-2024',
      name: 'Gohort 2024',
      beginsAt: new Date('2024-03-01'),
      type: 'gohort' as const,
      track: {
        slug: 'go',
        title: 'Go',
        iconUrl: '/assets/tracks/go.svg',
        numConcepts: 25,
        numExercises: 120
      }
    },
    'exhort-elixir-2024': {
      slug: 'exhort-elixir-2024', 
      name: 'Exhort Elixir 2024',
      beginsAt: new Date('2024-04-01'),
      type: 'exhort' as const,
      track: {
        slug: 'elixir',
        title: 'Elixir',
        iconUrl: '/assets/tracks/elixir.svg',
        numConcepts: 30,
        numExercises: 95
      }
    }
  }
  
  return cohorts[slug as keyof typeof cohorts] || null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cohort = getCohortBySlug(params.slug)
  
  if (!cohort) {
    return {
      title: 'Cohort Not Found - Exercism',
      description: 'The requested cohort could not be found.'
    }
  }

  return {
    title: `${cohort.name} - Exercism`,
    description: `Join ${cohort.name} and learn ${cohort.track.title} with a supportive community.`
  }
}

export default function CohortPageRoute({ params }: Props) {
  const cohort = getCohortBySlug(params.slug)
  
  if (!cohort) {
    return (
      <div className="lg-container py-40">
        <h1 className="text-h1 mb-8">Cohort Not Found</h1>
        <p className="text-p-large mb-8">The requested cohort could not be found.</p>
      </div>
    )
  }

  // Mock membership data - in real implementation, this would come from API
  const membership = null // User not enrolled
  
  return (
    <CohortPage 
      cohort={cohort}
      membership={membership}
    />
  )
}