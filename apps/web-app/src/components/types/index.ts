/**
 * Type definitions for Exercism components
 * These types are used throughout the component registry and application
 */

// Base types
export interface User {
  id: number
  handle: string
  name?: string
  email: string
  avatarUrl: string
  reputation: string
  flair: Flair | null
  isMentor: boolean
  isInsider: boolean
  seniority?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  totalDonatedInDollars?: number
  createdAt?: string
}

export interface Flair {
  id: number
  name: string
  iconUrl: string
}

export interface Track {
  id: number
  slug: string
  title: string
  iconUrl: string
  isJoined: boolean
  numCompletedExercises: number
  numExercises: number
  description?: string
  tags?: string[]
}

export type ExerciseStatus = 'available' | 'started' | 'completed' | 'published' | 'locked' | 'iterated'

export interface Exercise {
  id: number
  slug: string
  title: string
  iconUrl: string
  difficulty: number
  status: ExerciseStatus
  type: 'concept' | 'practice'
  blurb?: string
  deepDiveBlurb?: string
  isUnlocked?: boolean
}

export enum IterationStatus {
  DELETED = 'deleted',
  TESTS_FAILED = 'tests_failed',
  ESSENTIAL_AUTOMATED_FEEDBACK = 'essential_automated_feedback',
  ACTIONABLE_AUTOMATED_FEEDBACK = 'actionable_automated_feedback',
  NON_ACTIONABLE_AUTOMATED_FEEDBACK = 'non_actionable_automated_feedback',
  CELEBRATORY_AUTOMATED_FEEDBACK = 'celebratory_automated_feedback',
  NO_AUTOMATED_FEEDBACK = 'no_automated_feedback',
  PROCESSING = 'processing',
  QUEUED = 'queued',
  TESTING = 'testing',
  ANALYZING = 'analyzing',
  UNTESTED = 'untested'
}

export enum SubmissionMethod {
  CLI = 'cli',
  API = 'api'
}

export interface Iteration {
  idx: number
  uuid: string
  submissionUuid: string
  createdAt: string
  testsStatus: string
  representationStatus?: string
  analysisStatus?: string
  isPublished: boolean
  isLatest?: boolean
  status?: IterationStatus
  submissionMethod?: SubmissionMethod
  numEssentialAutomatedComments?: number
  numActionableAutomatedComments?: number
  numNonActionableAutomatedComments?: number
  numCelebratoryAutomatedComments?: number
  files?: Array<{
    filename: string
    content: string
  }>
  links: {
    self: string
    tests: string
    testRun?: string
    delete?: string
  }
}

export interface Solution {
  uuid: string
  status: 'started' | 'published' | 'completed' | 'iterated'
  exercise: Exercise
  unlockedHelp?: boolean
  iterated?: boolean
  iterations?: Array<{
    idx: number
    uuid: string
  }>
  mentorDiscussions?: Array<{
    uuid: string
  }>
  mentorRequests?: {
    pending?: Array<{
      uuid: string
    }>
  }
  createdAt?: string
  updatedAt?: string
}

export interface SolutionForStudent {
  uuid: string
  status: 'started' | 'published' | 'completed' | 'iterated'
  exercise: Exercise
  unlockedHelp?: boolean
  iterated?: boolean
  iterations?: Array<{
    idx: number
    uuid: string
  }>
  mentorDiscussions?: Array<{
    uuid: string
  }>
  mentorRequests?: {
    pending?: Array<{
      uuid: string
    }>
  }
  createdAt?: string
  updatedAt?: string
}

export interface CommunitySolution {
  uuid: string
  snippet: string
  numStars: number
  numComments: number
  numLoc: number
  isStarred: boolean
  publishedAt: string
  iterationsStatus: string
  publishedIterationHeadTestsStatus: string
  hasIterations: boolean
  author: {
    handle: string
    avatarUrl: string
    flair?: Flair
  }
  exercise: {
    title: string
    iconUrl: string
  }
  track: {
    title: string
    iconUrl: string
  }
  links: {
    public: string
    private?: string
  }
}

