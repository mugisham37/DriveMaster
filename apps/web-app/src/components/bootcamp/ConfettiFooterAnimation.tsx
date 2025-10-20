'use client'

import { useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver'

interface ConfettiFooterAnimationProps {
  triggerSelector?: string
  className?: string
}

export function ConfettiFooterAnimation({ 
  triggerSelector = '.linkedin',
  className = ''
}: ConfettiFooterAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const confettiInstanceRef = useRef<confetti.CreateTypes | null>(null)
  const triggerElementRef = useRef<HTMLElement | null>(null)
  
  const { ref: intersectionRef, isIntersecting } = useIntersectionObserver({
    triggerOnce: true
  })

  // Create canvas and confetti instance
  useEffect(() => {
    const createCanvas = () => {
      const confettiCanvas = document.createElement('canvas')
      confettiCanvas.style.position = 'fixed'
      confettiCanvas.style.top = '0'
      confettiCanvas.style.left = '0'
      confettiCanvas.style.width = '100%'
      confettiCanvas.style.height = '100%'
      confettiCanvas.style.pointerEvents = 'none'
      confettiCanvas.style.zIndex = '9999'
      document.body.appendChild(confettiCanvas)
      return confettiCanvas
    }

    canvasRef.current = createCanvas()
    confettiInstanceRef.current = confetti.create(canvasRef.current, { resize: true })

    return () => {
      if (canvasRef.current) {
        document.body.removeChild(canvasRef.current)
      }
    }
  }, [])

  // Find trigger element and set up intersection observer
  useEffect(() => {
    const triggerElement = document.querySelector(triggerSelector) as HTMLElement
    if (triggerElement) {
      triggerElementRef.current = triggerElement
      intersectionRef.current = triggerElement
    }
  }, [triggerSelector, intersectionRef])

  // Launch confetti when intersecting
  useEffect(() => {
    if (!isIntersecting || !confettiInstanceRef.current) return

    const launchConfetti = () => {
      const duration = 300 // in ms
      const end = Date.now() + duration
      const colors = ['#FE3C00', '#AFC8F3', '#4C2E55', '#E9DE3F', '#BEEEAB']

      const createConfetti = (originX: number) => {
        confettiInstanceRef.current!({
          particleCount: 7,
          angle: originX === 0 ? 60 : 120,
          spread: 50,
          origin: { x: originX, y: 1 },
          colors: colors,
        })
      }

      const frame = () => {
        createConfetti(0)
        createConfetti(1)

        if (Date.now() < end) {
          requestAnimationFrame(frame)
        }
      }

      frame()
    }

    launchConfetti()
  }, [isIntersecting])

  return (
    <div className={className}>
      {/* This component manages the confetti animation but doesn't render visible content */}
    </div>
  )
}