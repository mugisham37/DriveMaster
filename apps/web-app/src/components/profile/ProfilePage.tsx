'use client'

import { ProfileData } from '@/lib/api/profile'
import { Layout } from '@/components/layout/Layout'
import { ProfileHeader } from './ProfileHeader'
import ContributionsSummary from './ContributionsSummary'
import { PublishedSolutionsSection } from './PublishedSolutionsSection'
import TestimonialsSummary from './TestimonialsSummary'
import { FirstTimeModal } from './FirstTimeModal'

interface ProfilePageProps extends ProfileData {
  isFirstTime?: boolean
}

export function ProfilePage({ 
  user, 
  profile, 
  solutions, 
  isFirstTime = false 
}: ProfilePageProps) {
  return (
    <Layout>
      <div id="page-profile">
        {isFirstTime && <FirstTimeModal profile={profile} links={{ profile: `/profiles/${user.handle}` }} />}
        
        <ProfileHeader 
          user={user} 
          profile={profile} 
          tab="summary" 
        />

        <article>
          <ContributionsSummary user={user} />

          <PublishedSolutionsSection 
            user={user}
            profile={profile}
            solutions={solutions}
          />

          <TestimonialsSummary 
            user={user} 
            profile={profile} 
          />
        </article>
      </div>
    </Layout>
  )
}