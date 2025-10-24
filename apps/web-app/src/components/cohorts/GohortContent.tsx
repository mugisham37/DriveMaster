'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'

interface Track {
  slug: string
  title: string
  iconUrl: string
  numConcepts: number
  numExercises: number
}

interface Cohort {
  slug: string
  name: string
  beginsAt: Date
  type: 'gohort' | 'exhort'
  track: Track
}

interface GohortContentProps {
  cohort: Cohort
}

export function GohortContent({ cohort }: GohortContentProps) {
  return (
    <div id="gobridge-partner-page">
      <header className="pt-32 md:pt-48 pb-48 md:pb-64">
        <div className="lg-container flex flex-col md:items-center c-shapes c-shapes-1">
          <div className="icons flex items-center mb-24 md:mb-36 self-center">
            <GraphicalIcon icon="exercism-face" />
            <span className="text-2xl mx-4">💙</span>
            <GraphicalIcon icon="go-gopher" category="graphics" />
          </div>

          <h1 className="text-h0 text-center mb-12 md:mb-16">
            Welcome to {cohort.name}
          </h1>
          <p className="text-p-2xlarge text-center">
            Join our community cohort and learn Go together with fellow developers from around the world.
          </p>
        </div>
      </header>

      <article>
        <section className="mentoring-section pt-40 md:pt-56 mb-16 md:mb-48">
          <div className="lg-container flex flex-col-reverse lg:flex-row mb-48">
            <div className="content flex flex-col">
              <h2 className="text-h4 mb-16 flex items-center">
                <GraphicalIcon icon="mentoring-gradient" />
                <div className="text-gradient ml-24">Tell me more</div>
              </h2>
              <h3 className="text-h1">
                <span>What is {cohort.name}?</span>
              </h3>
              <hr className="c-divider my-24" />
              <p className="text-p-xlarge mb-16">
                {cohort.name} is a free, community-driven learning experience where you&apos;ll work through 
                Go exercises alongside other learners. It&apos;s designed to be flexible, supportive, and fun!
              </p>
              <ul className="text-p-xlarge mb-16 list-disc pl-20">
                <li className="mb-6">Completely free access to all materials</li>
                <li className="mb-6">Flexible start date - begin when you&apos;re ready</li>
                <li className="mb-6">Learn at your own pace</li>
                <li className="mb-6">Work individually or pair with others</li>
                <li className="mb-6">Share your progress and celebrate together</li>
              </ul>

              <p className="text-p-xlarge mb-32">
                <strong>
                  Note: Some programming experience is helpful but not required. 
                  We welcome developers of all skill levels!
                </strong>
              </p>

              <Link href="#register" className="btn-primary btn-m self-start">
                Sign up below
                <GraphicalIcon icon="chevron-down" />
              </Link>
            </div>

            <section className="video-section flex-shrink-0 mb-32 lg:mb-0">
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                <iframe 
                  src="https://www.loom.com/embed/aed21fa6e5a84bf8b29816b5f2fb56a9" 
                  frameBorder="0" 
                  allowFullScreen 
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />
              </div>
            </section>
          </div>
        </section>

        <section className="learning-section c-shapes c-shapes-1 pt-48 mb-96">
          <div className="lg-container flex flex-col items-center">
            <h2 className="text-h4 mb-16 flex items-center">
              <GraphicalIcon icon="concepts" />
              <div className="text-gradient ml-24">Gain fluency in Go</div>
            </h2>

            <h3 className="text-h1">A taste of what you&apos;ll learn</h3>

            <hr className="c-divider my-24" />
            <p className="text-p-xlarge mb-16 text-center">
              The Go track has {cohort.track.numConcepts} concepts and {cohort.track.numExercises} exercises 
              designed to teach you Go from the ground up.
            </p>

            <p className="text-p-xlarge mb-32 text-center">
              <strong>
                Plus, you&apos;ll get personalized mentoring to help you improve your Go skills 
                and learn best practices from experienced developers.
              </strong>
            </p>

            <Link href={`/tracks/${cohort.track.slug}`} className="btn-enhanced btn-m mb-48">
              Explore the Go track
              <GraphicalIcon icon="arrow-right" />
            </Link>

            <Link href={`/tracks/${cohort.track.slug}/concepts`} className="concepts-map">
              <Image 
                src="/assets/screenshots/go-concepts.jpg" 
                width={800}
                height={600}
                alt="Go concepts map"
              />
            </Link>
          </div>
        </section>
      </article>
    </div>
  )
}