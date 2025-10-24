import Link from 'next/link'
import Image from 'next/image'
import { MentorDiscussion } from '@/types/index'
import { Avatar } from '@/components/common/Avatar'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'
import { ProminentLink } from '@/components/common/ProminentLink'

interface MentoringInboxSectionProps {
  discussions: MentorDiscussion[]
}

export function MentoringInboxSection({ discussions }: MentoringInboxSectionProps) {
  // Mock mentored track icons (this would come from API)
  const trackIconUrls = [
    '/assets/tracks/javascript.svg',
    '/assets/tracks/python.svg',
    '/assets/tracks/ruby.svg',
    '/assets/tracks/java.svg',
    '/assets/tracks/csharp.svg',
    '/assets/tracks/go.svg'
  ]

  const timeAgoInWords = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  return (
    <section className="mentoring-section">
      <div className="flex items-center mb-12">
        <h3 className="text-h3">Mentoring Inbox</h3>
        <div className="track-icons ml-auto">
          {trackIconUrls.map((iconUrl, index) => (
            <Image
              key={index}
              src={iconUrl}
              alt=""
              width={24}
              height={24}
              className="c-icon c-track-icon"
            />
          ))}
        </div>
      </div>

      <div className="discussions">
        {discussions.map((discussion) => (
          <Link
            key={discussion.uuid}
            href={discussion.links.self}
            aria-label={`Discussion with ${discussion.student.handle}`}
            className="c-mentor-discussion-summary"
          >
            <Avatar user={{
              ...discussion.student,
              flair: discussion.student.flair as string | undefined
            }} />
            
            <div className="info">
              <div className="handle">{discussion.student.handle}</div>
              <div className="exercise">
                {discussion.exercise.title} on {discussion.track.title}
              </div>
            </div>
            
            <time>{timeAgoInWords(discussion.updatedAt)}</time>
            
            <GraphicalIcon icon="chevron-right" className="action-icon" />
          </Link>
        ))}
      </div>

      <ProminentLink link="/mentoring/inbox" text="See all mentoring" />
    </section>
  )
}