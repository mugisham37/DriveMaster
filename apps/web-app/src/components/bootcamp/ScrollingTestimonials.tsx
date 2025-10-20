'use client'

import { useEffect, useRef } from 'react'
import { HamsterAnimation } from './HamsterAnimation'

interface ScrollingTestimonialsProps {
  testimonials: string[]
  showHamster?: boolean
}

export function ScrollingTestimonials({ testimonials, showHamster = true }: ScrollingTestimonialsProps) {
  const marqueeRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!marqueeRef.current || !containerRef.current) return

    const marqueeElement = marqueeRef.current
    const container = containerRef.current

    // Get the width of the marquee content
    const marqueeWidth = marqueeElement.scrollWidth

    // Clone items for seamless looping (preserve exact cloning logic from original)
    const clonedItems = marqueeElement.innerHTML
    marqueeElement.innerHTML = clonedItems + clonedItems

    // Animation configuration (preserve exact values from original)
    const speed = { current: 1, max: 5, min: 1 }
    // This slows the animation down, if we need a slower/faster speed, adjust this value accordingly
    // and keep the speed.min and speed.max values as ratio numbers
    const velocityScale = 0.1
    let animationPosition = 0
    let lastTimestamp: number | null = null

    function animateMarquee(timestamp: number) {
      if (!lastTimestamp) {
        lastTimestamp = timestamp
      }

      const elapsed = timestamp - lastTimestamp
      lastTimestamp = timestamp

      animationPosition += elapsed * speed.current * velocityScale

      if (animationPosition >= marqueeWidth) {
        animationPosition = animationPosition % marqueeWidth
      }

      if (marqueeElement) {
        marqueeElement.style.transform = `translateX(${-animationPosition}px)`
      }

      requestAnimationFrame(animateMarquee)
    }

    const animationId = requestAnimationFrame(animateMarquee)

    // Mouse interaction handlers (preserve exact behavior from original)
    const handleMouseEnter = () => {
      // Animate speed to max value over 500ms with linear easing
      const startSpeed = speed.current
      const targetSpeed = speed.max
      const duration = 500
      const startTime = performance.now()

      function animateSpeed(currentTime: number) {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        speed.current = startSpeed + (targetSpeed - startSpeed) * progress
        
        if (progress < 1) {
          requestAnimationFrame(animateSpeed)
        }
      }
      
      requestAnimationFrame(animateSpeed)
    }

    const handleMouseLeave = () => {
      // Animate speed back to min value over 500ms with linear easing
      const startSpeed = speed.current
      const targetSpeed = speed.min
      const duration = 500
      const startTime = performance.now()

      function animateSpeed(currentTime: number) {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        speed.current = startSpeed + (targetSpeed - startSpeed) * progress
        
        if (progress < 1) {
          requestAnimationFrame(animateSpeed)
        }
      }
      
      requestAnimationFrame(animateSpeed)
    }

    // Add event listeners
    container.addEventListener('mouseenter', handleMouseEnter)
    container.addEventListener('mouseleave', handleMouseLeave)

    // Cleanup function
    return () => {
      cancelAnimationFrame(animationId)
      container.removeEventListener('mouseenter', handleMouseEnter)
      container.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [testimonials])

  return (
    <div ref={containerRef} className="scrolling-testimonials">
      {showHamster && <HamsterAnimation />}
      <div className="inner">
        <ul ref={marqueeRef}>
          {testimonials.map((testimonial, index) => (
            <li key={index}>{testimonial}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}