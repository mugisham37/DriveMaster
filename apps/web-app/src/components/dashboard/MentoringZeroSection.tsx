import Link from 'next/link'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'

export function MentoringZeroSection() {
  return (
    <section className="mentoring-zero-section c-zero-section">
      <GraphicalIcon icon="mentoring" category="graphics" />

      <h3>Become a mentor</h3>
      <p>
        Help others learn by mentoring them through their coding journey. 
        It&apos;s a great way to deepen your own understanding while giving back to the community.
      </p>

      <div className="grid grid-cols-2 gap-20">
        <Link href="/mentoring" className="btn-primary btn-s">
          Try mentoring now
        </Link>
        <Link href="/mentoring" className="btn-default btn-s">
          Learn more
        </Link>
      </div>
    </section>
  )
}