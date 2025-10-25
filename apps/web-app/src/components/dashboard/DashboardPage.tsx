'use client'

import { ExercismUser } from '@/lib/auth/config'
import { DashboardData } from '@/lib/api/dashboard'
import { Layout } from '@/components/layout/Layout'
import { DashboardSummaryBar } from './DashboardSummaryBar'
import { DashboardContent } from './DashboardContent'
import { DashboardSidebar } from './DashboardSidebar'
import { WelcomeModal } from '@/components/modals/WelcomeModal'
import { SenioritySurveyModal } from '@/components/modals/SenioritySurveyModal'
import { BegModal } from '@/components/modals/BegModal'

interface DashboardPageProps extends DashboardData {
  user: ExercismUser
}

export function DashboardPage(props: DashboardPageProps) {
  const { user, ...dashboardData } = props

  return (
    <Layout>
      <div id="page-dashboard">
        <WelcomeModal />
        <SenioritySurveyModal />
        <BegModal />

        <DashboardSummaryBar 
          user={user}
          featuredBadges={dashboardData.featuredBadges}
          numBadges={dashboardData.numBadges}
        />

        <article className="lg-container container flex">
          <DashboardContent 
            user={user}
            blogPosts={dashboardData.blogPosts}
            updates={dashboardData.updates}
          />
          
          <DashboardSidebar 
            user={user}
            {...(dashboardData.liveEvent && { liveEvent: dashboardData.liveEvent })}
            {...(dashboardData.featuredEvent && { featuredEvent: dashboardData.featuredEvent })}
            scheduledEvents={dashboardData.scheduledEvents}
            userTracks={dashboardData.userTracks}
            numUserTracks={dashboardData.numUserTracks}
            mentorDiscussions={dashboardData.mentorDiscussions}
            mentorQueueHasRequests={dashboardData.mentorQueueHasRequests}
          />
        </article>
      </div>
    </Layout>
  )
}