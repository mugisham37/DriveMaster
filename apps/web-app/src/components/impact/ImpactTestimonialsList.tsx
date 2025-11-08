"use client";

import React, { useEffect, useState } from "react";

export interface Testimonial {
  id: string;
  author: string;
  role: string;
  content: string;
  rating: number;
  date: string;
}

export interface ImpactTestimonialsListProps {
  endpoint: string;
  defaultSelected: string | null;
}

/**
 * ImpactTestimonialsList Component
 * Fetches and displays testimonials from the API
 */
export function ImpactTestimonialsList({
  endpoint,
  defaultSelected,
}: ImpactTestimonialsListProps) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(defaultSelected);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(endpoint);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch testimonials: ${response.statusText}`);
        }
        
        const data = await response.json();
        setTestimonials(data.testimonials || []);
      } catch (err) {
        console.error("Error fetching testimonials:", err);
        setError(err instanceof Error ? err.message : "Failed to load testimonials");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTestimonials();
  }, [endpoint]);

  const handleTestimonialClick = (id: string) => {
    setSelectedId(id === selectedId ? null : id);
  };

  if (isLoading) {
    return <div className="impact-testimonials-loading">Loading testimonials...</div>;
  }

  if (error) {
    return <div className="impact-testimonials-error">Error: {error}</div>;
  }

  if (testimonials.length === 0) {
    return <div className="impact-testimonials-empty">No testimonials available.</div>;
  }

  return (
    <div className="impact-testimonials">
      <div className="testimonials-list">
        {testimonials.map((testimonial) => (
          <div
            key={testimonial.id}
            className={`testimonial-card ${selectedId === testimonial.id ? "selected" : ""}`}
            onClick={() => handleTestimonialClick(testimonial.id)}
          >
            <div className="testimonial-header">
              <div className="testimonial-author">
                <h4>{testimonial.author}</h4>
                <p className="testimonial-role">{testimonial.role}</p>
              </div>
              <div className="testimonial-rating">
                {"★".repeat(testimonial.rating)}
                {"☆".repeat(5 - testimonial.rating)}
              </div>
            </div>
            <div className="testimonial-content">
              <p>{testimonial.content}</p>
            </div>
            <div className="testimonial-date">
              {new Date(testimonial.date).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
