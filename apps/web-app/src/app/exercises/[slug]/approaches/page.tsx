import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface ApproachesPageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: ApproachesPageProps): Promise<Metadata> {
  const exercise = await getExerciseData(params.slug)
  
  if (!exercise) {
    return {
      title: 'Exercise Not Found - Exercism'
    }
  }

  return {
    title: `${exercise.title} Approaches - Exercism`,
    description: `Explore different approaches to solving the ${exercise.title} exercise across programming languages.`,
  }
}

async function getExerciseData(slug: string) {
  // Mock data - in real implementation, this would fetch from database
  const exercises = {
    'hello-world': {
      slug: 'hello-world',
      title: 'Hello World'
    },
    'two-fer': {
      slug: 'two-fer',
      title: 'Two Fer'
    }
  }

  return exercises[slug as keyof typeof exercises] || null
}

async function getApproaches(slug: string) {
  // Mock data - in real implementation, this would fetch from database
  const approaches = {
    'hello-world': [
      {
        slug: 'simple-return',
        trackApproaches: [
          {
            track: { slug: 'javascript', title: 'JavaScript', iconUrl: '/tracks/javascript.svg' },
            exercise: { slug: 'hello-world', title: 'Hello World' },
            approach: { slug: 'simple-return', title: 'Simple Return' }
          },
          {
            track: { slug: 'python', title: 'Python', iconUrl: '/tracks/python.svg' },
            exercise: { slug: 'hello-world', title: 'Hello World' },
            approach: { slug: 'simple-return', title: 'Simple Return' }
          },
          {
            track: { slug: 'ruby', title: 'Ruby', iconUrl: '/tracks/ruby.svg' },
            exercise: { slug: 'hello-world', title: 'Hello World' },
            approach: { slug: 'simple-return', title: 'Simple Return' }
          }
        ]
      },
      {
        slug: 'function-based',
        trackApproaches: [
          {
            track: { slug: 'javascript', title: 'JavaScript', iconUrl: '/tracks/javascript.svg' },
            exercise: { slug: 'hello-world', title: 'Hello World' },
            approach: { slug: 'function-based', title: 'Function Based' }
          },
          {
            track: { slug: 'java', title: 'Java', iconUrl: '/tracks/java.svg' },
            exercise: { slug: 'hello-world', title: 'Hello World' },
            approach: { slug: 'function-based', title: 'Function Based' }
          }
        ]
      }
    ],
    'two-fer': [
      {
        slug: 'conditional',
        trackApproaches: [
          {
            track: { slug: 'javascript', title: 'JavaScript', iconUrl: '/tracks/javascript.svg' },
            exercise: { slug: 'two-fer', title: 'Two Fer' },
            approach: { slug: 'conditional', title: 'Conditional' }
          },
          {
            track: { slug: 'python', title: 'Python', iconUrl: '/tracks/python.svg' },
            exercise: { slug: 'two-fer', title: 'Two Fer' },
            approach: { slug: 'conditional', title: 'Conditional' }
          }
        ]
      },
      {
        slug: 'default-parameter',
        trackApproaches: [
          {
            track: { slug: 'javascript', title: 'JavaScript', iconUrl: '/tracks/javascript.svg' },
            exercise: { slug: 'two-fer', title: 'Two Fer' },
            approach: { slug: 'default-parameter', title: 'Default Parameter' }
          }
        ]
      }
    ]
  }

  return approaches[slug as keyof typeof approaches] || []
}

export default async function ApproachesPage({ params }: ApproachesPageProps) {
  const exercise = await getExerciseData(params.slug)
  
  if (!exercise) {
    notFound()
  }

  const approaches = await getApproaches(params.slug)

  return (
    <div id="page-generic-exercise">
      <div className="header mb-8 py-8">
        <div className="lg-container flex items-center relative">
          <div className="self-start md:self-center w-[68px] h-[68px] md:w-[118px] md:h-[118px] mr-12 md:mr-24">
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-2xl md:text-4xl">
                {exercise.title.charAt(0)}
              </span>
            </div>
          </div>
          <div className="flex-grow">
            <h1 className="text-h1 md:mb-8">
              Approaches to {exercise.title}
            </h1>

            <div className="p">
              <Link 
                href={`/exercises/${exercise.slug}`} 
                className="text-prominentLinkColor underline"
              >
                ← Back to exercise
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="lg-container">
        <div className="flex flex-col md:flex-row gap-48">
          <div className="lhs flex-grow">
            <section className="approaches">
              {approaches.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-500 text-lg">
                    No approaches have been documented for this exercise yet.
                  </p>
                  <p className="text-gray-400 mt-4">
                    Check back later or contribute an approach!
                  </p>
                </div>
              ) : (
                approaches.map((approach) => (
                  <div 
                    key={approach.slug}
                    className="border-1 px-8 py-4 rounded-8 mb-8 border-borderColor5"
                  >
                    <h4 className="text-h4 mb-8 font-mono capitalize">
                      {approach.slug.replace('-', ' ')}
                    </h4>
                    <ul className="mb-8 flex gap-4 flex-wrap">
                      {approach.trackApproaches.map((trackApproach) => (
                        <li key={`${trackApproach.track.slug}-${approach.slug}`}>
                          <Link
                            href={`/tracks/${trackApproach.track.slug}/exercises/${exercise.slug}/approaches/${approach.slug}`}
                            className="flex items-center border-1 border-prominentLinkColor rounded-16 w-fit py-4 px-8 hover:bg-blue-50 transition-colors"
                          >
                            <div className="w-6 h-6 mr-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
                              <span className="text-white font-bold text-xs">
                                {trackApproach.track.title.charAt(0)}
                              </span>
                            </div>
                            <div className="text-h6">{trackApproach.track.title}</div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}