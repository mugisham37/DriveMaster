import React from 'react'
import { Iteration, IterationStatus } from '@/components/types'
import { ProcessingStatusSummary } from '../../common/ProcessingStatusSummary'
import { TestRunStatusButton } from './TestRunStatusButton'

export const ProcessingStatusButton = ({
  iteration,
}: {
  iteration: Iteration
}): React.JSX.Element => {
  const status = iteration.status || IterationStatus.PROCESSING
  switch (status) {
    case IterationStatus.DELETED:
      return <></>
    case IterationStatus.TESTS_FAILED:
    case IterationStatus.ESSENTIAL_AUTOMATED_FEEDBACK:
    case IterationStatus.ACTIONABLE_AUTOMATED_FEEDBACK:
    case IterationStatus.NON_ACTIONABLE_AUTOMATED_FEEDBACK:
    case IterationStatus.CELEBRATORY_AUTOMATED_FEEDBACK:
    case IterationStatus.NO_AUTOMATED_FEEDBACK:
      return (
        <TestRunStatusButton endpoint={iteration.links.testRun || iteration.links.tests}>
          <ProcessingStatusSummary iterationStatus={status} />
        </TestRunStatusButton>
      )
    default:
      return <ProcessingStatusSummary iterationStatus={status} />
  }
}
