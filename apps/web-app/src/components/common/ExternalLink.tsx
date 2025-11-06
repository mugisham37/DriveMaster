'use client'

import React from 'react'

interface ExternalLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

/**
 * Basic ExternalLink component
 */
export function ExternalLink({ href, children, className = '' }: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  )
}

export default ExternalLink