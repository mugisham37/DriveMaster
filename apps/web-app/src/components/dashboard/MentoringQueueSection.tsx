import Link from 'next/link'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'

export function MentoringQueueSection() {
  return (
    <section className="c-zero-section">
      <GraphicalIcon icon="person-celebrating" category="graphics" />

      <h3>Students are waiting!</h3>
      <p>
        There are students in the mentoring queue waiting for your help. 
        Jump in and start mentoring!
      </p>
      
      <Link href="/mentoring/queue" className="btn-default btn-s">
        View Queue
      </Link>
    </section>
  )
}