import React, { useEffect, useState } from 'react'

interface LoadingBarProps {
  animationDuration?: number
  className?: string
}

export function LoadingBar({ 
  animationDuration = 5, 
  className = '' 
}: LoadingBarProps): React.JSX.Element {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          return 0 // Reset to create continuous animation
        }
        return prev + (100 / (animationDuration * 10)) // Update every 100ms
      })
    }, 100)

    return () => clearInterval(interval)
  }, [animationDuration])

  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
      <div 
        className="bg-blue-600 h-2 rounded-full transition-all duration-100 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}