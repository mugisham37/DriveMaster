'use client'

import React from 'react'
import Image from 'next/image'

interface Testimonial {
  id: number
  name: string
  role: string
  company: string
  content: string
  avatarUrl: string
}

// Mock data - in real implementation, this would come from API
const testimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Sarah Chen',
    role: 'Software Developer',
    company: 'Tech Corp',
    content: 'The structured approach and mentoring made all the difference in my learning journey.',
    avatarUrl: '/assets/avatars/sarah.svg'
  },
  {
    id: 2,
    name: 'Mike Rodriguez',
    role: 'Full Stack Developer',
    company: 'StartupXYZ',
    content: 'I went from complete beginner to landing my first dev job in just 6 months.',
    avatarUrl: '/assets/avatars/mike.svg'
  },
  {
    id: 3,
    name: 'Emma Johnson',
    role: 'Frontend Developer',
    company: 'Design Studio',
    content: 'The hands-on projects helped me build a portfolio that impressed employers.',
    avatarUrl: '/assets/avatars/emma.svg'
  }
]

export function ScrollingTestimonials() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="lg-container">
        <h2 className="text-h1 text-center mb-16">What Our Students Say</h2>
        
        <div className="overflow-hidden">
          <div className="flex animate-scroll gap-8">
            {[...testimonials, ...testimonials].map((testimonial, index) => (
              <div 
                key={`${testimonial.id}-${index}`}
                className="flex-shrink-0 w-80 bg-white p-6 rounded-lg shadow-md"
              >
                <div className="flex items-center mb-4">
                  <Image
                    src={testimonial.avatarUrl}
                    alt={testimonial.name}
                    width={48}
                    height={48}
                    className="rounded-full mr-4"
                  />
                  <div>
                    <h4 className="font-semibold">{testimonial.name}</h4>
                    <p className="text-sm text-gray-600">
                      {testimonial.role} at {testimonial.company}
                    </p>
                  </div>
                </div>
                
                <p className="text-gray-700 italic">&ldquo;{testimonial.content}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}