'use client'

import React from 'react'

interface ConceptWidgetProps {
  concept: {
    slug: string
    name: string
    blurb: string
    links: {
      self: string
    }
  }
}

export function ConceptWidget({ concept }: ConceptWidgetProps): JSX.Element {
  return (
    <div className="concept-widget border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <h4 className="font-semibold text-lg mb-2">{concept.name}</h4>
      <p className="text-gray-600 text-sm mb-3">{concept.blurb}</p>
      <a 
        href={concept.links.self}
        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
      >
        Learn more →
      </a>
    </div>
  )
}

export default ConceptWidget