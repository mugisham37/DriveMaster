import React from 'react'
import IterationSummaryWithWebsockets from '../../track/IterationSummary'
import { Iteration } from '../../types'

export default function LatestIterationLink({
  iteration,
}: {
  iteration: Iteration
}): React.ReactElement {
  return (
    <a className="latest-iteration-link" href={iteration.links.self}>
      <IterationSummaryWithWebsockets
        iteration={iteration}
        showSubmissionMethod={true}
        showTestsStatusAsButton={false}
        showFeedbackIndicator={true}
        showTimeStamp={false}
      />
    </a>
  )
}
