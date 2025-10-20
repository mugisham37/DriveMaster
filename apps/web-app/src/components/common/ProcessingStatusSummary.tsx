import { IterationStatus } from '@/types'
import { Icon } from './Icon'

interface ProcessingStatusSummaryProps {
  iterationStatus: IterationStatus
}

export function ProcessingStatusSummary({ iterationStatus }: ProcessingStatusSummaryProps) {
  switch (iterationStatus) {
    case IterationStatus.TESTING:
      return <Icon icon="spinner" alt="Testing" className="processing" />
    case IterationStatus.ANALYZING:
      return <Icon icon="spinner" alt="Analyzing" className="processing" />
    case IterationStatus.ESSENTIAL_AUTOMATED_FEEDBACK:
      return <Icon icon="warning" alt="Essential feedback" className="feedback essential" />
    case IterationStatus.ACTIONABLE_AUTOMATED_FEEDBACK:
      return <Icon icon="info" alt="Actionable feedback" className="feedback actionable" />
    case IterationStatus.CELEBRATORY_AUTOMATED_FEEDBACK:
      return <Icon icon="celebration" alt="Celebratory feedback" className="feedback celebratory" />
    case IterationStatus.NO_AUTOMATED_FEEDBACK:
      return <Icon icon="check" alt="No feedback" className="no-feedback" />
    default:
      return null
  }
}
