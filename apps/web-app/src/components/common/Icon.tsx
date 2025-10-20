'use client'

import React from 'react'

interface IconProps {
  icon: string
  alt?: string
  className?: string
}

export function Icon({ icon, alt, className = '' }: IconProps): JSX.Element {
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