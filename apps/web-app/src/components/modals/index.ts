export { BegModal } from './BegModal'
export { SenioritySurveyModal } from './SenioritySurveyModal'
// Remove duplicate WelcomeModal export
export { WelcomeToInsidersModal } from './WelcomeToInsidersModal'
export { default as TrackWelcomeModal } from './TrackWelcomeModal'
export { BadgeModal } from './BadgeModal'
export { CompletedMentoringModal } from './CompletedMentoringModal'
export { DonationConfirmationModal } from './DonationConfirmationModal'
export { ExerciseTooltipModal } from './ExerciseTooltipModal'
export { TrackLeaveModal } from './TrackLeaveModal'
export { TrackResetModal } from './TrackResetModal'
export { PracticeModeModal } from './PracticeModeModal'

// Base Modal component
export { default as Modal } from './Modal'
export type { ModalProps } from './Modal'

// Newly migrated modals
export { ChangePublishedIterationModal } from './ChangePublishedIterationModal'
export { CLIWalkthroughModal } from './CLIWalkthroughModal'
export { ConceptMakersModal } from './ConceptMakersModal'
export { DeleteAccountModal } from './DeleteAccountModal'
export { ExerciseMakersModal } from './ExerciseMakersModal'
export { MentorChangeTracksModal } from './MentorChangeTracksModal'
export { PreviousMentoringSessionsModal } from './PreviousMentoringSessionsModal'
export { ResetAccountModal } from './ResetAccountModal'
export { TestRunModal } from './TestRunModal'
export { UnpublishSolutionModal } from './UnpublishSolutionModal'

// Modal subfolders - using specific exports to avoid conflicts
export * from './exercise-update-modal'
export * from './profile'
export * from './upload-video'
export * from './mentor-registration-modal'
export * from './track-welcome-modal'

// Specific exports to avoid conflicts
export { FinishMentorDiscussionModal } from './mentor/FinishMentorDiscussionModal'
export { InitialView as SenioritySurveyInitialView } from './seniority-survey-modal/InitialView'
export { WelcomeModal, DeveloperView, JuniorView } from './welcome-modal'