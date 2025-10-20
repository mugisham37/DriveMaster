'use client'

import React from 'react'
import Link from 'next/link'

interface BootcampConcept {
  id: number
  slug: string
  title: string
  description: string
  links: {
    self: string
  }
}

interface ConceptWidgetProps {
  concept: BootcampConcept
  className?: string
}

export function ConceptWidget({
  concept,
  className = ''
}: ConceptWidgetProps): React.JSX.Element {
  return (
    <Link 
      href={concept.links.self}
      className={`c-concept-widget ${className}`}
    >
      <div className="title">{concept.title}</div>
      <div className="description">{concept.description}</div>
    </Link>
  )
}

export default ConceptWidget