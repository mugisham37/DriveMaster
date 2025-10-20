import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'

export const metadata: Metadata = {
  title: 'Challenges - Exercism',
  description: 'Take on coding challenges and improve your programming skills with our community events.',
}

export default function ChallengesPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-16 py-32">
        <header className="text-center mb-48">
          <h1 className="text-h1 mb-16">Exercism Challenges</h1>
          <p className="text-20 leading-150 text-textColor2 max-w-2xl mx-auto">
            Join our community challenges and push your programming skills to the next level.
            Participate in events, earn badges, and learn new languages.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-32 max-w-4xl mx-auto">
          <Link 
            href="/challenges/48in24"
            className="bg-backgroundColorA rounded-8 p-32 shadow-base hover:shadow-lg transition-shadow block"
          >
            <div className="flex items-center mb-16">
              <span className="text-32 mr-12">📅</span>
              <h2 className="text-h2">#48in24</h2>
            </div>
            <p className="text-16 leading-150 text-textColor2 mb-20">
              A year-long challenge featuring a new exercise every week. 
              Solve exercises in different languages and earn bronze, silver, and gold status.
            </p>
            <div className="flex items-center text-linkColor font-semibold">
              <span>Join the challenge</span>
              <GraphicalIcon icon="arrow-right" className="ml-8" />
            </div>
          </Link>

          <Link 
            href="/challenges/12in23"
            className="bg-backgroundColorA rounded-8 p-32 shadow-base hover:shadow-lg transition-shadow block"
          >
            <div className="flex items-center mb-16">
              <span className="text-32 mr-12">🎯</span>
              <h2 className="text-h2">#12in23</h2>
            </div>
            <p className="text-16 leading-150 text-textColor2 mb-20">
              Learn 12 programming languages in 2023! Each month features different languages 
              with themed exercises and community events.
            </p>
            <div className="flex items-center text-linkColor font-semibold">
              <span>View progress</span>
              <GraphicalIcon icon="arrow-right" className="ml-8" />
            </div>
          </Link>

          <Link 
            href="/challenges/functional-february"
            className="bg-backgroundColorA rounded-8 p-32 shadow-base hover:shadow-lg transition-shadow block"
          >
            <div className="flex items-center mb-16">
              <span className="text-32 mr-12">🔧</span>
              <h2 className="text-h2">Functional February</h2>
            </div>
            <p className="text-16 leading-150 text-textColor2 mb-20">
              Dive deep into functional programming paradigms with exercises designed 
              to challenge your thinking and expand your coding toolkit.
            </p>
            <div className="flex items-center text-linkColor font-semibold">
              <span>Learn more</span>
              <GraphicalIcon icon="arrow-right" className="ml-8" />
            </div>
          </Link>

          <Link 
            href="/challenges/mechanical-march"
            className="bg-backgroundColorA rounded-8 p-32 shadow-base hover:shadow-lg transition-shadow block"
          >
            <div className="flex items-center mb-16">
              <span className="text-32 mr-12">⚙️</span>
              <h2 className="text-h2">Mechanical March</h2>
            </div>
            <p className="text-16 leading-150 text-textColor2 mb-20">
              Focus on systems programming and low-level concepts. 
              Perfect for developers wanting to understand how computers work under the hood.
            </p>
            <div className="flex items-center text-linkColor font-semibold">
              <span>Get started</span>
              <GraphicalIcon icon="arrow-right" className="ml-8" />
            </div>
          </Link>
        </div>

        <div className="text-center mt-48">
          <h2 className="text-h2 mb-24">Ready to Challenge Yourself?</h2>
          <p className="text-16 leading-150 text-textColor2 mb-32 max-w-xl mx-auto">
            Join thousands of developers who are improving their skills through our challenges.
            Pick a challenge that interests you and start coding today!
          </p>
          <Link 
            href="/tracks" 
            className="px-24 py-12 bg-prominentLinkColor text-white rounded-8 font-medium hover:bg-prominentLinkColorHover transition-colors"
          >
            Browse All Tracks
          </Link>
        </div>
      </div>
    </div>
  )
}