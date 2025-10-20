import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Community Stories - Exercism',
  description: 'Read inspiring stories from our community members about their programming journeys.',
}

// Mock data - in real implementation, this would come from API
const mockCommunityStories = [
  {
    id: 1,
    slug: 'from-bootcamp-to-senior-dev',
    title: 'From Bootcamp to Senior Developer',
    thumbnailUrl: '/assets/community/story-1.jpg',
    interviewee: {
      name: 'Sarah Chen',
      avatarUrl: '/assets/avatars/sarah.svg'
    }
  },
  {
    id: 2,
    slug: 'career-change-at-40',
    title: 'Career Change at 40: My Programming Journey',
    thumbnailUrl: '/assets/community/story-2.jpg',
    interviewee: {
      name: 'Mike Rodriguez',
      avatarUrl: '/assets/avatars/mike.svg'
    }
  },
  {
    id: 3,
    slug: 'self-taught-success',
    title: 'Self-Taught Success: Learning to Code Online',
    thumbnailUrl: '/assets/community/story-3.jpg',
    interviewee: {
      name: 'Emma Johnson',
      avatarUrl: '/assets/avatars/emma.svg'
    }
  },
  {
    id: 4,
    slug: 'from-teacher-to-developer',
    title: 'From Teacher to Developer: A Career Transition',
    thumbnailUrl: '/assets/community/story-4.jpg',
    interviewee: {
      name: 'David Kim',
      avatarUrl: '/assets/avatars/david.svg'
    }
  },
  {
    id: 5,
    slug: 'open-source-contributor',
    title: 'How I Became an Open Source Contributor',
    thumbnailUrl: '/assets/community/story-5.jpg',
    interviewee: {
      name: 'Alex Thompson',
      avatarUrl: '/assets/avatars/alex.svg'
    }
  },
  {
    id: 6,
    slug: 'remote-work-journey',
    title: 'My Journey to Remote Work as a Developer',
    thumbnailUrl: '/assets/community/story-6.jpg',
    interviewee: {
      name: 'Lisa Wang',
      avatarUrl: '/assets/avatars/lisa.svg'
    }
  }
]

export default function CommunityStoriesPage() {
  return (
    <div className="lg-container py-40">
      <h2 className="text-h2 mb-8">Community Stories</h2>
      <p className="mb-24 text-p-large text-textColor5">
        Hear from our community members about their programming journeys, career changes, and success stories.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        {mockCommunityStories.map((story) => (
          <Link 
            key={story.id}
            href={`/community/stories/${story.slug}`} 
            className="flex flex-col shadow-sm p-16 bg-backgroundColorA rounded-8"
          >
            <Image 
              src={story.thumbnailUrl} 
              width={243}
              height={136}
              alt=""
              className="bg-borderLight rounded-8 mb-12 w-[100%]" 
            />
            <h5 className="text-h5 mb-8">{story.title}</h5>
            <div className="flex items-center text-left text-textColor6 font-semibold mt-auto">
              <Image 
                src={story.interviewee.avatarUrl}
                width={24}
                height={24}
                alt=""
                className="h-[24px] w-[24px] mr-8 rounded-circle bg-cover"
              />
              {story.interviewee.name}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}