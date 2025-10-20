import Link from 'next/link'
import { Track, Concept } from '@/types'
import { ConceptIcon } from '@/components/common/ConceptIcon'

interface TrackConceptsProps {
  track: Track
  concepts: Concept[]
}

export function TrackConcepts({ concepts }: TrackConceptsProps) {
  return (
    <section className="track-concepts">
      <h2>Concepts</h2>
      
      <div className="concepts-grid">
        {concepts.map((concept) => (
          <Link
            key={concept.slug}
            href={concept.links.self}
            className="concept-card"
          >
            <ConceptIcon name={concept.name} size="large" />
            <h3 className="concept-name">{concept.name}</h3>
          </Link>
        ))}
      </div>
    </section>
  )
}