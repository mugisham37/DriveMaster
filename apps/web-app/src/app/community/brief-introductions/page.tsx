import { Metadata } from 'next'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'
import { YoutubePlayer } from '@/components/common/YoutubePlayer'

export const metadata: Metadata = {
  title: 'Brief Introductions - Exercism',
  description: 'Quick introductions to programming concepts, languages, and tools.',
}

// Mock data - in real implementation, this would come from API
const mockLatestId = 'dQw4w9WgXcQ'
const mockVideoIds = [
  'oHg5SJYRHA0',
  'kJQP7kiw5Fk',
  'dQw4w9WgXcQ',
  'ScMzIvxBSi4',
  'y8Kyi0WNg40',
  'Ks-_Mh1QhMc'
]

export default function BriefIntroductionsPage() {
  return (
    <div id="page-community">
      <header>
        <div className="lg-container relative">
          <div className="flex lg:flex-row flex-col items-start pt-40 lg:gap-128 gap-64 mb-40">
            <div className="block">
              <GraphicalIcon icon="brief-introductions-gradient" className="h-[48px] w-[48px] mb-8" />
              <h1 className="text-h1 mb-8">Brief Introductions</h1>
              <p className="text-p-xlarge leading-150 mb-8">
                Quick, focused videos introducing programming concepts, languages, and tools. 
                Perfect for getting a taste of something new or refreshing your knowledge.
              </p>
              <p className="text-p-xlarge leading-150 mb-8">
                Each video is designed to be concise and informative, giving you just enough 
                to understand the basics and decide if you want to dive deeper.
              </p>
            </div>

            <div className="flex-shrink-0 lg:w-[400px] w-100">
              <YoutubePlayer 
                videoId={mockLatestId} 
                context="brief_introductions" 
              />
            </div>
          </div>
        </div>
      </header>

      <hr className="border-borderColor6" />

      <div className="lg-container relative">
        <div className="grid lg:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-24 pt-40">
          {mockVideoIds.map((id) => (
            <YoutubePlayer 
              key={id}
              videoId={id} 
              context="brief_introductions" 
            />
          ))}
        </div>
      </div>
    </div>
  )
}