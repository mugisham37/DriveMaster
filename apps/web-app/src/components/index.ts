// Main components barrel export
export { PerformanceMonitor } from "./PerformanceMonitor";
export { FlashMessages } from "./FlashMessages";

// Re-export landing components
export {
  LandingHero,
  LanguageExploration,
  ExerciseShowcase,
} from "./landing";

// Re-export loading states
export {
  Spinner,
  ButtonSpinner,
  ProgressIndicator,
  FullPageLoading,
  InlineLoading,
  CardLoadingSkeleton,
  ListLoadingSkeleton,
  GridLoadingSkeleton,
  TableLoadingSkeleton,
  OverlayLoading,
  SuspenseFallback,
} from "./ui/loading-states";

// Re-export empty states
export {
  EmptyState,
  NoSearchResults,
  NoLessons,
  NoProgress,
  NoPracticeHistory,
  NoMockTests,
  NoRecommendations,
  NoAchievements,
  NoNotifications,
  ErrorState,
  NetworkErrorState,
  NotFoundState,
  SuccessState,
  InfoState,
  CompactEmptyState,
} from "./ui/empty-states";
