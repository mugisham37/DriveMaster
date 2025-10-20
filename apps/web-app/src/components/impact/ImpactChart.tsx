import React, { useEffect, useState, useRef } from 'react'

interface Milestone {
  date: string
  text: string
  emoji: string
}

interface ImpactChartProps {
  usersPerMonth: string
  milestones: string
}

export function ImpactChart({ usersPerMonth, milestones }: ImpactChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // In a real implementation, this would use Chart.js
    // For now, we'll create a placeholder
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        // Simple placeholder chart
        ctx.fillStyle = '#6366f1'
        ctx.fillRect(0, 400, 680, 80)
        
        // Add some sample data points
        const data = JSON.parse(usersPerMonth)
        const keys = Object.keys(data)
        const values = Object.values(data) as number[]
        
        ctx.strokeStyle = '#8b5cf6'
        ctx.lineWidth = 2
        ctx.beginPath()
        
        keys.forEach((key, index) => {
          const x = (index / keys.length) * 680
          const y = 400 - (values[index] / Math.max(...values)) * 300
          
          if (index === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        })
        
        ctx.stroke()
        setIsLoaded(true)
      }
    }
  }, [usersPerMonth, milestones])

  return (
    <div className="impact-chart relative">
      <canvas 
        ref={canvasRef}
        width={680}
        height={480}
        className="w-full h-full"
      />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white">Loading chart...</div>
        </div>
      )}
    </div>
  )
}