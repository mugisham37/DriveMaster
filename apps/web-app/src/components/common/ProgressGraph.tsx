'use client'

import React, { useRef, useEffect } from 'react'

interface ProgressGraphProps {
  values: number[]
  height: number
  width: number
  className?: string
  color?: string
  backgroundColor?: string
}

export function ProgressGraph({
  values,
  height,
  width,
  className = '',
  color = '#3b82f6',
  backgroundColor = '#f3f4f6'
}: ProgressGraphProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || values.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Set up canvas
    canvas.width = width
    canvas.height = height

    // Calculate dimensions
    const padding = 10
    const graphWidth = width - (padding * 2)
    const graphHeight = height - (padding * 2)
    
    const maxValue = Math.max(...values)
    const minValue = Math.min(...values)
    const valueRange = maxValue - minValue || 1

    // Draw background
    ctx.fillStyle = backgroundColor
    ctx.fillRect(padding, padding, graphWidth, graphHeight)

    // Draw grid lines
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding + (graphHeight / 4) * i
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(padding + graphWidth, y)
      ctx.stroke()
    }

    // Vertical grid lines
    const stepX = graphWidth / (values.length - 1 || 1)
    for (let i = 0; i < values.length; i++) {
      const x = padding + stepX * i
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, padding + graphHeight)
      ctx.stroke()
    }

    // Draw progress line
    if (values.length > 1) {
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()

      values.forEach((value, index) => {
        const x = padding + (graphWidth / (values.length - 1)) * index
        const normalizedValue = (value - minValue) / valueRange
        const y = padding + graphHeight - (normalizedValue * graphHeight)

        if (index === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })

      ctx.stroke()

      // Draw data points
      ctx.fillStyle = color
      values.forEach((value, index) => {
        const x = padding + (graphWidth / (values.length - 1)) * index
        const normalizedValue = (value - minValue) / valueRange
        const y = padding + graphHeight - (normalizedValue * graphHeight)

        ctx.beginPath()
        ctx.arc(x, y, 3, 0, 2 * Math.PI)
        ctx.fill()
      })
    }

    // Draw area under curve
    if (values.length > 1 && values[0] !== undefined) {
      ctx.fillStyle = color + '20' // Add transparency
      ctx.beginPath()
      
      // Start from bottom left
      const firstX = padding
      const firstValue = (values[0] - minValue) / valueRange
      const firstY = padding + graphHeight - (firstValue * graphHeight)
      ctx.moveTo(firstX, padding + graphHeight)
      ctx.lineTo(firstX, firstY)

      // Draw the curve
      values.forEach((value, index) => {
        const x = padding + (graphWidth / (values.length - 1)) * index
        const normalizedValue = (value - minValue) / valueRange
        const y = padding + graphHeight - (normalizedValue * graphHeight)
        ctx.lineTo(x, y)
      })

      // Close the area
      const lastX = padding + graphWidth
      ctx.lineTo(lastX, padding + graphHeight)
      ctx.closePath()
      ctx.fill()
    }

  }, [values, height, width, color, backgroundColor])

  return (
    <div className={`progress-graph ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: `${width}px`, height: `${height}px` }}
      />
    </div>
  )
}

export default ProgressGraph
