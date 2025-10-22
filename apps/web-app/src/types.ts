export interface Badge {
  id: string
  name: string
  description: string
  iconUrl: string
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

// Add other types here