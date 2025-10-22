import { Metadata } from 'next'
import { StarButton, CommentsList } from '@/components/community-solutions'

export const metadata: Metadata = {
  title: 'Community Solutions Demo - Exercism',
  description: 'Demo page for community solutions components',
}

// Mock data for demonstration
const mockLinks = {
  star: '/api/solutions/mock-uuid/star',
  create: '/api/solutions/mock-uuid/comments',
  changeIteration: '/api/solutions/mock-uuid/change-iteration',
  unpublish: '/api/solutions/mock-uuid/unpublish',
  enable: '/api/solutions/mock-uuid/comments/enable',
  disable: '/api/solutions/mock-uuid/comments/disable',
}

const mockRequest = {
  endpoint: '/api/solutions/mock-uuid/comments',
  query: {},
  options: {},
}

export default function CommunitySolutionsDemoPage() {
  return (
    <div className="lg-container py-40">
      <h1 className="text-h1 mb-8">Community Solutions Components Demo</h1>
      <p className="text-p-large text-textColor5 mb-32">
        This page demonstrates the migrated community solutions components including StarButton and CommentsList.
      </p>

      <div className="bg-backgroundColorA p-32 rounded-16 mb-32">
        <h2 className="text-h2 mb-16">Star Button Component</h2>
        <p className="text-p-base mb-16">
          The StarButton allows users to favorite/star community solutions:
        </p>
        
        <div className="flex gap-16 items-center">
          <StarButton
            userSignedIn={true}
            defaultNumStars={42}
            defaultIsStarred={false}
            links={{ star: mockLinks.star }}
          />
          
          <StarButton
            userSignedIn={true}
            defaultNumStars={15}
            defaultIsStarred={true}
            links={{ star: mockLinks.star }}
          />
          
          <StarButton
            userSignedIn={false}
            defaultNumStars={8}
            defaultIsStarred={false}
            links={{ star: mockLinks.star }}
          />
        </div>
      </div>

      <div className="bg-backgroundColorA p-32 rounded-16">
        <h2 className="text-h2 mb-16">Comments List Component</h2>
        <p className="text-p-base mb-16">
          The CommentsList provides a complete commenting system for solutions:
        </p>
        
        <CommentsList
          defaultAllowComments={true}
          isAuthor={true}
          userSignedIn={true}
          request={mockRequest}
          links={mockLinks}
        />
      </div>
    </div>
  )
}