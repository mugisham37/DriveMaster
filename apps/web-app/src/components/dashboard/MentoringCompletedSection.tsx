import { GraphicalIcon } from '@/components/common/GraphicalIcon'

export function MentoringCompletedSection() {
  return (
    <section className="c-zero-section">
      <GraphicalIcon icon="person-celebrating" category="graphics" />

      <h3>You&apos;re all caught up!</h3>
      <p>
        Great job! You&apos;ve helped all the students in your mentoring queue. 
        Check back later for more mentoring opportunities.
      </p>
    </section>
  )
}