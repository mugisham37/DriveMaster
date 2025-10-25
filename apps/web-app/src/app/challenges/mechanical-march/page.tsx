import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'


export const metadata: Metadata = {
  title: 'Mechanical March - Exercism Challenges',
  description: 'Focus on systems programming and low-level concepts. Perfect for understanding how computers work under the hood.',
}

export default function MechanicalMarchPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-16 py-32">
        <header className="text-center mb-48">
          <div className="flex items-center justify-center mb-16">
            <span className="text-48 mr-16">⚙️</span>
            <h1 className="text-h1">Mechanical March</h1>
          </div>
          <p className="text-20 leading-150 text-textColor2 max-w-2xl mx-auto">
            Focus on systems programming and low-level concepts. 
            Perfect for developers wanting to understand how computers work under the hood.
          </p>
        </header>

        <div className="max-w-4xl mx-auto">
          <section className="mb-48">
            <h2 className="text-h2 mb-24">What is Systems Programming?</h2>
            <div className="bg-backgroundColorA rounded-8 p-32 mb-32">
              <p className="text-16 leading-150 text-textColor2 mb-20">
                Systems programming involves writing software that provides services to other software 
                or directly interfaces with computer hardware. It focuses on:
              </p>
              <ul className="space-y-12 text-16 leading-150">
                <li className="flex items-start">
                  <span className="text-20 mr-12">🔧</span>
                  <div>
                    <strong>Memory Management:</strong> Direct control over memory allocation and deallocation
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-20 mr-12">⚡</span>
                  <div>
                    <strong>Performance:</strong> Optimizing for speed and resource efficiency
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-20 mr-12">🔗</span>
                  <div>
                    <strong>Hardware Interface:</strong> Working close to the metal with system calls
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-20 mr-12">🧵</span>
                  <div>
                    <strong>Concurrency:</strong> Managing multiple threads and processes safely
                  </div>
                </li>
              </ul>
            </div>
          </section>

          <section className="mb-48">
            <h2 className="text-h2 mb-24">Featured Languages</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-24">
              {[
                { name: 'C', slug: 'c', description: 'The foundation of systems programming' },
                { name: 'C++', slug: 'cpp', description: 'Object-oriented systems programming' },
                { name: 'Rust', slug: 'rust', description: 'Memory-safe systems programming' },
                { name: 'Go', slug: 'go', description: 'Modern systems language with GC' },
                { name: 'Zig', slug: 'zig', description: 'Simple, fast systems programming' },
                { name: 'Assembly', slug: 'x86-64-assembly', description: 'Direct hardware programming' }
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
            <h2 className="text-h2 mb-24">Challenge Topics</h2>
            <div className="space-y-24">
              {[
                {
                  title: 'Memory Management',
                  description: 'Learn to manage memory manually and understand allocation patterns.',
                  concepts: ['Malloc/Free', 'Stack vs Heap', 'Memory Leaks', 'RAII']
                },
                {
                  title: 'Pointers & References',
                  description: 'Master direct memory access and understand pointer arithmetic.',
                  concepts: ['Pointer Arithmetic', 'Double Pointers', 'Function Pointers', 'References']
                },
                {
                  title: 'Concurrency & Threading',
                  description: 'Build thread-safe programs and understand synchronization primitives.',
                  concepts: ['Mutexes', 'Semaphores', 'Atomic Operations', 'Lock-free Programming']
                },
                {
                  title: 'System Calls & I/O',
                  description: 'Interface directly with the operating system for file and network operations.',
                  concepts: ['File Descriptors', 'Sockets', 'Pipes', 'Signal Handling']
                },
                {
                  title: 'Data Structures',
                  description: 'Implement efficient data structures from scratch.',
                  concepts: ['Linked Lists', 'Hash Tables', 'Trees', 'Graphs']
                },
                {
                  title: 'Bit Manipulation',
                  description: 'Work with data at the bit level for maximum efficiency.',
                  concepts: ['Bitwise Operations', 'Bit Fields', 'Endianness', 'Compression']
                }
              ].map((topic, index) => (
                <div key={index} className="bg-backgroundColorA rounded-8 p-24">
                  <h3 className="text-h4 mb-12">{topic.title}</h3>
                  <p className="text-16 leading-150 text-textColor2 mb-16">{topic.description}</p>
                  <div className="flex flex-wrap gap-8">
                    {topic.concepts.map((concept) => (
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
            <h2 className="text-h2 mb-24">Learning Path</h2>
            <div className="bg-backgroundColorA rounded-8 p-32">
              <ol className="space-y-16 text-16 leading-150">
                <li className="flex items-start">
                  <span className="bg-prominentLinkColor text-white rounded-full w-24 h-24 flex items-center justify-center text-14 font-bold mr-16 mt-2">1</span>
                  <div>
                    <strong>Start with C</strong> to understand the fundamentals of systems programming
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="bg-prominentLinkColor text-white rounded-full w-24 h-24 flex items-center justify-center text-14 font-bold mr-16 mt-2">2</span>
                  <div>
                    <strong>Master pointers and memory management</strong> through hands-on exercises
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="bg-prominentLinkColor text-white rounded-full w-24 h-24 flex items-center justify-center text-14 font-bold mr-16 mt-2">3</span>
                  <div>
                    <strong>Explore modern systems languages</strong> like Rust or Go
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="bg-prominentLinkColor text-white rounded-full w-24 h-24 flex items-center justify-center text-14 font-bold mr-16 mt-2">4</span>
                  <div>
                    <strong>Build real systems projects</strong> like a simple operating system kernel or network server
                  </div>
                </li>
              </ol>
            </div>
          </section>

          <section className="mb-48">
            <h2 className="text-h2 mb-24">Why Systems Programming?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-32">
              <div className="bg-backgroundColorA rounded-8 p-24">
                <h3 className="text-h4 mb-16">Performance</h3>
                <p className="text-16 leading-150 text-textColor2">
                  Systems programming gives you the tools to write the fastest possible code, 
                  essential for performance-critical applications.
                </p>
              </div>

              <div className="bg-backgroundColorA rounded-8 p-24">
                <h3 className="text-h4 mb-16">Understanding</h3>
                <p className="text-16 leading-150 text-textColor2">
                  Learn how computers actually work, making you a better programmer 
                  in any language or domain.
                </p>
              </div>

              <div className="bg-backgroundColorA rounded-8 p-24">
                <h3 className="text-h4 mb-16">Career Opportunities</h3>
                <p className="text-16 leading-150 text-textColor2">
                  Systems programmers are in high demand for roles in operating systems, 
                  databases, game engines, and embedded systems.
                </p>
              </div>

              <div className="bg-backgroundColorA rounded-8 p-24">
                <h3 className="text-h4 mb-16">Problem Solving</h3>
                <p className="text-16 leading-150 text-textColor2">
                  Systems programming challenges you to think about efficiency, 
                  resource constraints, and elegant solutions.
                </p>
              </div>
            </div>
          </section>

          <div className="text-center">
            <h2 className="text-h2 mb-24">Ready to Go Low-Level?</h2>
            <div className="flex flex-col sm:flex-row gap-16 justify-center">
              <Link 
                href="/tracks/c" 
                className="px-24 py-12 bg-prominentLinkColor text-white rounded-8 font-medium hover:bg-prominentLinkColorHover transition-colors"
              >
                Start with C
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