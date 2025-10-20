import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { GraphicalIcon } from '@/components/common'

interface ExercisePageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: ExercisePageProps): Promise<Metadata> {
  const exercise = await getExerciseData(params.slug)
  
  if (!exercise) {
    return {
      title: 'Exercise Not Found - Exercism'
    }
  }

  return {
    title: `${exercise.title} - Exercism`,
    description: `Learn about the ${exercise.title} exercise across different programming languages on Exercism.`,
  }
}

async function getExerciseData(slug: string) {
  // Mock data - in real implementation, this would fetch from database
  const exercises = {
    'hello-world': {
      slug: 'hello-world',
      title: 'Hello World',
      blurb: 'The classical introductory exercise. Just say "Hello, World!"',
      description: `
        <p>The classical introductory exercise. Just say "Hello, World!".</p>
        <p>This is the first exercise that most programmers encounter when learning a new language. 
        It's a simple program that outputs or returns the string "Hello, World!".</p>
        <p>The purpose of this exercise is to familiarize yourself with the basic syntax of the language 
        and the development environment.</p>
      `,
      source: 'Wikipedia',
      sourceUrl: 'https://en.wikipedia.org/wiki/%22Hello,_World!%22_program',
      deepDiveYoutubeId: 'abc123',
      deepDiveBlurb: 'Learn about the history and significance of Hello World programs.',
      tutorial: true
    },
    'two-fer': {
      slug: 'two-fer',
      title: 'Two Fer',
      blurb: 'Create a sentence of the form "One for X, one for me."',
      description: `
        <p>Create a sentence of the form "One for X, one for me."</p>
        <p>For example:</p>
        <ul>
          <li>One for Alice, one for me.</li>
          <li>One for Bob, one for me.</li>
        </ul>
        <p>When no name is given, return "One for you, one for me."</p>
      `,
      source: null,
      sourceUrl: null,
      deepDiveYoutubeId: null,
      deepDiveBlurb: null,
      tutorial: false
    }
  }

  return exercises[slug as keyof typeof exercises] || null
}

async function getTrackVariants(slug: string) {
  // Mock data - in real implementation, this would fetch from database
  const trackVariants = [
    {
      track: { slug: 'javascript', title: 'JavaScript', iconUrl: '/tracks/javascript.svg' },
      exercise: { slug, title: 'Hello World' },
      isCompleted: true
    },
    {
      track: { slug: 'python', title: 'Python', iconUrl: '/tracks/python.svg' },
      exercise: { slug, title: 'Hello World' },
      isCompleted: false
    },
    {
      track: { slug: 'ruby', title: 'Ruby', iconUrl: '/tracks/ruby.svg' },
      exercise: { slug, title: 'Hello World' },
      isCompleted: true
    },
    {
      track: { slug: 'java', title: 'Java', iconUrl: '/tracks/java.svg' },
      exercise: { slug, title: 'Hello World' },
      isCompleted: false
    },
    {
      track: { slug: 'csharp', title: 'C#', iconUrl: '/tracks/csharp.svg' },
      exercise: { slug, title: 'Hello World' },
      isCompleted: false
    },
    {
      track: { slug: 'go', title: 'Go', iconUrl: '/tracks/go.svg' },
      exercise: { slug, title: 'Hello World' },
      isCompleted: true
    }
  ]

  return trackVariants
}

