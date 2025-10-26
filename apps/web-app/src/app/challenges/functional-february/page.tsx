import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'


export const metadata: Metadata = {
  title: 'Functional February - Exercism Challenges',
  description: 'Dive deep into functional programming paradigms with exercises designed to challenge your thinking.',
}

export default function FunctionalFebruaryPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-16 py-32">
        <header className="text-center mb-48">
          <div className="flex items-center justify-center mb-16">
            <span className="text-48 mr-16">🔧</span>
            <h1 className="text-h1">Functional February</h1>
          </div>
          <p className="text-20 leading-150 text-textColor2 max-w-2xl mx-auto">
            Dive deep into functional programming paradigms with exercises designed 
            to challenge your thinking and expand your coding toolkit.
          </p>
        </header>

        <div className="max-w-4xl mx-auto">
          <section className="mb-48">
            <h2 className="text-h2 mb-24">What is Functional Programming?</h2>
            <div className="bg-backgroundColorA rounded-8 p-32 mb-32">
              <p className="text-16 leading-150 text-textColor2 mb-20">
                Functional programming is a programming paradigm that treats computation as the evaluation 
                of mathematical functions and avoids changing state and mutable data. It emphasizes:
              </p>
              <ul className="space-y-12 text-16 leading-150">
                <li className="flex items-start">
                  <span className="text-20 mr-12">🔄</span>
                  <div>
                    <strong>Immutability:</strong> Data structures that don&apos;t change after creation
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-20 mr-12">🎯</span>
                  <div>
                    <strong>Pure Functions:</strong> Functions that always return the same output for the same input
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-20 mr-12">🔗</span>
                  <div>
                    <strong>Function Composition:</strong> Building complex operations by combining simpler functions
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-20 mr-12">🚫</span>
                  <div>
                    <strong>No Side Effects:</strong> Functions don&apos;t modify external state
                  </div>
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-48">
            <h2 className="text-h2 mb-24">Featured Languages</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-24">
              {[
                { name: 'Haskell', slug: 'haskell', description: 'Pure functional programming language' },
                { name: 'Clojure', slug: 'clojure', description: 'Lisp dialect for the JVM' },
                { name: 'F#', slug: 'fsharp', description: 'Functional-first .NET language' },
                { name: 'Elixir', slug: 'elixir', description: 'Dynamic functional language' },
                { name: 'Erlang', slug: 'erlang', description: 'Concurrent functional programming' },
                { name: 'Scheme', slug: 'scheme', description: 'Minimalist Lisp dialect' }
              ].map((lang) => (
                <Link 
                  key={lang.slug}
                  href={`/tracks/${lang.slug}`}
                  className="bg-backgroundColorA rounded-8 p-24 shadow-base hover:shadow-lg transition-shadow block"
                >
                  <h3 className="text-h4 mb-8">{lang.name}</h3>
                  <p className="text-14 text-textColor6">{lang.description}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="mb-48">
            <h2 className="text-h2 mb-24">Challenge Exercises</h2>
            <div className="space-y-24">
              {[
                {
                  title: 'Higher-Order Functions',
                  description: 'Master functions that take other functions as arguments or return functions.',
                  concepts: ['Map', 'Filter', 'Reduce', 'Fold']
                },
                {
                  title: 'Recursion & Tail Calls',
                  description: 'Learn to think recursively and optimize with tail call optimization.',
                  concepts: ['Recursion', 'Tail Recursion', 'Mutual Recursion']
                },
                {
                  title: 'Monads & Functors',
                  description: 'Understand these powerful abstractions for handling complexity.',
                  concepts: ['Maybe/Option', 'Either/Result', 'List Monad']
                },
                {
                  title: 'Lazy Evaluation',
                  description: 'Explore how lazy evaluation can improve performance and enable infinite data structures.',
                  concepts: ['Streams', 'Generators', 'Infinite Lists']
                }
              ].map((exercise, index) => (
                <div key={index} className="bg-backgroundColorA rounded-8 p-24">
                  <h3 className="text-h4 mb-12">{exercise.title}</h3>
                  <p className="text-16 leading-150 text-textColor2 mb-16">{exercise.description}</p>
                  <div className="flex flex-wrap gap-8">
                    {exercise.concepts.map((concept) => (
                      <span 
                        key={concept}
                        className="px-12 py-4 bg-backgroundColorB rounded-4 text-12 font-medium text-textColor6"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-48">
            <h2 className="text-h2 mb-24">Getting Started</h2>
            <div className="bg-backgroundColorA rounded-8 p-32">
              <ol className="space-y-16 text-16 leading-150">
                <li className="flex items-start">
                  <span className="bg-prominentLinkColor text-white rounded-full w-24 h-24 flex items-center justify-center text-14 font-bold mr-16 mt-2">1</span>
                  <div>
                    <strong>Choose a functional language</strong> from our featured tracks above
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="bg-prominentLinkColor text-white rounded-full w-24 h-24 flex items-center justify-center text-14 font-bold mr-16 mt-2">2</span>
                  <div>
                    <strong>Start with basic exercises</strong> to get familiar with the syntax
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="bg-prominentLinkColor text-white rounded-full w-24 h-24 flex items-center justify-center text-14 font-bold mr-16 mt-2">3</span>
                  <div>
                    <strong>Progress to functional concepts</strong> like higher-order functions and recursion
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="bg-prominentLinkColor text-white rounded-full w-24 h-24 flex items-center justify-center text-14 font-bold mr-16 mt-2">4</span>
                  <div>
                    <strong>Request mentoring</strong> to get feedback on your functional programming style
                  </div>
                </li>
              </ol>
            </div>
          </section>

          <div className="text-center">
            <h2 className="text-h2 mb-24">Ready to Think Functionally?</h2>
            <div className="flex flex-col sm:flex-row gap-16 justify-center">
              <Link 
                href="/tracks" 
                className="px-24 py-12 bg-prominentLinkColor text-white rounded-8 font-medium hover:bg-prominentLinkColorHover transition-colors"
              >
                Explore Functional Languages
              </Link>
              <Link 
                href="/challenges" 
                className="px-24 py-12 border border-borderColor2 text-textColor1 rounded-8 font-medium hover:bg-backgroundColorA transition-colors"
              >
                View All Challenges
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}