import Link from 'next/link'
import { User } from 'next-auth'
import { Badge } from '@/types'
import { Avatar } from '@/components/common/Avatar'
import { HandleWithFlair } from '@/components/common/HandleWithFlair'
import { BadgeMedallion } from '@/components/common/BadgeMedallion'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'

interface DashboardSummaryBarProps {
  user: User
  featuredBadges: Badge[]
  numBadges: number
}

export function DashboardSummaryBar({ 
  user, 
  featuredBadges, 
  numBadges 
}: DashboardSummaryBarProps) {
  const numExtraBadges = numBadges - featuredBadges.length

  return (
    <div className="summary-bar">
      <div className="lg-container container">
        <Avatar 
          user={{
            avatarUrl: user.image || '',
            handle: user.handle || '',
            flair: user.flair?.name as string | undefined
          }} 
        />
        
        <div className="info">
          <div className="handle">
            <HandleWithFlair 
              handle={user.handle || ''} 
              flair={user.flair?.name || ''} 
            />
          </div>
          <div className="extra">{user.name}</div>
        </div>

        <Link href="/journey#journey-content">
          <div className="badges">
            {featuredBadges.map((badge) => (
              <BadgeMedallion 
                key={badge.uuid}
                badge={badge}
              />
            ))}
            {numExtraBadges > 0 && (
              <div className="count">
                +{numExtraBadges} more
              </div>
            )}
          </div>
        </Link>

        <div className="journey">
          <Link href="/journey" className="c-prominent-link --with-bg">
            <GraphicalIcon icon="journey" className="graphic" />
            <span>View Journey</span>
            <GraphicalIcon icon="chevron-right" />
          </Link>
        </div>
      </div>
    </div>
  )
}