export interface Testimonial {
  id: number
  uuid: string
  content: string
  contentHtml: string
  student: {
    handle: string
    avatarUrl: string
    flair?: Flair
  }
  mentor: {
    handle: string
    avatarUrl: string
    flair?: Flair
  }
  exercise: {
    title: string
    iconUrl: string
  }
  track: {
    title: string
    iconUrl: string
  }
  createdAt: string
  isRevealed: boolean
  links: {
    self: string
    reveal?: string
  }
}

export interface SiteUpdate {
  id: number
  title: string
  description: string
  publishedAt: string
  iconUrl?: string
  expandedHtml?: string
  links: {
    self: string
  }
}

export interface SharePlatform {
  name: string
  icon: string
  url: string
  color: string
}

export interface MetricUser {
  handle: string
  avatarUrl: string
  flair?: string
  links?: {
    self?: string
  }
}

export interface Metric {
  id: string
  type: 'start_solution_metric' | 'publish_solution_metric' | 'complete_exercise_metric' | 'user_activity_metric' | 'open_pull_request_metric' | 'merge_pull_request_metric' | 'submit_submission_metric' | 'complete_solution_metric'
  coordinates?: [number, number] // [latitude, longitude]
  track?: {
    slug: string
    title: string
    iconUrl: string
  }
  exercise?: {
    slug: string
    title: string
    iconUrl: string
    exerciseUrl?: string
  }
  user?: MetricUser
  createdAt: string
  occurredAt: string
  countryCode?: string
  countryName?: string
  publishedSolutionUrl?: string
  pullRequest?: {
    url: string
    title: string
  }
  value?: number
  metadata?: Record<string, unknown>
}

// Mentoring types
export interface MentorSessionRequest {
  id?: string
  uuid: string
  status?: 'cancelled' | 'pending' | 'fulfilled'
  trackSlug: string
  exerciseSlug: string
  studentHandle: string
  student: {
    handle: string
    avatarUrl: string
  }
  exercise: MentorSessionExercise
  createdAt?: string
  updatedAt?: string
}

export interface MentorSessionTrack {
  slug: string
  title: string
  iconUrl: string
  medianWaitTime?: string
  highlightjsLanguage: string
  indentSize: number
}

export interface MentorSessionExercise {
  id: string
  slug: string
  title: string
  iconUrl: string
  difficulty: number
  links: {
    self: string
  }
}

export interface MentorDiscussion {
  id: string
  uuid: string
  status: 'awaiting_student' | 'awaiting_mentor' | 'mentor_finished' | 'finished'
  isFinished: boolean
  student: {
    handle: string
    avatarUrl: string
    flair?: Flair
  }
  mentor: {
    handle: string
    avatarUrl: string
    flair?: Flair
  }
  track: {
    title: string
    iconUrl: string
  }
  exercise: {
    title: string
    iconUrl: string
  }
  iterations: Iteration[]
  createdAt: string
  updatedAt: string
  links: {
    self: string
    posts: string
    markAsNothingToDo?: string
    finish?: string
  }
}

export interface MentoredTrack {
  slug: string
  title: string
  iconUrl: string
  numSolutionsQueued: number
  numDiscussions: number
  links: {
    exercises: string
  }
}

export interface MentoredTrackExercise {
  slug: string
  title: string
  iconUrl: string
  difficulty: number
  numSolutionsQueued: number
  avgWaitTime?: string
}

export interface CommunicationPreferences {
  emailOnMentorStartedDiscussion: boolean
  emailOnMentorRepliedToDiscussion: boolean
  emailOnStudentRepliedToDiscussion: boolean
  emailOnStudentAddedIteration: boolean
  emailOnGeneralUpdate: boolean
}

export interface MentoringSessionExemplarFile {
  filename: string
  content: string
  digest: string
}

export interface CompleteRepresentationData {
  representation: {
    id: number
    exercise: Exercise
    track: Track
    numSubmissions: number
    appearsFrequently: boolean
    feedback: {
      author: User
      content: string
      contentHtml: string
    } | null
    lastSubmittedAt: string
  }
  submissions: Array<{
    uuid: string
    testsStatus: string
    createdAt: string
    student: {
      handle: string
      avatarUrl: string
    }
  }>
}

