/**
 * API Type Definitions
 * Comprehensive types for all API responses and requests
 */

// Dashboard API Types
export interface DashboardBadge {
  uuid: string;
  rarity: string;
  iconName: string;
  name: string;
  description: string;
  isRevealed: boolean;
  unlockedAt: string;
  numAwardees: number;
  percentageAwardees: number;
  links: {
    reveal: string;
  };
}

export interface DashboardBlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: string;
  author: {
    name: string;
    avatarUrl: string;
  };
  imageUrl?: string | undefined;
  links: {
    self: string;
  };
}

export interface DashboardUpdate {
  id: number;
  text: string;
  icon: string;
  publishedAt: string;
  links: {
    self: string;
  };
}

export interface DashboardEvent {
  id: number;
  title: string;
  description: string;
  startsAt: string;
  youtubeId?: string;
  thumbnailUrl?: string;
  youtube?: boolean;
}

export interface DashboardScheduledEvent {
  id: number;
  title: string;
  startsAt: string;
}

export interface DashboardUserTrack {
  slug: string;
  title: string;
  iconUrl: string;
  numCompletedExercises: number;
  numExercises: number;
  lastTouchedAt: string;
  isJoined: boolean;
  isNew: boolean;
  links: {
    self: string;
  };
}

export interface DashboardMentorDiscussion {
  uuid: string;
  student: {
    handle: string;
    avatarUrl: string;
    flair?: string | undefined;
  };
  exercise: {
    title: string;
    iconUrl: string;
  };
  track: {
    title: string;
    iconUrl: string;
  };
  isFinished: boolean;
  postsCount: number;
  updatedAt: string;
  links: {
    self: string;
  };
}

export interface DashboardResponse {
  featuredBadges: DashboardBadge[];
  numBadges: number;
  blogPosts: DashboardBlogPost[];
  updates: DashboardUpdate[];
  liveEvent?: DashboardEvent | undefined;
  featuredEvent?: DashboardEvent | undefined;
  scheduledEvents: DashboardScheduledEvent[];
  userTracks: DashboardUserTrack[];
  numUserTracks: number;
  mentorDiscussions: DashboardMentorDiscussion[];
  mentorQueueHasRequests: boolean;
}

// Rails API Response Types
export interface RailsBadgeResponse {
  uuid: string;
  rarity: string;
  icon_name: string;
  name: string;
  description: string;
  is_revealed: boolean;
  unlocked_at: string;
  num_awardees: number;
  percentage_awardees: number;
  links?: {
    reveal?: string;
  };
}

export interface RailsBlogPostResponse {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  published_at: string;
  author?: {
    name?: string;
    avatar_url?: string;
  };
  image_url?: string;
}

export interface RailsUpdateResponse {
  id: number;
  text: string;
  icon: string;
  published_at: string;
  links?: {
    self?: string;
  };
}

export interface RailsEventResponse {
  id: number;
  title: string;
  description: string;
  starts_at: string;
  youtube_id?: string;
  thumbnail_url?: string;
  youtube?: boolean;
}

export interface RailsScheduledEventResponse {
  id: number;
  title: string;
  starts_at: string;
}

export interface RailsUserTrackResponse {
  slug: string;
  title: string;
  icon_url: string;
  num_completed_exercises: number;
  num_exercises: number;
  last_touched_at: string;
  is_joined: boolean;
  is_new: boolean;
}

export interface RailsMentorDiscussionResponse {
  uuid: string;
  student?: {
    handle?: string;
    avatar_url?: string;
    flair?: string;
  };
  exercise?: {
    title?: string;
    icon_url?: string;
    slug?: string;
  };
  track?: {
    title?: string;
    icon_url?: string;
    slug?: string;
  };
  is_finished: boolean;
  is_stale?: boolean;
  posts_count: number;
  iterations_count?: number;
  updated_at: string;
  created_at?: string;
}

export interface RailsDashboardResponse {
  featured_badges?: RailsBadgeResponse[];
  num_badges?: number;
  blog_posts?: RailsBlogPostResponse[];
  updates?: RailsUpdateResponse[];
  live_event?: RailsEventResponse;
  featured_event?: RailsEventResponse;
  scheduled_events?: RailsScheduledEventResponse[];
  user_tracks?: RailsUserTrackResponse[];
  num_user_tracks?: number;
  mentor_discussions?: RailsMentorDiscussionResponse[];
  mentor_queue_has_requests?: boolean;
}

