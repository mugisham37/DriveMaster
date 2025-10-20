import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'

export const metadata: Metadata = {
  title: 'Community - Exercism',
  description: 'Join our vibrant community of programmers. Connect, learn, and grow together.',
}

// Mock data - in real implementation, this would come from API
const mockForumThreads = [
  {
    id: 1,
    title: 'Best practices for Ruby metaprogramming',
    url: 'https://forum.exercism.org/t/best-practices-for-ruby-metaprogramming/1234',
    posterUsername: 'rubydev123',
    posterAvatarUrl: '/assets/avatars/default.svg',
    postsCount: 15
  },
  {
    id: 2,
    title: 'JavaScript async/await vs Promises',
    url: 'https://forum.exercism.org/t/javascript-async-await-vs-promises/5678',
    posterUsername: 'jsmaster',
    posterAvatarUrl: '/assets/avatars/default.svg',
    postsCount: 23
  }
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
  }
]

const mockSupporterAvatars = [
  '/assets/avatars/supporter-1.svg',
  '/assets/avatars/supporter-2.svg',
  '/assets/avatars/supporter-3.svg',
  '/assets/avatars/supporter-4.svg',
  '/assets/avatars/supporter-5.svg'
]

export default function CommunityPage() {
  return (
    <div id="page-community">
      <header>
        <div className="lg-container mt-40 relative">
          <div className="flex items-start gap-128 mb-60">
            <div className="block">
              <GraphicalIcon icon="community" className="h-[48px] w-[48px] mb-8" />
              <h1 className="text-h1 mb-8">Join our community</h1>
              <p className="text-p-xlarge leading-150 mb-8">
                Connect with fellow programmers, share your journey, and learn from others in our supportive community.
              </p>
              <p className="text-p-xlarge leading-150 mb-20">
                <strong>
                  Whether you're just starting out or you're an experienced developer, there's a place for you here.
                </strong>
              </p>

              <div className="flex flex-col sm:flex-row gap-12 mb-20">
                <Link 
                  href="https://discord.gg/exercism" 
                  className="btn-primary btn-l sm:w-[fit-content]"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <GraphicalIcon icon="external-site-discord" className="!filter-none" />
                  <span>Join our Discord</span>
                </Link>

                <Link 
                  href="https://forum.exercism.org" 
                  className="btn-enhanced btn-l sm:w-[fit-content]"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Visit our Forum</span>
                  <GraphicalIcon icon="arrow-right" />
                </Link>
              </div>

              <div className="text-warning font-semibold leading-150 flex items-center mb-8 py-6 px-12">
                <GraphicalIcon icon="sparkle" className="filter-warning w-[16px] h-[16px] mr-8" />
                Recent forum topics
              </div>

              {mockForumThreads.map((thread) => (
                <Link 
                  key={thread.id}
                  href={thread.url} 
                  className="flex items-center bg-backgroundColorA px-20 py-12 shadow-smZ1 rounded-8 mb-8"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image 
                    src={thread.posterAvatarUrl} 
                    alt="" 
                    width={32}
                    height={32}
                    className="mr-8 h-[32px] w-[32px] rounded-circle" 
                  />
                  <div className="flex flex-col mr-auto">
                    <h5 className="text-h5">{thread.title}</h5>
                    <div className="text-textColor6 leading-150">
                      Latest post by {thread.posterUsername}
                    </div>
                  </div>
                  <div className="message-count">
                    <GraphicalIcon icon="message-bubble-square" />
                    {thread.postsCount}
                  </div>
                </Link>
              ))}
            </div>

            <Image 
              src="/assets/screenshots/forum.webp" 
              width={620} 
              height={432} 
              alt="" 
              className="rounded-8 w-fill hidden xl:block w-[45%] flex-shrink-0 max-w-[620px] mt-[-16px]" 
            />
          </div>

          <div className="flex flex-col lg:flex-row gap-y-32 gap-x-96 mb-48">
            <div className="block">
              <GraphicalIcon icon="podcast-gradient" className="h-[48px] w-[48px] mb-16" />
              <h2 className="text-h2 mb-8">Community Stories</h2>
              <p className="mb-24 text-p-large text-textColor5">
                Hear from our community members about their programming journeys, career changes, and success stories.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
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

              <Link href="/community/stories" className="explore-link mt-32">
                Explore more Community Stories
              </Link>
            </div>

            <div className="flex flex-col bg-backgroundColorA shadow-baseZ1 sm:p-32 p-24 rounded-8 shrink-[3] sm:min-w-[440px] w-100" style={{ height: 'fit-content' }}>
              <div className="flex flex-wrap pb-16 mb-24 w-fill">
                {mockSupporterAvatars.map((avatarUrl, index) => (
                  <Image 
                    key={index}
                    src={avatarUrl} 
                    width={48}
                    height={48}
                    alt=""
                    className="h-[48px] w-[48px] mb-[-16px] mr-[-12px] rounded-circle" 
                  />
                ))}
              </div>
              <h2 className="text-h2 mb-8">Help us grow</h2>
              <p className="mb-24 text-p-large text-textColor5">
                Exercism is entirely funded by donations. 
                <strong className="text-textColor1"> Help us keep it free for everyone.</strong>
              </p>

              <div className="flex">
                <Link href="/donate" className="btn-default btn-m border-textColor1">
                  Donate
                  <GraphicalIcon icon="arrow-right" className="filter-textColor1" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="lg-container">
        <div className="sm:p-40 p-24 bg-backgroundColorA shadow-lgZ1 rounded-16 mb-64">
          <h2 className="text-h2 mb-8">Community Videos</h2>
          <p className="text-p-large text-textColor5 mb-24">
            Watch interviews, tutorials, and live coding sessions from our community.
          </p>
          <Link href="/community/videos" className="btn-enhanced btn-m">
            View all videos
            <GraphicalIcon icon="arrow-right" />
          </Link>
        </div>

        <div className="flex items-center mb-32 justify-between">
          <h2 className="text-h2 flex items-center">
            <GraphicalIcon icon="contributors-gradient" className="mr-24" />
            Contributors
          </h2>
        </div>

        <div className="contributors-list">
          <div className="container">
            <p className="text-p-large text-textColor5 mb-24">
              Exercism is built by thousands of contributors who create exercises, maintain tracks, and help fellow programmers.
            </p>
            <Link href="/contributing/contributors" className="btn-enhanced btn-m">
              View all contributors
              <GraphicalIcon icon="arrow-right" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}