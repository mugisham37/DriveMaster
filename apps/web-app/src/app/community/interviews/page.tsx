import { Metadata } from 'next'
import Link from 'next/link'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'
import { YoutubePlayer } from '@/components/common/YoutubePlayer'

export const metadata: Metadata = {
  title: 'Community Interviews - Exercism',
  description: 'Watch interviews with language creators, community members, and programming experts.',
}

// Mock data - in real implementation, this would come from API
const mockLanguageCreatorIds = [
  'dQw4w9WgXcQ', // Mock YouTube video IDs
  'oHg5SJYRHA0',
  'kJQP7kiw5Fk'
]

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
  }
]

export default function CommunityInterviewsPage() {
  return (
    <div id="page-community">
      <header>
        <div className="lg-container relative">
          <div className="flex md:flex-row flex-col md:items-center items-left pt-40 xl:gap-128 md:gap-64 gap-32">
            <div className="block">
              <GraphicalIcon icon="brief-introductions-gradient" className="h-[48px] w-[48px] mb-8" />
              <h1 className="text-h1 mb-8">Community Interviews</h1>
              <p className="text-p-xlarge leading-150 mb-8">
                Watch in-depth interviews with programming language creators, community leaders, and inspiring developers.
                <Link 
                  href="mailto:jeremy@exercism.org" 
                  className="text-linkColor font-semibold"
                >
                  Get in touch
                </Link> if you'd like to be featured!
              </p>
            </div>

            <div className="flex-shrink-0 sm:w-[400px] w-100">
              <div className="border-2 border-gradient-lightPurple px-16 py-12 rounded-8">
                <h3 className="text-h4 mb-2">Subscribe & Follow</h3>
                <p className="text-p-base mb-8">
                  Don't miss our latest interviews and community content.
                </p>
                <ul className="text-p-base text-linkColor font-semibold list-disc pl-20">
                  <li>
                    <Link 
                      href="https://www.youtube.com/playlist?list=PLpsileTZltjXMKF5O8rr1tThL6ieAsIEj"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Community Stories on YouTube
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="https://www.youtube.com/playlist?list=PLpsileTZltjVZtQYrTJAxN3ORThziA3Am"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Language Creator Interviews
                    </Link>
                  </li>
                  <li>
                    <Link 
                      href="https://open.spotify.com/show/1xSwCunXSmcARfrCbaGHs1?si=3e3375df62db45aa"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Podcast on Spotify
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </header>

      <hr className="border-borderColor6 my-40" />

      <div className="lg-container relative">
        <h2 className="text-h2 mb-2">Language Creator Interviews</h2>
        <h2 className="text-p-xlarge mb-32">
          Meet the brilliant minds behind your favorite programming languages.
        </h2>
        
        <div className="grid lg:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-24">
          {mockLanguageCreatorIds.map((id) => (
            <YoutubePlayer 
              key={id}
              videoId={id} 
              context="community_interviews" 
            />
          ))}
        </div>
      </div>

      <hr className="border-borderColor6 my-40" />

      <div className="lg-container relative">
        <h2 className="text-h2 mb-2">Community Stories</h2>
        <h2 className="text-p-xlarge mb-20">
          Inspiring journeys from developers in our community.
        </h2>
        
        <div className="grid lg:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-24">
          {mockCommunityStories.map((story) => (
            <Link 
              key={story.id}
              href={`/community/stories/${story.slug}`} 
              className="flex flex-col shadow-sm p-16 bg-backgroundColorA rounded-8"
            >
              <img 
                src={story.thumbnailUrl} 
                className="bg-borderLight rounded-8 mb-12 w-[100%]" 
                width={243} 
                height={136}
                alt=""
              />
              <h5 className="text-h5 mb-8">{story.title}</h5>
              <div className="flex items-center text-left text-textColor6 font-semibold mt-auto">
                <img 
                  src={story.interviewee.avatarUrl}
                  className="h-[24px] w-[24px] mr-8 rounded-circle bg-cover"
                  alt=""
                />
                {story.interviewee.name}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}