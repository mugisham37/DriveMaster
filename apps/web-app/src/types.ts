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

export type Iteration = {
  id: string
  submissionUuid: string
  solutionUuid: string
  status: string
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
  // Add other fields as needed
}

export type MentorSessionRequest = {
  id: string
  status: string
  student: Student
  exercise: MentorSessionExercise
}

export type MentorSessionTrack = {
  id: string
  slug: string
  title: string
  iconUrl: string
}

export type MentorSessionExercise = {
  id: string
  title: string
  slug: string
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