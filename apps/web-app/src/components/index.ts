// Common components
export * from "./common";

// Student components
export * from "./student";

// Mentoring components
export * from "./mentoring";

// Editor components
export * from "./editor";

// Profile components
export * from "./profile";

// Community components
export * from "./community";

// Community Solutions components
export * from "./community-solutions";

// Cohorts components
export * from "./cohorts";

// Courses components
export * from "./courses";

// Contributing components
export * from "./contributing";

// Bootcamp components
export * from "./bootcamp";

// Layout components
export * from "./layout";

// Auth components
export * from "./auth";

// Provider components
export * from "./providers";

// Settings components
export * from "./settings";

// Insiders components
export * from "./insiders";

// Modal components - explicitly re-export to avoid conflicts with common Modal
export { 
  BadgeModal,
  BegModal,
  BugReportModal,
  ChangePublishedIterationModal,
  CLIWalkthroughModal,
  CompletedMentoringModal,
  CompleteExerciseModal,
  ConceptMakersModal,
  DeleteAccountModal,
  DisableSolutionCommentsModal,
  DonationConfirmationModal,
  EnableSolutionCommentsModal,
  ExerciseMakersModal,
  ExerciseTooltipModal,
  ExerciseUpdateModal,
  MentorChangeTracksModal,
  MentorRegistrationModal,
  Modal as ComponentModal,
  ModalManager,
  PracticeModeModal,
  PreviousMentoringSessionsModal,
  PublishSolutionModal,
  RequestMentoringModal,
  ResetAccountModal,
  SenioritySurveyModal,
  TaskHintsModal,
  TestimonialModal,
  TestRunModal,
  TrackLeaveModal,
  TrackResetModal,
  TrackWelcomeModal,
  UnpublishSolutionModal,
  WelcomeModal,
  WelcomeToInsidersModal
} from "./modals";

// Partner components
export * from "./partner";

// Perks components
export * from "./perks";

// Training Data components
export * from "./training-data";

// About components
export * from "./about";

// Docs components
export * from "./docs";

// Journey components - explicitly re-export to avoid conflicts
export { 
  JourneyPageWrapper,
  JourneyPage,
  Overview,
  SolutionsList,
  BadgesList,
  ContributionsList as JourneyContributionsList,
  BadgeResults,
  ContributionResults,
  Contribution,
  Solution,
  RevealedBadge,
  UnrevealedBadge
} from "./journey";

// Maintaining components
export * from "./maintaining";

// Misc components
export * from "./misc";

// Other Components - explicitly re-export to avoid conflicts
export { FavoritesList as ComponentFavoritesList, type FavoritesListProps } from './favorites-list'
export * from './github-syncer-widget'
export * from './impact'
