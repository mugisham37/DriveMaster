'use client'

import React from 'react'

interface IconProps {
  icon: string
  alt?: string
  className?: string
  height?: number
  width?: number
}

export function Icon({ icon, alt, className = '', height, width }: IconProps): React.ReactElement {
  return (
    <i 
      className={`c-icon ${className}`}
      aria-label={alt}
      data-icon={icon}
    >
      {/* Icon content would be rendered based on icon type */}
      <span className="sr-only">{alt}</span>
    </i>
  )
}

export default Icon