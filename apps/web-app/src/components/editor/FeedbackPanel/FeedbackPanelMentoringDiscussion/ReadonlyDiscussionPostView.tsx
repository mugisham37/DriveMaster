import React from 'react'
import { shortFromNow } from '@/utils/time'
import { Avatar } from '@/components/common'
// Define DiscussionPostProps locally since the import is not available
type DiscussionPostProps = {
  uuid: string
  iterationIdx: number
  authorHandle: string
  authorAvatarUrl: string
  contentHtml: string
  updatedAt: string
}
import { ReadonlyIterationMarker } from '.'

export function ReadonlyDiscussionPostView({
  post,
  className = '',
  prevIterationIdx,
}: {
  post: DiscussionPostProps
  className?: string
  prevIterationIdx: number
}): React.JSX.Element {
  const classNames = ['post', 'timeline-entry', className].filter(
    (c) => c.length > 0
  )

  return (
    <>
      {prevIterationIdx === post.iterationIdx ? null : (
        <ReadonlyIterationMarker idx={post.iterationIdx} />
      )}
      <div className={classNames.join(' ')}>
        <Avatar
          handle={post.authorHandle}
          src={post.authorAvatarUrl}
          className="timeline-marker"
        />
        <div className="timeline-content">
          <header className="timeline-entry-header">
            <div className="author">{post.authorHandle}</div>
            <time>{shortFromNow(post.updatedAt)}</time>
          </header>
          <div dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
        </div>
      </div>
    </>
  )
}