// Mentoring API Types
export interface MentoringDiscussion {
  uuid: string;
  student: {
    handle: string;
    avatarUrl: string;
    flair?: string;
  };
  exercise: {
    title: string;
    iconUrl: string;
  };
  track: {
    title: string;
    iconUrl: string;
  };
  isFinished: boolean;
  postsCount: number;
  updatedAt: string;
  links: {
    self: string;
  };
}

export interface MentoringRepresentation {
  uuid: string;
  exercise: {
    title: string;
    iconUrl: string;
  };
  track: {
    title: string;
    iconUrl: string;
  };
  mentoringStatus: string;
  numSubmissions: number;
  appearsFrequently: boolean;
  links: {
    self: string;
  };
}

export interface MentoringRequest {
  uuid: string;
  student: {
    handle: string;
    avatarUrl: string;
    flair?: string;
  };
  exercise: {
    title: string;
    iconUrl: string;
  };
  track: {
    title: string;
    iconUrl: string;
  };
  updatedAt: string;
  haveMentoredPreviously: boolean;
  isLocked: boolean;
  links: {
    self: string;
  };
}

export interface MentoringTestimonial {
  uuid: string;
  content: string;
  student: {
    handle: string;
    avatarUrl: string;
    flair?: string;
  };
  exercise: {
    title: string;
    iconUrl: string;
  };
  track: {
    title: string;
    iconUrl: string;
  };
  createdAt: string;
}

export interface MentoringTrack {
  slug: string;
  title: string;
  iconUrl: string;
  numSolutionsQueued: number;
  numDiscussions: number;
  links: {
    self: string;
  };
}

// Track API Types
export interface TrackExercise {
  slug: string;
  title: string;
  iconUrl: string;
  difficulty: number;
  blurb: string;
  isUnlocked: boolean;
  isRecommended: boolean;
  isCompleted: boolean;
  numCompletedByUser: number;
  links: {
    self: string;
  };
}

export interface TrackConcept {
  slug: string;
  name: string;
  blurb: string;
  links: {
    self: string;
  };
}

// Solution API Types
export interface Solution {
  uuid: string;
  privateUrl: string;
  publicUrl?: string;
  status: string;
  mentoringStatus: string;
  publishedAt?: string;
  completedAt?: string;
  publishedIterationHeadTestsStatus: string;
  hasNotifications: boolean;
  numViews: number;
  numStars: number;
  numComments: number;
  numIterations: number;
  submissionMethod: string;
  links: {
    self: string;
    publicIterations: string;
    privateIterations: string;
  };
}

// Iteration API Types
export interface Iteration {
  uuid: string;
  submissionUuid: string;
  idx: number;
  status: string;
  numEssentialAutomatedComments: number;
  numActionableAutomatedComments: number;
  numNonActionableAutomatedComments: number;
  submissionMethod: string;
  createdAt: string;
  testsStatus: string;
  representationStatus: string;
  analysisStatus: string;
  links: {
    self: string;
    solution: string;
    testRun: string;
    files: string;
  };
}

// Settings API Types
export interface UserSettings {
  user: {
    handle: string;
    name: string;
    bio?: string;
    location?: string;
    website?: string;
    githubUsername?: string;
    twitterUsername?: string;
    mediumUsername?: string;
    reputation: number;
    isInsider: boolean;
    isMentor: boolean;
  };
  preferences: {
    allowCommentsOnPublishedSolutions: boolean;
    allowBeingContactedByRecruiters: boolean;
    allowPushNotifications: boolean;
  };
  communicationPreferences: {
    emailOnGeneralUpdate: boolean;
    emailOnMentorStartedDiscussion: boolean;
    emailOnMentorRepliedToDiscussion: boolean;
    emailOnStudentRepliedToDiscussion: boolean;
    emailOnStudentAddedIteration: boolean;
  };
}

// Notification API Types
export interface Notification {
  uuid: string;
  url: string;
  text: string;
  createdAt: string;
  readAt?: string;
  imageType: string;
  imageUrl: string;
}

// Custom Function Types (for bootcamp)
export interface CustomTest {
  uuid: string;
  args: string;
  expected: string;
}

export interface CustomFunction {
  uuid: string;
  name: string;
  active: boolean;
  description: string;
  predefined: boolean;
  code: string;
  tests: CustomTest[];
}

