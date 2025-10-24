import { User } from 'next-auth'
import { StudentTrack } from '@/types'
import { MentorDiscussion } from '@/types/index'
import { LiveEvent, ScheduledEvent } from '@/lib/api/dashboard'
import { LiveEventSection } from './LiveEventSection'
import { FeaturedEventSection } from './FeaturedEventSection'
import { ScheduledEventsSection } from './ScheduledEventsSection'
import { Challenge48in24Section } from './Challenge48in24Section'
import { TracksSection } from './TracksSection'
import { TracksZeroSection } from './TracksZeroSection'
import { MentoringInboxSection } from './MentoringInboxSection'
import { MentoringQueueSection } from './MentoringQueueSection'
import { MentoringCompletedSection } from './MentoringCompletedSection'
import { MentoringZeroSection } from './MentoringZeroSection'

interface DashboardSidebarProps {
  user: User
  liveEvent?: LiveEvent
  featuredEvent?: LiveEvent
  scheduledEvents: ScheduledEvent[]
  userTracks: StudentTrack[]
  numUserTracks: number
  mentorDiscussions: MentorDiscussion[]
  mentorQueueHasRequests: boolean
}

export function DashboardSidebar({
  user,
  liveEvent,
  featuredEvent,
  scheduledEvents,
  userTracks,
  numUserTracks,
  mentorDiscussions,
  mentorQueueHasRequests
}: DashboardSidebarProps) {
  return (
    <div className="rhs">
      {liveEvent && (
        <div className="mb-32">
          <LiveEventSection event={liveEvent} />
        </div>
      )}

      <Challenge48in24Section />

      {featuredEvent && (
        <div className="flex flex-col mb-32">
          <FeaturedEventSection event={featuredEvent} />
        </div>
      )}

      {scheduledEvents.length > 0 && (
        <div className="mb-24">
          <ScheduledEventsSection events={scheduledEvents} />
        </div>
      )}

      {userTracks.length > 0 ? (
        <TracksSection 
          userTracks={userTracks} 
          numUserTracks={numUserTracks} 
        />
      ) : (
        <TracksZeroSection />
      )}

      {user.isMentor ? (
        <>
          {mentorDiscussions.length > 0 ? (
            <MentoringInboxSection discussions={mentorDiscussions} />
          ) : mentorQueueHasRequests ? (
            <MentoringQueueSection />
          ) : (
            <MentoringCompletedSection />
          )}
        </>
      ) : (
        <MentoringZeroSection />
      )}
    </div>
  )
}