export default async function ExercisePage({ params }: ExercisePageProps) {
  const exercise = await getExerciseData(params.slug)
  
  if (!exercise) {
    notFound()
  }

  const trackVariants = await getTrackVariants(params.slug)
  const numCompletedSolutions = trackVariants.filter(v => v.isCompleted).length
  const featuredIn2024Languages = trackVariants.slice(0, 3).map(v => v.track)

  return (
    <div id="page-generic-exercise">
      <div className="header mb-8 py-8">
        <div className="lg-container flex items-center relative">
          <div className="self-start md:self-center w-[80px] h-[80px] md:w-[118px] md:h-[118px] mr-12 md:mr-24">
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-2xl md:text-4xl">
                {exercise.title.charAt(0)}
              </span>
            </div>
          </div>
          <div className="flex-grow">
            <h1 className="text-h1 md:mb-2">{exercise.title}</h1>
            <div className="text-p-xlarge">{exercise.blurb}</div>
          </div>
        </div>
      </div>

      <div className="lg-container">
        <div className="flex flex-col md:flex-row gap-48">
          <div className="lhs flex-grow">
            {exercise.deepDiveYoutubeId && (
              <div className="mb-32 bg-backgroundColorA shadow-lg rounded-8 px-20 lg:px-32 py-20 lg:py-24">
                <div className="text-h3 mb-8">Deep Dive: {exercise.title}</div>
                <p className="text-p-large mb-16">{exercise.deepDiveBlurb}</p>
                <div className="w-full">
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <GraphicalIcon icon="play-circle" className="w-16 h-16 text-gray-400 mb-4" />
                      <p className="text-gray-500">YouTube Video: {exercise.deepDiveYoutubeId}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <section className="instructions px-20 lg:px-32 py-20 lg:py-24">
              <div className="text-h3 mb-12">Instructions</div>
              <div className="c-textual-content --large">
                <div className="border-b-1 border-borderColor5 !pb-8 !mb-32">
                  <div dangerouslySetInnerHTML={{ __html: exercise.description }} />
                </div>

                {exercise.tutorial && (
                  <p className="mb-20">
                    This exercise is a tutorial exercise. Watch the intro video to get started:
                    <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center mt-4">
                      <div className="text-center">
                        <GraphicalIcon icon="play-circle" className="w-12 h-12 text-gray-400 mb-2" />
                        <p className="text-gray-500 text-sm">Tutorial Video</p>
                      </div>
                    </div>
                  </p>
                )}

                {(exercise.source || exercise.sourceUrl) && (
                  <div className="source">
                    <hr className="c-divider --small" />
                    <h3>Source</h3>
                    {exercise.source && exercise.sourceUrl ? (
                      <a 
                        href={exercise.sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-prominentLinkColor underline"
                      >
                        {exercise.source}
                      </a>
                    ) : exercise.source ? (
                      <p>{exercise.source}</p>
                    ) : (
                      <p>
                        Explore the source at{' '}
                        <a 
                          href={exercise.sourceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-prominentLinkColor underline"
                        >
                          this link
                        </a>
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="flex-shrink-0 md:w-[33%]">
            {featuredIn2024Languages.length > 0 && (
              <div className="shadow-lg bg-backgroundColorA px-20 py-16 mb-24 rounded-8">
                <div className="flex items-center gap-16">
                  <div className="lhs">
                    <div className="text-h4 mb-2">Featured in #48in24</div>
                    <p className="xl:text-p-base text-p-large">
                      {exercise.title} is featured in the{' '}
                      <Link href="/challenges/48in24" className="text-prominentLinkColor underline">
                        #48in24 challenge
                      </Link>
                      . Solve it in{' '}
                      {featuredIn2024Languages.map((track, index) => (
                        <span key={track.slug}>
                          <Link 
                            href={`/tracks/${track.slug}/exercises/${exercise.slug}`}
                            className="text-prominentLinkColor underline"
                          >
                            {track.title}
                          </Link>
                          {index < featuredIn2024Languages.length - 1 && ', '}
                        </span>
                      ))}
                      !
                    </p>
                  </div>
                  <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">48</span>
                  </div>
                </div>
              </div>
            )}

            <div className="text-h4 mb-2">
              Solve {exercise.title} in {trackVariants.length} languages
            </div>
            <p className="xl:text-p-base text-p-large mb-20">
              {numCompletedSolutions > 0 
                ? `You've completed this exercise in ${numCompletedSolutions} language${numCompletedSolutions === 1 ? '' : 's'}.`
                : "You haven't completed this exercise in any languages yet."
              }
            </p>

            <section className="tracks grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-16">
              {trackVariants.map((variant) => {
                const cssClass = variant.isCompleted ? "completed" : "not-started"
                return (
                  <Link
                    key={variant.track.slug}
                    href={`/tracks/${variant.track.slug}/exercises/${exercise.slug}`}
                    className={`${cssClass} block p-4 rounded-lg border-2 transition-colors ${
                      variant.isCompleted 
                        ? 'border-green-500 bg-green-50 hover:bg-green-100' 
                        : 'border-gray-300 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="track-icon w-12 h-12 mb-2">
                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {variant.track.title.charAt(0)}
                          </span>
                        </div>
                      </div>
                      <div className="font-medium text-textColor1 text-16">
                        {variant.track.title}
                      </div>
                    </div>
                  </Link>
                )
              })}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}