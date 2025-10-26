import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

import { YoutubePlayer } from '@/components/common/YoutubePlayer'

export const metadata: Metadata = {
  title: '#48in24 Challenge - Exercism',
  description: 'Join the #48in24 challenge - 48 exercises over 48 weeks. Earn bronze, silver, and gold status.',
}

interface Exercise {
  id: number
  slug: string
  title: string
  week: number
  learningOpportunity: string
  blurb: string
  featuredTracks: string[]
  completedTracks: Record<string, number>
  status: 'bronze' | 'silver' | 'gold' | 'none'
  deepDiveYoutubeId?: string
  deepDiveBlurb?: string
}

async function get48in24Data() {
  const startDate = new Date('2024-01-15')
  const currentDate = new Date()
  const week = Math.ceil((currentDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
  
  const exercises: Exercise[] = [
    {
      id: 1,
      slug: 'leap',
      title: 'Leap',
      week: 1,
      learningOpportunity: 'Learn about boolean logic and date calculations while determining if a year is a leap year.',
      blurb: 'Given a year, report if it is a leap year.',
      featuredTracks: ['javascript', 'python', 'ruby'],
      completedTracks: { 'javascript': 2024, 'python': 2024 },
      status: 'silver',
      deepDiveYoutubeId: 'dQw4w9WgXcQ',
      deepDiveBlurb: 'Erik and Jeremy explore different approaches to the Leap exercise, from simple conditionals to more elegant solutions.'
    },
    {
      id: 2,
      slug: 'lasagna',
      title: 'Lasagna',
      week: 2,
      learningOpportunity: 'Practice basic arithmetic and function composition in a cooking context.',
      blurb: 'Calculate cooking times for lasagna preparation.',
      featuredTracks: ['go', 'rust', 'java'],
      completedTracks: { 'go': 2024 },
      status: 'bronze'
    },
    {
      id: 3,
      slug: 'two-fer',
      title: 'Two Fer',
      week: 3,
      learningOpportunity: 'Learn string interpolation and default parameter handling.',
      blurb: 'Create a sentence of the form "One for X, one for me."',
      featuredTracks: ['csharp', 'fsharp', 'elixir'],
      completedTracks: {},
      status: 'none'
    }
  ]

  const liveExercises = exercises.filter(e => e.week <= week)
  const featuredExercise = liveExercises[liveExercises.length - 1]

  const tracks = {
    'javascript': 'JavaScript',
    'python': 'Python',
    'ruby': 'Ruby',
    'go': 'Go',
    'rust': 'Rust',
    'java': 'Java',
    'csharp': 'C#',
    'fsharp': 'F#',
    'elixir': 'Elixir'
  }

  return {
    week,
    exercises,
    liveExercises,
    featuredExercise,
    tracks,
    numPlaceholders: exercises.length - liveExercises.length
  }
}

export default async function Challenge48in24Page() {
  const { week, liveExercises, featuredExercise, tracks, numPlaceholders } = await get48in24Data()

  return (
    <div id="challenge-48in24-page">
      <section className="top-section">
        <div className="lg-container">
          <div className="flex xl:flex-row flex-col xl:items-start items-center">
            <div className="xl:mr-auto max-w-[860px]">
              <div className="font-semibold leading-150 flex items-center mb-4 text-adaptivePurple">
                <span className="emoji mr-6">📆</span>
                {featuredExercise ? (
                  <>Week {week} of #48in24</>
                ) : (
                  <>Begins Jan 16th 2024</>
                )}
              </div>

              {featuredExercise ? (
                <>
                  <h1 className="text-h1 mb-8">This week, we&apos;re featuring {featuredExercise.title}.</h1>
                  <p className="text-p-xlarge mb-12">
                    For week {week} of #48in24, we&apos;re exploring{' '}
                    <Link href={`/exercises/${featuredExercise.slug}`} className="underline">
                      {featuredExercise.title}
                    </Link>.
                  </p>
                  <p className="text-p-large mb-12">{featuredExercise.learningOpportunity}</p>

                  <p className="text-p-large mb-12">
                    Your task: {featuredExercise.blurb}
                  </p>
                  <p className="text-p-large mb-12">
                    We&apos;re featuring it in the following languages:{' '}
                    {featuredExercise.featuredTracks.map((slug, index) => (
                      <span key={slug}>
                        <Link href={`/tracks/${slug}/exercises/${featuredExercise.slug}`} className="underline">
                          {tracks[slug as keyof typeof tracks]}
                        </Link>
                        {index < featuredExercise.featuredTracks.length - 1 ? ', ' : '.'}
                      </span>
                    ))}
                  </p>

                  {featuredExercise.deepDiveYoutubeId && (
                    <div className="shadow-baseZ1 grid md:grid-cols-2 grid-cols-1 gap-20 py-20 px-20 rounded-8 bg-backgroundColorB">
                      <div className="flex-shrink">
                        <h2 className="text-h4 mb-4">Join Erik and Jeremy as they explore the different ways to approach this exercise 👉</h2>
                        <p className="text-p-base mb-8">{featuredExercise.deepDiveBlurb}</p>
                        <p className="text-p-base">
                          Enjoy watching and please leave a comment!
                        </p>
                      </div>

                      <div className="rhs">
                        <div className="w-[100%] md:max-w-[500px]">
                          <YoutubePlayer videoId={featuredExercise.deepDiveYoutubeId} />
                        </div>
                      </div>
                    </div>
                  )}

                  <h2 className="text-h3 mt-32 mb-6">Learn from others… 🎥</h2>
                  <p className="text-p-large mb-12 c-highlight-links">
                    Join us as our staff and community stream solving our featured exercises, and dig into the different ways they can be approached.
                    Subscribe to our{' '}
                    <Link href="https://twitch.tv/exercismlive" className="underline">Twitch Channel</Link>
                    {' '}and{' '}
                    <Link href="https://www.youtube.com/exercism_videos?sub_confirmation=1" className="underline">YouTube Channel</Link>
                    {' '}to not miss out!
                    There&apos;s also a schedule at the top right of this page.
                  </p>

                  <p className="text-p-large">
                    Join in the conversation by using the{' '}
                    <Link href="https://forum.exercism.org/c/exercism/48in24" className="underline">#48in24 tag on our forums</Link>,
                    chatting on our <Link href="https://exercism.org/r/discord" className="underline">Discord Server</Link>,
                    or using the <strong className="font-semibold">#48in24</strong> hashtag around social media!
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-h1 mb-8">#48in24 starts on January 16th!</h1>
                  <p className="text-p-xlarge mb-20">
                    Every Tuesday for 48 weeks, we&apos;ll be featuring a different exercise.
                    This page will tell you everything you need to know about the featured exercise, and show you your progress through the year.
                  </p>
                  <p className="text-p-xlarge mb-20">
                    We&apos;ll email you when the challenge starts!
                  </p>

                  <h2 className="text-h3 mt-32 mb-4">Subscribe to not miss out… 🎥</h2>
                  <p className="text-p-large mb-12 c-highlight-links">
                    Join us as our staff and community stream solving our featured exercises, and dig into the different ways they can be approached.
                    Subscribe to our{' '}
                    <Link href="https://twitch.tv/exercismlive" className="underline">Twitch Channel</Link>
                    {' '}and{' '}
                    <Link href="https://www.youtube.com/exercism_videos?sub_confirmation=1" className="underline">YouTube Channel</Link>
                    {' '}to not miss out!
                    There&apos;s also a schedule at the top right of this page.
                  </p>

                  <p className="text-p-large">
                    Join in the conversation by using the{' '}
                    <Link href="https://forum.exercism.org/tag/48in24" className="underline">#48in24 tag on our forums</Link>,
                    chatting on our <Link href="https://exercism.org/r/discord" className="underline">Discord Server</Link>,
                    or using the <strong className="font-semibold">#48in24</strong> hashtag around social media!
                  </p>
                </>
              )}

              <h2 className="text-h3 mt-32 mb-6">#48in24 Badges</h2>
              <p className="text-p-large xl:mb-12 mb-24 c-highlight-links">
                Throughout the year we&apos;ll be releasing badges as you earn bronze, silver and gold awards. Keep checking back here to see what badges have become available.
              </p>
            </div>

            <div className="xl:ml-80 xl:max-w-[450px] max-w-[860px]">
              <div className="bg-backgroundColorD rounded-8 py-16 px-24 border-1 border-borderColor7">
                <div className="text-h4 mb-4">How does #48in24 work?</div>
                <p className="xl:text-p-base text-p-large mb-12">Each week we feature a new exercise. You can earn one of three statuses for each exercise:</p>
                <ul className="xl:text-p-base text-p-large mb-12">
                  <li>
                    <strong className="!text-textColor1">Bronze:</strong>
                    {' '}Solve the exercise during 2024.
                  </li>
                  <li>
                    <strong className="!text-textColor1">Silver:</strong>
                    {' '}Solve the exercise in any three languages during 2024.
                  </li>
                  <li>
                    <strong className="!text-textColor1">Gold:</strong>
                    {' '}Qualify for silver status. Plus have solved the exercise in the three featured languages at some point (not necessarily in 2024).
                  </li>
                </ul>

                <p className="text-p-base mb-12">Watch this video for more information!</p>
                <YoutubePlayer videoId="v6fMaOdUxSk" />

                <p className="text-p-small text-center mt-20 bg-backgroundColorA rounded-8 py-8 px-12 font-medium">
                  Track your progress at the bottom of the page.
                </p>
              </div>

              {featuredExercise && (
                <div className="bg-backgroundColorD rounded-8 py-16 px-24 border-1 border-borderColor7 mt-24">
                  <h2 className="text-h4 mb-4">Enjoying #48in24? Please donate 🙏</h2>
                  <p className="xl:text-p-base text-p-large mb-12">
                    We keep Exercism free so that anyone can use it. But we rely on the generosity of people that could afford it to make that possible. If you&apos;re enjoying #48in24 and are financially able, please consider donating to keep Exercism going!
                  </p>
                  <Link href="/donate" className="btn btn-primary">
                    Donate now
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <article>
        <div className="md-container">
          <div className="flex text-center flex-col items-center">
            <h1 className="text-h1 mb-16">Your #48in24 Progress</h1>
            <p className="text-p-xlarge">
              Below you&apos;ll see a list of all the featured exercises for #48in24, along with your progress for each. Click to jump to the exercise or featured tracks.
            </p>
            <p className="text-p-large cta">
              Read the instructions at the top-right of this page to understand how everything works.
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-3 sm:grid-cols-2 gap-32 mx-auto exercises">
            {liveExercises.map((exercise) => {
              const numCompletedTracks = Object.keys(exercise.completedTracks).filter(
                track => exercise.completedTracks[track] === 2024
              ).length

              return (
                <div key={exercise.id} className={`exercise ${exercise.status}`}>
                  <Link href={`/exercises/${exercise.slug}`} className="info">
                    <Image 
                      src={`https://assets.exercism.org/images/exercises/${exercise.slug}.svg`}
                      alt={`Icon of ${exercise.title}`}
                      width={64}
                      height={64}
                      className="exercise-icon c-icon"
                    />
                    <div className="text-h3 mb-16">{exercise.title}</div>
                    <progress className="progress-bar" value={numCompletedTracks} max={3} />
                    {numCompletedTracks > 2 ? (
                      <div className="count">{numCompletedTracks} completed during 2024</div>
                    ) : (
                      <div className="count">{numCompletedTracks} / 3 completed during 2024</div>
                    )}
                  </Link>
                  <div className="featured">
                    <div className="tracks">
                      {exercise.featuredTracks.map((trackSlug) => {
                        const completed = exercise.completedTracks[trackSlug]
                        return (
                          <Link 
                            key={trackSlug}
                            href={`/tracks/${trackSlug}/exercises/${exercise.slug}`}
                            className={`track-icon ${completed ? 'completed' : ''}`}
                            title={`${tracks[trackSlug as keyof typeof tracks]} ${completed ? '(completed)' : ''}`}
                          >
                            <Image 
                              src={`https://assets.exercism.org/images/tracks/${trackSlug}.svg`}
                              alt={`Icon of ${tracks[trackSlug as keyof typeof tracks]}`}
                              width={24}
                              height={24}
                            />
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )
            })}

            {Array.from({ length: numPlaceholders }).map((_, index) => (
              <div 
                key={`placeholder-${index}`}
                className="shadow-base bg-backgroundColorA rounded-8 flex flex-col items-center justify-center opacity-60 min-h-[175px]"
              >
                <div className="text-h0 opacity-[0.2]">?</div>
              </div>
            ))}
          </div>
        </div>
      </article>
    </div>
  )
}