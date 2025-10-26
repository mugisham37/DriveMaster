'use client'

import React, { useState, useEffect } from 'react'
import { Avatar, TrackIcon } from '@/components/common'
import { fromNow } from '@/utils/date'

interface Testimonial {
  id: string
  uuid: string
  content: string
  createdAt: string
  student: {
    handle: string
    avatarUrl: string
  }
  mentor: {
    handle: string
    avatarUrl: string
  }
  exercise: {
    title: string
  }
  track: {
    title: string
    iconUrl: string
  }
}

interface ImpactTestimonialsListProps {
  endpoint: string
  defaultSelected?: string | null
}

export function ImpactTestimonialsList({ 
  endpoint, 
  defaultSelected 
}: ImpactTestimonialsListProps) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch testimonials from the API
    fetch(endpoint)
      .then(response => response.json())
      .then(data => {
        setTestimonials(data.testimonials || [])
        if (defaultSelected) {
          const selected = data.testimonials?.find((t: Testimonial) => t.uuid === defaultSelected)
          setSelectedTestimonial(selected || null)
        }
        setLoading(false)
      })
      .catch(error => {
        console.error('Failed to fetch testimonials:', error)
        setLoading(false)
      })
  }, [endpoint, defaultSelected])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-textColor2">Loading testimonials...</div>
      </div>
    )
  }

  return (
    <div className="impact-testimonials-list">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-24">
        {testimonials.map((testimonial) => (
          <div
            key={testimonial.id}
            className="testimonial bg-backgroundColorA rounded-8 p-24 cursor-pointer hover:shadow-base transition-shadow"
            onClick={() => setSelectedTestimonial(testimonial)}
          >
            <div className="flex gap-8 items-center mb-16">
              <Avatar
                user={{
                  avatarUrl: testimonial.student.avatarUrl,
                  handle: testimonial.student.handle
                }}
                size="medium"
                className="h-[32px] w-[32px]"
              />
              <span className="text-xs text-textColor2">→</span>
              <Avatar
                user={{
                  avatarUrl: testimonial.mentor.avatarUrl,
                  handle: testimonial.mentor.handle
                }}
                size="medium"
                className="h-[32px] w-[32px]"
              />
            </div>
            
            <div className="content text-16 leading-150 mb-16 line-clamp-4">
              {testimonial.content}
            </div>
            
            <div className="flex flex-wrap items-center gap-x-4 text-14 text-textColor2 mb-12">
              <span className="font-medium">{testimonial.student.handle}</span>
              <span>said this about</span>
              <span className="font-medium">{testimonial.mentor.handle}</span>
            </div>
            
            <div className="flex items-center gap-8 text-14 text-textColor2">
              <span>{testimonial.exercise.title} on</span>
              <TrackIcon
                iconUrl={testimonial.track.iconUrl}
                title={testimonial.track.title}
                className="w-[16px] h-[16px]"
              />
              <span>{testimonial.track.title}</span>
            </div>
            
            <time className="text-xs text-textColor3 mt-8 block">
              {fromNow(testimonial.createdAt)}
            </time>
          </div>
        ))}
      </div>

      {/* Modal for selected testimonial */}
      {selectedTestimonial && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelectedTestimonial(null)}
        >
          <div 
            className="bg-white rounded-8 p-32 max-w-2xl mx-16"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-12 items-center mb-24">
              <Avatar
                user={{
                  avatarUrl: selectedTestimonial.student.avatarUrl,
                  handle: selectedTestimonial.student.handle
                }}
                size="large"
                className="h-[48px] w-[48px]"
              />
              <span className="text-16 text-textColor2">→</span>
              <Avatar
                user={{
                  avatarUrl: selectedTestimonial.mentor.avatarUrl,
                  handle: selectedTestimonial.mentor.handle
                }}
                size="large"
                className="h-[48px] w-[48px]"
              />
            </div>
            
            <div className="text-18 leading-160 mb-24">
              {selectedTestimonial.content}
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <span>{selectedTestimonial.exercise.title} on</span>
                <TrackIcon
                  iconUrl={selectedTestimonial.track.iconUrl}
                  title={selectedTestimonial.track.title}
                  className="w-[20px] h-[20px]"
                />
                <span className="font-medium">{selectedTestimonial.track.title}</span>
              </div>
              
              <button
                onClick={() => setSelectedTestimonial(null)}
                className="px-16 py-8 bg-backgroundColorB rounded-6 text-14 hover:bg-backgroundColorC transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}