export interface Guidance {
  exercise: {
    exemplar: {
      content: string
      contentHtml: string
    }
    notes: {
      content: string
      contentHtml: string
    }
  }
  track: {
    content: string
    contentHtml: string
  }
  links: {
    mentorNotes: string
  }
}

export interface MentoringSessionDonation {
  uuid: string
  amount: {
    cents: number
    currency: string
  }
  payment: {
    externalId: string
    externalReceipt: string
  }
}

// Badge types
export interface Badge {
  id: number
  uuid: string
  name: string
  description: string
  rarity: 'common' | 'rare' | 'ultimate' | 'legendary'
  iconUrl: string
  numAwardedToUser: number
  links: {
    reveal?: string
  }
}

// Student track types
export interface StudentTrack {
  id: number
  slug: string
  title: string
  iconUrl: string
  isJoined: boolean
  numCompletedExercises: number
  numExercises: number
}

// Live event types
export interface LiveEvent {
  id: number
  title: string
  description: string
  startsAt: string
  youtubeId?: string
  thumbnailUrl?: string
  youtube?: boolean
}

export interface ScheduledEvent {
  id: number
  title: string
  startsAt: string
}

// Progress chart types
export interface TrackProgressChart {
  data: Array<{
    day: string
    count: number
  }>
}

// Concept types
export interface Concept {
  slug: string
  name: string
  blurb: string
  links: {
    self: string
  }
}

// Request types for API calls
export interface Request<T = Record<string, unknown>> {
  endpoint: string
  query?: Record<string, unknown>
  options?: {
    initialData?: T[]
    staleTime?: number
    cacheTime?: number
  }
}

// Additional types for mentoring
export interface SolutionMentoringStatus {
  status: 'none' | 'requested' | 'in_progress' | 'finished'
  hasUnreadPosts?: boolean
}

export interface MentoringSessionLinks {
  self: string
  finish?: string
  markAsNothingToDo?: string
}

// Additional types for compatibility
export interface Student {
  id: number
  avatarUrl: string
  name?: string
  bio?: string
  location?: string
  languagesSpoken?: string[]
  handle: string
  flair?: Flair
  reputation: string
  isFavorited: boolean
  isBlocked?: boolean
  trackObjectives?: string
  numTotalDiscussions: number
  numDiscussionsWithMentor: number
  pronouns?: string[]
  links?: {
    block?: string
    favorite?: string
    previousSessions?: string
  }
}

// Task-related types
export interface Task {
  uuid: string
  title: string
  tags: TaskTags
  track?: {
    title: string
    iconUrl: string
  }
  isNew?: boolean
  links?: {
    githubUrl?: string
  }
}

export interface TaskTags {
  action?: TaskAction
  knowledge?: TaskKnowledge
  module?: TaskModule
  size?: TaskSize
  type?: TaskType
}

export type TaskAction = 'create' | 'fix' | 'improve' | 'proofread' | 'sync'
export type TaskKnowledge = 'none' | 'elementary' | 'intermediate' | 'advanced'
export type TaskModule = 'analyzer' | 'concept-exercise' | 'concept' | 'generator' | 'practice-exercise' | 'representer' | 'test-runner'
export type TaskSize = 'tiny' | 'small' | 'medium' | 'large' | 'massive'
export type TaskType = 'ci' | 'coding' | 'content' | 'docker' | 'docs'

// Additional missing types
export interface ExerciseAuthorship {
  exercise: Exercise
  track: Track
}

export interface PaginatedResult<T> {
  results: T[]
  meta: {
    currentPage: number
    totalCount: number
    totalPages: number
    unscopedTotal?: number
  }
}

export interface Contribution {
  uuid: string
  value: number
  text: string
  iconUrl: string
  internalUrl?: string
  externalUrl?: string
  createdAt: string
  track?: {
    title: string
    iconUrl: string
  }
}

export interface ContributionCategory {
  id: 'publishing' | 'mentoring' | 'authoring' | 'building' | 'maintaining' | 'other'
  reputation: number
  metricFull?: string
  metricShort?: string
}

export interface TrackContribution {
  slug: string | null
  title: string
  iconUrl: string
  categories: readonly ContributionCategory[]
  totalReputation: number
}

// Export all types individually instead of as default object
// This prevents the "only refers to a type, but is being used as a value" errors