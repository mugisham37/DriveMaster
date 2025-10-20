import Link from 'next/link'
import { User, CommunitySolution } from '@/types'
import { Profile } from '@/lib/api/profile'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'
import { ProminentLink } from '@/components/common/ProminentLink'
import { CommunitySolutionComponent } from '@/components/common/CommunitySolution'

interface PublishedSolutionsSectionProps {
  user: User & { numPublishedSolutions: number }
  profile: Profile
  solutions: CommunitySolution[]
}

export function PublishedSolutionsSection({ 
  user, 
  profile, 
  solutions 
}: PublishedSolutionsSectionProps) {
  return (
    <section className="published-solutions-section">
      <div className="lg-container container">
        <header className="section-header">
          <GraphicalIcon icon="community-solutions" hex />
          <h2 
            className="published-solutions" 
            data-total-count={user.numPublishedSolutions}
          >
            Published Solutions
          </h2>
          <hr className="c-divider" />
        </header>

        <div className="solutions">
          {solutions.map((solution) => (
            <CommunitySolutionComponent
              key={solution.uuid}
              solution={solution}
              context="profile"
            />
          ))}
        </div>

        {profile.solutionsTab && (
          <ProminentLink href={`/profiles/${profile.handle}/solutions`}>
            See all solutions by {user.name || user.handle}
          </ProminentLink>
        )}
      </div>
    </section>
  )
}