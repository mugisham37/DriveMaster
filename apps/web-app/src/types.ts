export interface Badge {
  uuid: string
  rarity: 'common' | 'rare' | 'ultimate' | 'legendary'
  iconName: string
  name: string
  description: string
  isRevealed: boolean
  unlockedAt: string
  numAwardees: number
  percentageAwardees: number
  links: {
    reveal: string
  }
}

export interface BadgeList {
  items: Badge[]
  length: number
  sort: () => BadgeList
}

export type TrackContribution = {
  id: string
  trackId: string
  contributionType: string
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

export type Iteration = {
  id: string
  idx: number
  uuid: string
  submissionUuid: string
  solutionUuid: string
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

export type DiscussionStatus = 'awaiting_mentor' | 'awaiting_student' | 'finished'

export type MentorDiscussion = {
  id: string
  status: DiscussionStatus
  student: Student
  exercise: MentorSessionExercise
  track: MentorSessionTrack
  iterations: Iteration[]
}

export type Discussion = {
  id: string
  status: DiscussionStatus
  // Add other necessary fields
}

export type MentoredTrack = {
  id: string
  slug: string
  title: string
  iconUrl: string
}

export type MentoredTrackExercise = {
  id: string
  title: string
  trackId: string
  slug: string
}

export type Student = {
  id: string
  handle: string
  avatarUrl: string
  // Add other fields as needed
}

export type ExerciseRepresentation = {
  id: string
  exerciseId: string
  title: string
  track: {
    title: string
    iconUrl: string
    slug: string
  }
  exercise: {
    title: string
    iconUrl: string
    slug: string
  }
  numSubmissions: number
  appearsFrequently: boolean
  feedbackType?: string
  lastSubmittedAt: string
  feedbackAddedAt?: string
}

export type MentorSessionRequest = {
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

export type MentorSessionTrack = {
  id: string
  slug: string
  title: string
  iconUrl: string
  highlightjsLanguage: string
  indentSize: number
}

export type MentorSessionExercise = {
  id: string
  title: string
  slug: string
  iconUrl: string
  difficulty: number
  links: {
    self: string
  }
}

export type CompleteRepresentationData = {
  id: string
  exercise: MentorSessionExercise
  track: MentorSessionTrack
  student: Student
}

// Re-export all types from types/index.ts to maintain compatibility
export * from './types/index'

// Additional types that might be missing
export interface SiteUpdate {
  track: {
    title: string
    iconUrl: string
  }
  text: string
  publishedAt: string
  icon: {
    type: 'concept' | 'image'
    data?: string
    url?: string
  }
  expanded?: {
    author: {
      rank: number
      avatarUrl: string
      handle: string
      flair: string
      activity: string
      reputation: string
      links: {
        profile?: string
      }
    }
    title: string
    descriptionHtml: string
  }
  pullRequest?: {
    url: string
    title: string
    number: string
    mergedAt: string
    mergedBy: string
  }
  conceptWidget?: Record<string, unknown>
  exerciseWidget?: Record<string, unknown>
  makers: readonly {
    handle: string
    avatarUrl: string
  }[]
}

export interface StudentTrack {
  course: boolean
  slug: string
  webUrl: string
  iconUrl: string
  title: string
  numConcepts: number
  numCompletedConcepts: number
  tags: readonly string[]
  isNew: boolean
  hasNotifications: boolean
  numCompletedExercises: number
  numExercises: number
  lastTouchedAt: string
  isJoined: boolean
}