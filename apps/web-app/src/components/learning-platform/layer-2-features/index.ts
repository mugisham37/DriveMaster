/**
 * Layer 2: Feature Components
 * 
 * Complex components that orchestrate UI components and manage feature-level state
 */

export { LessonContainer } from './LessonContainer';
export type { LessonContainerProps, LessonResults } from './LessonContainer';

export { ProgressOverview } from './ProgressOverview';
export type { ProgressOverviewProps } from './ProgressOverview';

export { RecommendedLessons } from './RecommendedLessons';
export type { RecommendedLessonsProps } from './RecommendedLessons';

export { SearchInterface } from './SearchInterface';
export type { SearchInterfaceProps } from './SearchInterface';

export { PracticeSetup } from './PracticeSetup';
export type { PracticeSetupProps, PracticeSettings } from './PracticeSetup';

export { PracticeSession } from './PracticeSession';
export type { PracticeSessionProps, SessionSummary } from './PracticeSession';

export { MockTestSetup } from './MockTestSetup';
export type { MockTestSetupProps } from './MockTestSetup';

export { MockTestSession } from './MockTestSession';
export type { MockTestSessionProps, MockTestResults as MockTestResultsType } from './MockTestSession';

export { MockTestResults } from './MockTestResults';
export type { MockTestResultsProps } from './MockTestResults';
