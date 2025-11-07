'use client'

import React from 'react'

interface ImpactTestimonialsListProps {
  endpoint: string
  defaultSelected: string | null
}

export function ImpactTestimonialsList({ endpoint, defaultSelected }: ImpactTestimonialsListProps) {
  return (
    <div className="impact-testimonials-list">
      <div className="impact-testimonials-content">
        {/* Testimonials list would go here */}
        <p>Endpoint: {endpoint}</p>
        <p>Selected: {defaultSelected || 'None'}</p>
      </div>
    </div>
  )
}
