import React from 'react'
import { DiscussionActionsLinks } from '@/components/types'

export interface DiscussionActionsProps {
  links: DiscussionActionsLinks
}

export const DiscussionActions: React.FC<DiscussionActionsProps> = ({ links }) => {
  return (
    <div className="discussion-actions">
      {/* Discussion actions implementation */}
    </div>
  )
}

export { DiscussionActionsLinks }
export default DiscussionActions