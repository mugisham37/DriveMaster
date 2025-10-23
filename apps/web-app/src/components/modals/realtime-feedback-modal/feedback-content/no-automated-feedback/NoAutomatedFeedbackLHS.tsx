import { NoFeedbackState } from '.'

export function NoAutomatedFeedbackLHS({
  state,
  initialComponent,
  pendingComponent,
  inProgressComponent,
  mentoringRequestFormComponent,
}: {
  state: NoFeedbackState
  initialComponent: React.JSX.Element
  pendingComponent: React.JSX.Element
  inProgressComponent: React.JSX.Element
  mentoringRequestFormComponent: React.JSX.Element
}): React.JSX.Element {
  switch (state) {
    case 'requested':
      return pendingComponent
    case 'in_progress':
      return inProgressComponent
    case 'sendingMentoringRequest':
      return mentoringRequestFormComponent
    default:
      return initialComponent
  }
}
