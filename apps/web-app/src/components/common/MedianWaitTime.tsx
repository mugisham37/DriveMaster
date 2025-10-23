import React from 'react'

interface MedianWaitTimeProps {
  waitTime: string | number
  className?: string
}

export function MedianWaitTime({ 
  waitTime, 
  className = '' 
}: MedianWaitTimeProps): React.JSX.Element {
  const formatWaitTime = (time: string | number): string => {
    if (typeof time === 'number') {
      // Convert minutes to human readable format
      if (time < 60) {
        return `${time} minutes`
      } else if (time < 1440) {
        const hours = Math.floor(time / 60)
        const minutes = time % 60
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
      } else {
        const days = Math.floor(time / 1440)
        return `${days} days`
      }
    }
    return time.toString()
  }

  return (
    <span className={`median-wait-time ${className}`}>
      {formatWaitTime(waitTime)}
    </span>
  )
}