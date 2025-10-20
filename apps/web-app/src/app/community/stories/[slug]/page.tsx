import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'
import { VideoLength } from '@/components/community/VideoLength'

interface Props {
  params: { slug: string }
}

// Mock data - in real implementation, this would come from API
const getStoryBySlug = (slug: string) => {
  const stories = {
    'from-bootcamp-to-senior-dev': {
      id: 1,
      slug: 'from-bootcamp-to-senior-dev',
      title: 'From Bootcamp to Senior Developer',
      blurb: 'Sarah shares her incredible journey from a coding bootcamp graduate to becoming a senior developer at a Fortune 500 company.',
      thumbnailUrl: '/assets/community/story-1.jpg',
      youtubeId: 'dQw4w9WgXcQ',
      youtubeExternalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      youtubeEmbedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      lengthInMinutes: 45,
      interviewer: {
        name: 'Jeremy Walker',
        avatarUrl: '/assets/avatars/jeremy.svg'
      },
      interviewee: {
        name: 'Sarah Chen',
        avatarUrl: '/assets/avatars/sarah.svg'
      },
      contentHtml: `
        <p>In this inspiring interview, Sarah Chen shares her remarkable journey from attending a coding bootcamp to becoming a senior developer at a Fortune 500 company in just three years.</p>
        
        <h3>Key Takeaways</h3>
        <ul>
          <li>The importance of continuous learning and practice</li>
          <li>How to build a strong portfolio while learning</li>
          <li>Networking strategies that actually work</li>
          <li>Overcoming imposter syndrome in tech</li>
        </ul>
        
        <p>Sarah's story is a testament to the power of dedication, community support, and the right learning resources. She credits Exercism as one of the key platforms that helped her develop her problem-solving skills and gain confidence in multiple programming languages.</p>
      `
    }
  }
  
  return stories[slug as keyof typeof stories] || null
}

const getOtherStories = (currentSlug: string) => [
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
  }
].filter(story => story.slug !== currentSlug)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const story = getStoryBySlug(params.slug)
  
  if (!story) {
    return {
      title: 'Story Not Found - Exercism',
      description: 'The requested community story could not be found.'
    }
  }

  return {
    title: `${story.title} - Community Stories - Exercism`,
    description: story.blurb,
    openGraph: {
      title: story.title,
      description: story.blurb,
      images: [story.thumbnailUrl]
    }
  }
}

export default function CommunityStoryPage({ params }: Props) {
  const story = getStoryBySlug(params.slug)
  
  if (!story) {
    return (
      <div className="lg-container py-40">
        <h1 className="text-h1 mb-8">Story Not Found</h1>
        <p className="text-p-large mb-8">The requested community story could not be found.</p>
        <Link href="/community/stories" className="btn-primary btn-m">
          Back to Community Stories
        </Link>
      </div>
    )
  }

  const otherStories = getOtherStories(params.slug)

  return (
    <div id="page-community-story">
      <header className="theme-dark pb-128">
        <div className="md-container">
          <Link href="/community" className="back-link">
            <GraphicalIcon icon="arrow-left" className="w-[16px] h-[16px] mr-12 filter-white" />
            Back to Community
          </Link>
          
          <div className="relative">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-64 mb-48">
              <div className="block">
                <div className="flex items-center mb-20">
                  <Image 
                    src={story.interviewer.avatarUrl} 
                    width={64}
                    height={64}
                    alt=""
                    className="w-[64px] h-[64px] rounded-circle mr-[-24px]" 
                  />
                  <Image 
                    src={story.interviewee.avatarUrl} 
                    width={64}
                    height={64}
                    alt=""
                    className="w-[64px] h-[64px] rounded-circle mr-24" 
                  />
                  <GraphicalIcon icon="podcast-gradient" className="h-[32px] w-[32px]" />
                </div>
                
                <h1 className="text-h1 mb-12 text-white">{story.title}</h1>
                <p className="text-p-large mb-28 theme-dark">{story.blurb}</p>
                
                <div className="flex items-center">
                  <Link 
                    href={story.youtubeExternalUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="youtube-link mr-32"
                  >
                    Watch on YouTube
                    <GraphicalIcon icon="new-tab" className="h-[16px] w-[16px] filter-white ml-16" />
                  </Link>

                  <div className="text-label-code-caps text-lightGold whitespace-nowrap">
                    <VideoLength video={{ length_in_minutes: story.lengthInMinutes }} />
                  </div>
                </div>
              </div>

              <div className="relative rounded-8 overflow-hidden flex-grow w-fill lg:max-w-[510px]">
                <iframe 
                  width="560" 
                  height="315" 
                  src={story.youtubeEmbedUrl} 
                  title={story.title} 
                  frameBorder="0" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowFullScreen
                />
              </div>
            </div>

            <div 
              className="c-textual-content --large rounded-12 py-24 px-24 bg-[#5042AD] text-[#F0F3F9]"
              dangerouslySetInnerHTML={{ __html: story.contentHtml }}
            />
          </div>
        </div>
      </header>

      <div className="md-container">
        <div className="bg-backgroundColorA shadow-lg rounded-16 py-20 md:px-32 px-20 md:px-40 mt-[-64px]">
          <div className="flex flex-row mb-24">
            <GraphicalIcon icon="podcast-gradient" className="h-[48px] w-[48px] mr-12" />
            <div className="flex flex-col">
              <h2 className="text-h2 mb-8">More Stories</h2>
              <p className="text-p-large">Discover more inspiring journeys from our community</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            {otherStories.map((otherStory) => (
              <Link 
                key={otherStory.id}
                href={`/community/stories/${otherStory.slug}`} 
                className="flex flex-col grid shadow-smZ1 p-16 bg-backgroundColorA rounded-8"
              >
                <Image 
                  src={otherStory.thumbnailUrl} 
                  width={243}
                  height={136}
                  alt=""
                  className="bg-borderLight rounded-8 mb-12 w-[100%]" 
                />
                <h5 className="text-h5 mb-8">{otherStory.title}</h5>
                <div className="flex items-center text-left text-textColor6 font-semibold mt-auto">
                  <Image 
                    src={otherStory.interviewee.avatarUrl}
                    width={24}
                    height={24}
                    alt=""
                    className="h-[24px] w-[24px] mr-8 rounded-circle bg-cover"
                  />
                  {otherStory.interviewee.name}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}