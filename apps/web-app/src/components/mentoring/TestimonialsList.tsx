import React, { useState } from 'react'
import type { Testimonial } from '../types'
import { Pagination } from '../common/Pagination'

interface TestimonialsListProps {
  testimonials: Testimonial[]
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function TestimonialsList({
  testimonials,
  currentPage,
  totalPages,
  onPageChange
}: TestimonialsListProps): React.JSX.Element {
  const [selectedTrack, setSelectedTrack] = useState<string>('')

  return (
    <div className="testimonials-list">
      <div className="testimonials-header">
        <h2>Testimonials</h2>
        <div className="filters">
          <select 
            value={selectedTrack} 
            onChange={(e) => setSelectedTrack(e.target.value)}
            className="track-filter"
          >
            <option value="">All Tracks</option>
          </select>
        </div>
      </div>
      
      <div className="testimonials-content">
        {testimonials.length === 0 ? (
          <div className="no-testimonials">
            <p>No testimonials found.</p>
          </div>
        ) : (
          <div className="testimonials-grid">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="testimonial-card">
                <div className="testimonial-header">
                  <div className="student-info">
                    <img src={testimonial.student.avatarUrl} alt={`${testimonial.student.handle} avatar`} className="student-avatar" />
                    <span>{testimonial.student.handle}</span>
                  </div>
                  <div className="exercise-info">
                    <img src={testimonial.exercise.iconUrl} alt={`${testimonial.exercise.title} exercise icon`} className="exercise-icon" />
                    <span>{testimonial.exercise.title}</span>
                  </div>
                </div>
                
                <div className="testimonial-content">
                  <div dangerouslySetInnerHTML={{ __html: testimonial.contentHtml }} />
                </div>
                
                <div className="testimonial-footer">
                  <span className="created-at">
                    {new Date(testimonial.createdAt).toLocaleDateString()}
                  </span>
                  {testimonial.isRevealed && (
                    <span className="revealed-badge">Revealed</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {totalPages > 1 && (
        <Pagination
          current={currentPage}
          total={totalPages}
          setPage={onPageChange}
        />
      )}
    </div>
  )
}