import React from 'react'
import Link from 'next/link'
import { PullRequest } from '@/types'

export function PullRequestWidget(pullRequest: PullRequest): JSX.Element {
  return (
    <div className="pull-request-widget">
      <Link href={pullRequest.url} className="flex items-center">
        <span className="text-sm text-textColor6">
          PR #{pullRequest.number}: {pullRequest.title}
        </span>
      </Link>
      <div className="text-xs text-textColor6">
        Merged {new Date(pullRequest.mergedAt).toLocaleDateString()} by {pullRequest.mergedBy}
      </div>
    </div>
  )
}