export interface CustomFunctionForInterpreter {
  dependsOnCurrentFunction?: boolean;
  name: string;
  arity: number;
  code: string;
  description: string;
  dependencies: string[];
}

export interface CustomFunctionsFromServer {
  selected: string[];
  forInterpreter: CustomFunctionForInterpreter[];
}

// Generic API Response Types
export interface ApiError {
  error: string;
  details?: string;
}

export interface ApiSuccess {
  success: boolean;
  message?: string;
}

// Extended NextRequest with IP property
export interface ExtendedNextRequest extends Request {
  ip?: string;
  nextUrl: URL;
  geo?: {
    city?: string;
    country?: string;
    region?: string;
  };
}

// Test Run Types
export interface RailsTestResponse {
  name: string;
  status: string;
  message: string;
  message_html: string;
  output: string;
  output_html: string;
  index: number;
}

// Track Types
export interface RailsExerciseResponse {
  slug: string;
  title: string;
  icon_url: string;
  difficulty: number;
  blurb: string;
  is_unlocked: boolean;
  is_completed: boolean;
  is_published?: boolean;
  is_recommended?: boolean;
  has_approaches?: boolean;
  has_article?: boolean;
  num_solutions?: number;
  num_completed_by_user?: number;
  completed_at?: string;
  links?: {
    self?: string;
  };
}

export interface RailsTrackResponse {
  slug: string;
  title: string;
  icon_url: string;
  course?: boolean;
  num_concepts: number;
  num_exercises: number;
  num_solutions?: number;
  num_completed_exercises?: number;
  is_joined?: boolean;
  is_new?: boolean;
  last_touched_at?: string;
  tags?: string[];
  links?: {
    self?: string;
    exercises?: string;
    concepts?: string;
  };
}

// Solution Types
export interface RailsSolutionResponse {
  uuid: string;
  exercise?: {
    title?: string;
    icon_url?: string;
    slug?: string;
  };
  track?: {
    title?: string;
    icon_url?: string;
    slug?: string;
  };
  private_url: string;
  public_url?: string;
  status: string;
  mentoring_status: string;
  published_at?: string;
  completed_at?: string;
  updated_at?: string;
  published_iteration_head_tests_status: string;
  has_notifications: boolean;
  num_views: number;
  num_stars: number;
  num_comments: number;
  num_iterations: number;
  submission_method: string;
  links?: {
    self?: string;
    public_iterations?: string;
    private_iterations?: string;
    public_url?: string;
  };
}

// Additional Rails Response Types for Mentoring
export interface RailsMentoringRepresentationResponse {
  id?: string;
  uuid: string;
  exercise?: {
    title?: string;
    icon_url?: string;
    slug?: string;
  };
  track?: {
    title?: string;
    icon_url?: string;
    slug?: string;
  };
  mentoring_status: string;
  num_submissions: number;
  appears_frequently: boolean;
  feedback_type?: string;
  last_submitted_at?: string;
  last_feedback_at?: string;
  feedback?: {
    content?: string;
    author?: string;
    created_at?: string;
  };
  links?: {
    self?: string;
  };
}

export interface RailsMentoringRequestResponse {
  uuid: string;
  student?: {
    handle?: string;
    avatar_url?: string;
    flair?: string;
    reputation?: number;
  };
  exercise?: {
    title?: string;
    icon_url?: string;
    slug?: string;
  };
  track?: {
    title?: string;
    icon_url?: string;
    slug?: string;
  };
  status?: string;
  updated_at: string;
  created_at?: string;
  have_mentored_previously: boolean;
  is_locked: boolean;
  discussion_uuid?: string;
  links?: {
    self?: string;
  };
}

export interface RailsMentoringTestimonialResponse {
  uuid: string;
  content: string;
  student?: {
    handle?: string;
    avatar_url?: string;
    flair?: string;
  };
  exercise?: {
    title?: string;
    icon_url?: string;
    slug?: string;
  };
  track?: {
    title?: string;
    icon_url?: string;
    slug?: string;
  };
  is_revealed?: boolean;
  created_at: string;
}

export interface RailsMentoringTrackResponse {
  slug: string;
  title: string;
  icon_url: string;
  num_solutions_queued: number;
  num_discussions: number;
  num_students?: number;
  links?: {
    self?: string;
  };
}
