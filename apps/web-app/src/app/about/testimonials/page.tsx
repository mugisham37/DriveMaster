import React from 'react'
import { Metadata } from 'next'
import { AboutNav } from '@/components/about'
import { ImpactTestimonialsList } from '@/components/impact'

export const metadata: Metadata = {
  title: 'Testimonials - About Exercism',
  description: 'Read testimonials from students and mentors about their experience with Exercism.',
}

export default function TestimonialsPage() {
  return (
    <div className="min-h-screen bg-white">
      <AboutNav activeTab="impact" />
      
      <div id="impact-page" className="pt-32">
        <div className="lg-container mb-64">
          <div className="c-shapes-impact c-shapes-1">
            <h2 className="text-h1 text-center max-w-[800px] mx-auto">
              Stories from our community
            </h2>
          </div>

          <div className="md-container">
            <article className="testimonials pt-40">
              <ImpactTestimonialsList />
            </article>
          </div>
        </div>
      </div>
    </div>
  )
}