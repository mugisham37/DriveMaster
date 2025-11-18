// Flair type definition
export type Flair = "insider" | "lifetime_insider" | "founder" | "staff";

export type Size = "small" | "large";

export type PaginatedResult<T> = {
  results: T;
  meta: {
    currentPage: number;
    totalCount: number;
    totalPages: number;
    unscopedTotal?: number;
  };
};

export type ExerciseType = "tutorial" | "concept" | "practice";

export type ExerciseStatus =
  | "published"
  | "completed"
  | "iterated"
  | "started"
  | "available"
  | "locked";

export type InsidersStatus =
  | "unset"
  | "ineligible"
  | "eligible"
  | "eligible_lifetime"
  | "active"
  | "active_lifetime";

export type ExerciseAuthorship = {
  exercise: Exercise;
  track: Track;
};

export type Concept = {
  name: string;
  slug: string;
  links: {
    self: string;
    tooltip: string;
  };
};

export type Contribution = {
  uuid: string;
  value: number;
  text: string;
  iconUrl: string;
  internalUrl?: string;
  externalUrl?: string;
  createdAt: string;
  track?: {
    title: string;
    iconUrl: string;
  };
};

export type Testimonial = {
  uuid: string;
  content: string;
  student: {
    avatarUrl: string;
    handle: string;
    flair: Flair;
  };
  mentor: {
    avatarUrl: string;
    handle: string;
    flair: Flair;
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
  isRevealed: boolean;
  links: {
    reveal: string;
    delete: string;
    self: string;
  };
};

type UserLinks = {
  self?: string;
  profile?: string;
};
export type User = {
  avatarUrl: string;
  flair: Flair;
  name?: string;
  handle: string;
  hasAvatar?: boolean;
  reputation?: string;
  links?: UserLinks;
};

export type Exercise = ExerciseCore & {
  isUnlocked: boolean;
  links: { self: string };
};

export type Student = {
  id: number;
  avatarUrl: string;
  name: string;
  bio: string;
  location: string;
  languagesSpoken: string[];
  handle: string;
  flair: Flair;
  reputation: string;
  isFavorited: boolean;
  isBlocked: boolean;
  trackObjectives: string;
  numTotalDiscussions: number;
  numDiscussionsWithMentor: number;
  pronouns?: string[];
  links: {
    block: string;
    favorite?: string;
    previousSessions: string;
  };
};

export type SolutionForStudent = {
  uuid: string;
  privateUrl: string;
  publicUrl: string;
  status: SolutionStatus;
  mentoringStatus: SolutionMentoringStatus;
  hasNotifications: boolean;
  numIterations: number;
  isOutOfDate: boolean;
  updatedAt: string;
  exercise: {
    slug: string;
    title: string;
    iconUrl: string;
  };
  track: {
    slug: string;
    title: string;
    iconUrl: string;
  };
};

export type SolutionStatus = "started" | "published" | "completed" | "iterated";
export type SolutionMentoringStatus =
  | "none"
  | "requested"
  | "in_progress"
  | "finished";

export type DiscussionStatus =
  | "awaiting_mentor"
  | "awaiting_student"
  | "mentor_finished"
  | "finished";

export type AutomationStatus = "with_feedback" | "without_feedback" | "admin";

export type CommunitySolution = {
  uuid: string;
  snippet: string;
  numLoc?: string;
  numStars: string;
  numComments: string;
  representationNumPublishedSolutions: string;
  publishedAt: string;
  language: string;
  iterationStatus: IterationStatus;
  publishedIterationHeadTestsStatus: SubmissionTestsStatus;
  isOutOfDate: boolean;
  author: {
    handle: string;
    avatarUrl: string;
    flair: Flair;
  };
  exercise: {
    title: string;
    iconUrl: string;
  };
  track: {
    title: string;
    iconUrl: string;
    highlightjsLanguage: string;
  };

  links: {
    publicUrl: string;
    privateIterationsUrl: string;
  };
};

export type CommunitySolutionContext = "mentoring" | "profile" | "exercise";

type ExerciseCore = {
  slug: string;
  type: ExerciseType;
  title: string;
  iconUrl: string;
  blurb: string;
  difficulty: ExerciseDifficulty;
  isRecommended: boolean;
  isExternal: boolean;
  isTutorial?: boolean;
  isWip?: boolean;
  hasApproaches?: boolean;
};

export type ExerciseDifficulty = "easy" | "medium" | "hard";

export type File = {
  filename: string;
  content: string;
  digest: string | undefined;
  type: FileType;
};

type FileType = "exercise" | "solution" | "legacy" | "readonly";

export type APIError = {
  type: string;
  message: string;
};

export type MentorSessionRequest = {
  uuid: string;
  comment?: string;
  isLocked: boolean;
  lockedUntil?: string;
  track: {
    title: string;
  };
  student: {
    handle: string;
    avatarUrl: string;
  };
  links: {
    lock: string;
    discussion: string;
    cancel: string;
    extendLock: string;
  };
};
export type MentorSessionTrack = {
  slug: string;
  title: string;
  iconUrl: string;
  highlightjsLanguage: string;
  indentSize: number;
  medianWaitTime?: number;
};

export type MentorSessionExercise = {
  slug: string;
  title: string;
  iconUrl: string;
  links: {
    self: string;
  };
};

export type StudentTrack = {
  course: boolean;
  slug: string;
  webUrl: string;
  iconUrl: string;
  title: string;
  numConcepts: number;
  numCompletedConcepts: number;
  tags: readonly string[];
  isNew: boolean;
  hasNotifications: boolean;
  numCompletedExercises: number;
  numExercises: number;
  lastTouchedAt: string;
  isJoined: boolean;
};

export type Track = {
  slug: string;
  title: string;
  iconUrl: string;
  course: boolean;
  numConcepts: number;
  numExercises: number;
  numSolutions: number;
  links: {
    self: string;
    exercises: string;
    concepts: string;
    repo?: string;
  };
};

export type AutomationTrack = Pick<Track, "slug" | "iconUrl" | "title"> & {
  numSubmissions: number;
};
export type VideoTrack = Pick<Track, "slug" | "iconUrl" | "title"> & {
  numVideos?: number;
};

export type Iteration = {
  uuid: string;
  idx: number;
  status: IterationStatus;
  unread: boolean;
  numEssentialAutomatedComments?: number;
  numActionableAutomatedComments?: number;
  numNonActionableAutomatedComments?: number;
  numCelebratoryAutomatedComments?: number;
  submissionMethod: SubmissionMethod;
  representerFeedback?: RepresenterFeedback;
  analyzerFeedback?: AnalyzerFeedback;
  createdAt: string;
  testsStatus: SubmissionTestsStatus;
  isPublished: boolean;
  isLatest: boolean;
  files?: File[];
  posts?: Array<Record<string, unknown>>;
  new?: boolean;
  id?: string;
  solutionUuid?: string;
  links: {
    self: string;
    delete: string;
    solution: string;
    files: string;
    testRun: string;
    automatedFeedback: string;
  };
};

type FeedbackContributor = Pick<
  User,
  "name" | "avatarUrl" | "reputation" | "flair" | "handle"
> & {
  profileUrl: string;
};
export type RepresenterFeedback = {
  html: string;
  author: FeedbackContributor;
  editor?: FeedbackContributor;
};

export type AnalyzerFeedback = {
  summary: string;
  comments: readonly AnalyzerFeedbackComment[];
};

export type AnalyzerFeedbackComment = {
  type: "essential" | "actionable" | "informative" | "celebratory";
  html: string;
};

export enum SubmissionTestsStatus {
  NOT_QUEUED = "not_queued",
  QUEUED = "queued",
  PASSED = "passed",
  FAILED = "failed",
  ERRORED = "errored",
  EXCEPTIONED = "exceptioned",
  CANCELLED = "cancelled",
}

export enum IterationStatus {
  DELETED = "deleted",
  UNTESTED = "untested",
  TESTING = "testing",
  TESTS_FAILED = "tests_failed",
  ANALYZING = "analyzing",
  ESSENTIAL_AUTOMATED_FEEDBACK = "essential_automated_feedback",
  ACTIONABLE_AUTOMATED_FEEDBACK = "actionable_automated_feedback",
  NON_ACTIONABLE_AUTOMATED_FEEDBACK = "non_actionable_automated_feedback",
  CELEBRATORY_AUTOMATED_FEEDBACK = "celebratory_automated_feedback",
  NO_AUTOMATED_FEEDBACK = "no_automated_feedback",
}

export enum SubmissionMethod {
  CLI = "cli",
  API = "api",
}

export enum RepresentationStatus {
  NOT_QUEUED = "not_queued",
  QUEUED = "queued",
  APPROVED = "approved",
  DISAPPROVED = "disapproved",
  INCONCLUSIVE = "inconclusive",
  EXCEPTIONED = "exceptioned",
  CANCELLED = "cancelled",
}

export enum AnalysisStatus {
  NOT_QUEUED = "not_queued",
  QUEUED = "queued",
  APPROVED = "approved",
  DISAPPROVED = "disapproved",
  INCONCLUSIVE = "inconclusive",
  EXCEPTIONED = "exceptioned",
  CANCELLED = "cancelled",
}

export type MentorDiscussionStatus =
  | "awaiting_student"
  | "awaiting_mentor"
  | "mentor_finished"
  | "finished";

export type MentorDiscussionFinishedBy =
  | "mentor"
  | "student"
  | "mentor_timed_out"
  | "student_timed_out";

export type MentorDiscussion = {
  uuid: string;
  status: MentorDiscussionStatus;
  finishedAt?: string;
  finishedBy?: MentorDiscussionFinishedBy;
  student: {
    avatarUrl: string;
    handle: string;
    isFavorited: boolean;
    flair: Flair;
  };
  mentor: {
    avatarUrl: string;
    handle: string;
    flair: Flair;
  };
  track: {
    title: string;
    iconUrl: string;
  };
  exercise: {
    title: string;
    iconUrl: string;
  };
  isFinished: boolean;
  isUnread: boolean;
  isFavorited: boolean;
  postsCount: number;
  iterationsCount: number;
  createdAt: string;
  updatedAt: string;
  links: {
    self: string;
    posts: string;
    markAsNothingToDo: string;
    finish: string;
    tooltipUrl: string;
  };
};

export type MentoredTrackExercise = {
  slug: string;
  title: string;
  iconUrl: string;
  count: number;
  completedByMentor: boolean;
};

export type MentoringSessionDonation = {
  showDonationModal: boolean;
  previousDonor: boolean;
  request: {
    endpoint: string;
    options: {
      initialData: {
        subscription?: {
          provider: string;
          interval: string;
          amountInCents: string;
        };
      };
    };
  };
};

export type MentoringSessionLinks = {
  exercise: string;
  exerciseMentorDiscussionUrl: string;
  learnMoreAboutPrivateMentoring: string;
  privateMentoring: string;
  mentoringGuide: string;
  createMentorRequest: string;
  donationsSettings: string;
  donate: string;
  self: string;
  finish?: string;
  markAsNothingToDo?: string;
};

export type MentoredTrack = {
  slug: string;
  title: string;
  iconUrl: string;
  numSolutionsQueued: number;
  exercises: MentoredTrackExercise[] | undefined;
  links: {
    exercises: string;
  };
};

export type RepresentationExercise = Pick<
  MentorSessionExercise,
  "title" | "iconUrl"
>;
export type RepresentationTrack = Pick<
  MentorSessionTrack,
  "title" | "iconUrl" | "highlightjsLanguage"
>;
export type Representation = {
  id: number;
  exercise: RepresentationExercise;
  track: RepresentationTrack;
  numSubmissions: number;
  feedbackHtml: string;
  draftFeedbackType: RepresentationFeedbackType | null;
  draftFeedbackMarkdown: string | null;
  feedbackType: RepresentationFeedbackType | null;
  feedbackMarkdown: string | null;
  feedbackAddedAt: string | null;
  lastSubmittedAt: string;
  appearsFrequently: boolean;
  feedbackAuthor: { handle: string };
  feedbackEditor: { handle: string };
  links: { edit?: string; update?: string; self?: string };
};

export type RepresentationData = Representation & {
  files: readonly File[];
  testFiles: readonly TestFile[];
  instructions: string;
};

export type RepresentationFeedbackType =
  | "essential"
  | "actionable"
  | "non_actionable"
  | "celebratory";

export type CompleteRepresentationData = {
  representation: RepresentationData;
  examples: Pick<RepresentationData, "files" | "instructions" | "testFiles">[];
  mentor: Pick<User, "avatarUrl" | "handle"> & { name: string };
  mentorSolution: CommunitySolution;
  links: { back: string; success: string };
  guidance: Guidance;
  scratchpad: Record<string, unknown>;
  analyzerFeedback?: AnalyzerFeedback;
};

export type Guidance = {
  representations: string;
  exercise: string;
  track: string;
  exemplarFiles: MentoringSessionExemplarFile[];
  links: GuidanceLinks;
};

export type GuidanceLinks = {
  improveExerciseGuidance: string;
  improveTrackGuidance: string;
  improveRepresenterGuidance?: string;
  representationFeedbackGuide: string;
};

export type Contributor = {
  rank: number;
  avatarUrl: string;
  handle: string;
  flair: Flair;
  activity: string;
  reputation: string;
  links: {
    profile?: string;
  };
};

export type BadgeRarity = "common" | "rare" | "ultimate" | "legendary";

export type Badge = {
  uuid: string;
  rarity: BadgeRarity;
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
};

export type Task = {
  uuid: string;
  title: string;
  tags: TaskTags;
  track: Pick<Track, "title" | "iconUrl">;
  isNew: boolean;
  links: {
    githubUrl: string;
  };
};

export type TaskTags = {
  action?: TaskAction;
  knowledge?: TaskKnowledge;
  module?: TaskModule;
  size?: TaskSize;
  type?: TaskType;
};

export type TaskAction = "create" | "fix" | "improve" | "proofread" | "sync";
export type TaskKnowledge = "none" | "elementary" | "intermediate" | "advanced";
export type TaskModule =
  | "analyzer"
  | "concept-exercise"
  | "concept"
  | "generator"
  | "practice-exercise"
  | "representer"
  | "test-runner";
export type TaskSize = "tiny" | "small" | "medium" | "large" | "massive";
export type TaskType = "ci" | "coding" | "content" | "docker" | "docs";

export type SiteUpdateContext = "track" | "update";

export type SiteUpdateIconType =
  | { type: "concept"; data: string }
  | { type: "image"; url: string };

export type SiteUpdateExpandedInfo = {
  author: Contributor;
  title: string;
  descriptionHtml: string;
};

export type SiteUpdate = {
  track: {
    title: string;
    iconUrl: string;
  };
  text: string;
  publishedAt: string;
  icon: SiteUpdateIconType;
  expanded?: SiteUpdateExpandedInfo;
  pullRequest?: PullRequest;
  conceptWidget?: Record<string, unknown>;
  exerciseWidget?: Record<string, unknown>;
  makers: readonly {
    handle: string;
    avatarUrl: string;
  }[];
};

export type PullRequest = {
  url: string;
  title: string;
  number: string;
  mergedAt: string;
  mergedBy: string;
};

export type UserPreference = {
  key: string;
  label: string;
  value: boolean;
};

export type CommunicationPreference = {
  key: string;
  label: string;
  value: boolean;
};

export type CommunicationPreferences = {
  mentoring: readonly CommunicationPreference[];
  product: readonly CommunicationPreference[];
};

export type ContributionCategoryId =
  | "publishing"
  | "mentoring"
  | "authoring"
  | "building"
  | "maintaining"
  | "other";

export type ContributionCategory = {
  id: ContributionCategoryId;
  reputation: number;
  metricFull?: string;
  metricShort?: string;
};

export class TrackContribution {
  slug: string | null;
  title: string;
  iconUrl: string;
  categories: readonly ContributionCategory[];

  get totalReputation(): number {
    return this.categories.reduce(
      (sum, category) => sum + category.reputation,
      0,
    );
  }

  constructor({
    slug,
    title,
    iconUrl,
    categories,
  }: {
    slug: string | null;
    title: string;
    iconUrl: string;
    categories: readonly ContributionCategory[];
  }) {
    this.slug = slug;
    this.title = title;
    this.iconUrl = iconUrl;
    this.categories = categories;
  }
}

export class BadgeList {
  items: readonly Badge[];

  sort(): BadgeList {
    return new BadgeList({
      items: [...this.items]
        .sort((a, b) =>
          new BadgeRarityValue(a.rarity).value <
          new BadgeRarityValue(b.rarity).value
            ? -1
            : 1,
        )
        .reverse(),
    });
  }

  filter(rarity: BadgeRarity): BadgeList {
    return new BadgeList({
      items: [...this.items].filter((badge) => badge.rarity === rarity),
    });
  }

  get length(): number {
    return this.items.length;
  }

  constructor({ items }: { items: readonly Badge[] }) {
    this.items = items;
  }
}

class BadgeRarityValue {
  rarity: BadgeRarity;

  get value(): number {
    switch (this.rarity) {
      case "common":
        return 0;
      case "rare":
        return 1;
      case "ultimate":
        return 2;
      case "legendary":
        return 3;
    }
  }

  constructor(rarity: BadgeRarity) {
    this.rarity = rarity;
  }
}

export type SolutionComment = {
  uuid: string;
  author: {
    avatarUrl: string;
    handle: string;
    flair: Flair;
    reputation: string;
  };
  updatedAt: string;
  contentMarkdown: string;
  contentHtml: string;
  links: {
    edit?: string;
    delete?: string;
  };
};

export type Notification = {
  uuid: string;
  url: string;
  imageType: NotificationImageType;
  imageUrl: string;
  iconFilter: string;
  text: string;
  createdAt: string;
  isRead: boolean;
};

type NotificationImageType = "icon" | "avatar";

export type MentoringSessionExemplarFile = {
  filename: string;
  content: string;
};

export type SharePlatform =
  | "facebook"
  | "twitter"
  | "reddit"
  | "linkedin"
  | "devto";

export type MetricUser = {
  handle: string;
  avatarUrl: string;
  links: { self: string | null };
};
export type Metric = {
  type: string;
  coordinates: number[];
  user?: MetricUser;
  countryCode: string;
  countryName: string;
  publishedSolutionUrl?: string;
  track?: {
    title: string;
    iconUrl: string;
  };
  pullRequest?: {
    htmlUrl: string;
  };

  exercise: {
    title: string;
    exerciseUrl: string;
    iconUrl: string;
  };
  occurredAt: string;
};

export type Modifier =
  | "hover"
  | "active"
  | "focus"
  | "focus-within"
  | "focus-visible"
  | "visited"
  | "target"
  | "first"
  | "last"
  | "only"
  | "odd"
  | "even"
  | "first-of-type"
  | "last-of-type"
  | "only-of-type"
  | "empty"
  | "disabled"
  | "enabled"
  | "checked"
  | "intermediate"
  | "default"
  | "required"
  | "valid"
  | "invalid"
  | "in-range"
  | "out-of-range"
  | "placeholder-shown"
  | "autofill"
  | "read-only";

export type CommunityVideoAuthorLinks = {
  profile?: string;
};

export type CommunityVideoAuthor = {
  name: string;
  handle: string;
  avatarUrl: string;
  links: CommunityVideoAuthorLinks;
};

export type CommunityVideoPlatform = "youtube" | "vimeo";

export type CommunityVideoLinks = {
  watch: string;
  embed: string;
  channel: string;
  thumbnail: string;
};

export type CommunityVideoType = {
  id: number;
  author?: CommunityVideoAuthor;
  // TODO: Revisit this - check data returned by video retrieving on UploadVideoModal
  url?: string;
  // TODO: revisit video-grid embedUrl
  embedUrl?: string;
  submittedBy: CommunityVideoAuthor;
  thumbnailUrl?: string;
  platform: CommunityVideoPlatform;
  title: string;
  createdAt: string;
  links: CommunityVideoLinks;
};

export type CommunityVideosProps = {
  videos: CommunityVideoType[];
};

// Video Length Types
export interface Video {
  length_in_minutes: number;
}

export type TestFile = {
  filename: string;
  content: string;
};

// Bootcamp types
export * from "./bootcamp";

// Solution Types
export interface Solution {
  uuid: string;
  status: SolutionStatus;
  unlockedHelp?: boolean;
  iterated?: boolean;
  iterations?: Array<{
    idx: number;
    uuid: string;
  }>;
  mentorDiscussions?: Array<{
    uuid: string;
  }>;
  mentorRequests?: {
    pending?: Array<{
      uuid: string;
    }>;
  };
}

// CLI Walkthrough Types
export interface CLIStep {
  title: string;
  description: string;
  command?: string;
  note?: string;
}

// Introducer Types
export interface IntroducerConfig {
  slug: string;
  icon: string;
  content: string;
  isDismissed: boolean;
}

// Solution View Types
export interface SolutionIteration {
  idx: number;
  uuid: string;
  submissionUuid: string;
  createdAt: string;
  testsStatus: string;
  representationStatus: string;
  analysisStatus: string;
  isPublished: boolean;
  files: Array<{
    filename: string;
    content: string;
  }>;
  links: {
    self: string;
    tests: string;
    delete?: string;
  };
}

// Track Selector Types
export interface TrackOption {
  slug: string;
  title: string;
  iconUrl: string;
}

// Progress Graph Types
export interface ProgressDataPoint {
  value: number;
  timestamp: string;
  label?: string;
}
// API Response Types
export interface DashboardData {
  tracks: Track[];
  numTracks: number;
  trackIconUrls: string[];
  recentActivity: Array<{
    type: string;
    track: Track;
    exercise?: Exercise;
    createdAt: string;
  }>;
  featuredBadges: Badge[];
  reputation: number;
}

export interface APIResponse<T = unknown> {
  data?: T;
  tracks?: Track[];
  numTracks?: number;
  trackIconUrls?: string[];
  exercises?: Exercise[];
  numExercises?: number;
  discussions?: MentorDiscussion[];
  requests?: MentorSessionRequest[];
  results?: T[];
  meta?: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    unscopedTotal?: number;
  };
  error?: string;
  message?: string;
}

// Specific response types for better type safety
export interface TracksResponse extends APIResponse {
  tracks: Track[];
  numTracks: number;
  trackIconUrls: string[];
}

export interface TrackExercisesResponse extends APIResponse {
  exercises: Exercise[];
  numExercises: number;
}

export interface MentoringDiscussionsResponse extends APIResponse {
  discussions: MentorDiscussion[];
  meta: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    unscopedTotal?: number;
  };
}

export interface MentoringRequestsResponse extends APIResponse {
  requests: MentorSessionRequest[];
  meta: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    unscopedTotal?: number;
  };
}

export interface MentoringTestimonialsResponse extends APIResponse {
  results: Testimonial[];
  meta: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    unscopedTotal?: number;
  };
}

export interface MentoringRepresentationsResponse extends APIResponse {
  results: Representation[];
  meta: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    unscopedTotal?: number;
  };
}

export interface MentoringTracksResponse extends Omit<APIResponse, "tracks"> {
  tracks: MentoredTrack[];
}

export interface CacheKey extends Array<unknown> {
  0: string;
  [index: number]: unknown;
}

export interface MutateFunction {
  (
    key?: CacheKey | ((key: CacheKey) => boolean),
    data?: unknown,
    shouldRevalidate?: boolean,
  ): Promise<unknown>;
}

// Window interface extensions
export interface WindowConfetti {
  (options?: {
    particleCount?: number;
    spread?: number;
    origin?: { y: number };
  }): void;
}

// Migrated Ruby Helper Types
export * from "./helpers";

// Advanced bootcamp types
export * from "./bootcamp-advanced";

// Auth service types - with explicit re-exports to avoid conflicts
export type {
  // Authentication types
  LoginCredentials,
  RegisterData,
  TokenPair,
  RefreshTokenRequest,

  // User profile (Auth Service version - aliased)
  UserProfile as AuthUserProfile,
  UserPreferences as AuthUserPreferences,

  // OAuth types
  OAuthProviderType,
  OAuthProvider,
  OAuthInitiationRequest,
  OAuthInitiationResponse,
  OAuthCallbackRequest,
  OAuthCallbackResponse,
  OAuthLinkRequest,
  OAuthUnlinkRequest,
  LinkedProvider,

  // Profile and track types
  ProfileUpdateRequest,

  // Session types
  Session,
  SessionListResponse,
  SessionInvalidationRequest,

  // Error types
  AuthErrorType,
  AuthError,
  ValidationError as AuthValidationError,
  NetworkError as AuthNetworkError,
  AuthenticationError,
  AuthorizationError as AuthAuthorizationError,
  OAuthError,
  ServerError,

  // Response types (Auth Service - aliased)
  ApiResponse as AuthApiResponse,
  LoginResponse,
  RegisterResponse,
  RefreshTokenResponse,
  ProfileResponse,
  ProvidersResponse,
  HealthResponse as AuthHealthResponse,

  // Service endpoints
  AuthServiceEndpoints,
  ExtractRequest,
  ExtractResponse,

  // Service configuration
  AuthServiceConfig,
  CircuitBreakerState as AuthCircuitBreakerState,

  // Sync types
  AuthSyncMessage,
  LoginSyncPayload,
  LogoutSyncPayload,
  TokenRefreshSyncPayload,
  ProfileUpdateSyncPayload,
} from "./auth-service";

// Export auth error type guards with aliases
export {
  isValidationError as isAuthValidationError,
  isNetworkError as isAuthNetworkError,
  isAuthenticationError,
  isAuthorizationError as isAuthAuthorizationError,
  isOAuthError,
  isServerError,
} from "./auth-service";

// User service types - with explicit re-exports to avoid conflicts
export type {
  // Core user types (User Service version - primary)
  UserProfile,
  UserUpdateRequest,
  UserPreferences,
  PreferencesData,
  NotificationPreferences,
  PrivacyPreferences,
  LearningPreferences,
  AccessibilityPreferences,

  // Progress tracking
  ProgressSummary,
  SkillMastery,
  AttemptRecord,
  LearningStreak,
  Milestone,
  WeeklyProgressPoint,
  TopicProgressPoint,

  // Activity tracking
  ActivityType,
  ActivityRecord,
  ActivitySummary,
  EngagementMetrics,
  ActivityInsight,
  ActivityRecommendation,
  RecommendationAction,
  TopicActivitySummary,

  // Behavior analysis (User Service version)
  BehaviorPattern,

  // GDPR and compliance
  GDPRExportResponse,
  GDPRDeleteResponse,
  ConsentRecord,
  ConsentPreferences,
  DataRetentionPreference,
  CommunicationPreferences as UserCommunicationPreferences,
  PrivacyReport,
  DataCategoryReport,
  ProcessingActivity,
  ThirdPartySharing,
  RetentionPolicy,
  UserRightsStatus,
  ComplianceStatus,

  // Time management (User Service version)
  DateRange,
  TimeRange,

  // Error types (User Service)
  UserServiceErrorType,
  UserServiceError,

  // Service health and configuration (User Service - aliased)
  CircuitBreakerState as UserCircuitBreakerState,
  ServiceHealthStatus as UserServiceHealthStatus,
  ServiceInfo,
  UserServiceConfig,
  ProtocolType,
  ServiceDiscoveryConfig as UserServiceDiscoveryConfig,

  // Response types (User Service - aliased where needed)
  ApiResponse as UserApiResponse,
  UserProfileResponse,
  UserPreferencesResponse,
  ProgressSummaryResponse,
  SkillMasteryResponse,
  ActivitySummaryResponse,
  EngagementMetricsResponse,
  ActivityInsightsResponse,
  ActivityRecommendationsResponse,
  HealthResponse as UserHealthResponse,
  ServiceInfoResponse,
} from "./user-service";

// Export user service error type guards with aliases
export {
  isUserServiceError,
  isValidationError as isUserValidationError,
  isNetworkError as isUserNetworkError,
  isAuthorizationError as isUserAuthorizationError,
  isServiceError,
  isTimeoutError,
  isCircuitBreakerError,
} from "./user-service";

// Analytics service types - with explicit re-exports to avoid conflicts
export type {
  // Configuration
  AnalyticsServiceConfig,

  // Core analytics (Analytics Service versions - aliased where needed)
  ServiceDiscoveryConfig as AnalyticsServiceDiscoveryConfig,
  ServiceHealthStatus as AnalyticsServiceHealthStatus,

  // Engagement metrics
  UserEngagementMetrics,
  LearningProgressMetrics,
  ContentPerformanceMetrics,
  SystemPerformanceMetrics,
  RealtimeMetricsSnapshot,

  // Content analytics (ContentItem exported separately below)
  ContentGap,
  Alert,
  AlertSeverity,

  // Behavior insights
  BehaviorInsights,
  BehaviorPattern as AnalyticsBehaviorPattern,
  RiskFactor,
  ContentGapAnalysis,
  EffectivenessReport,
  TrendData,

  // Query parameters
  EngagementMetricsParams,
  ProgressMetricsParams,
  ContentMetricsParams,
  SystemMetricsParams,
  HistoricalQuery,
  ReportFilters,

  // Time-based types (Analytics Service - aliased)
  TimeRange as AnalyticsTimeRange,
  EngagementFilters,
  ContentFilters,
  TimeSeriesData,

  // Pagination and sorting
  PaginationParams,
  SortingParams,

  // WebSocket and real-time
  MetricsUpdate,
  AlertMessage,
  WebSocketMessage,
  SubscriptionMessage,
  SubscriptionAckMessage,
  ErrorMessage,
  HeartbeatMessage,
  ConnectionStatusMessage,

  // Advanced analytics
  HourlyEngagement,
  CohortRetention,
  UserSegment,
  UserJourney,

  // Error handling
  AnalyticsServiceErrorType,
  AnalyticsServiceError,
  ValidationErrorDetail,

  // Response types (Analytics Service - aliased)
  ApiResponse as AnalyticsApiResponse,

  // Client configuration
  AnalyticsClientConfig,
  CircuitBreakerConfig,
  RequestQueueConfig,

  // React hooks types
  UseAnalyticsResult,
  UseEngagementMetricsResult,
  UseRealtimeMetricsResult,

  // WebSocket configuration
  ConnectionStatus,
  WebSocketConfig,
  WebSocketConnectionState,
  SubscriptionHandler,
  MessageRouterConfig,

  // Permissions and authorization
  UserRole,
  AnalyticsFeature,
  AnalyticsDataType,
  AnalyticsPermissions,

  // Service interfaces
  AnalyticsServiceClient,
  CompleteAnalyticsWebSocketManager,
  AnalyticsContextValue,
  UserContext,
  FilteredRequest,
} from "./analytics-service";

// Environment types
export * from "./env";

// Content Service types - DTOs and Entities
export * from "./dtos";

// Export entities with aliases to avoid conflicts
export type {
  ContentType,
  WorkflowStatus,
  ContentMetadata,
  ContentData,
  MediaType,
  MediaMetadata,
  MediaAsset,
  SearchHighlight,
  SearchFacet,
  SearchResult,
  SearchSuggestion,
  Recommendation,
  RecommendationType,
  WorkflowTransition,
  ReviewDecision,
  BulkOperationType,
  BulkOperationStatus,
  BulkOperation,
  BulkOperationError,
  ContentChangeType,
  ContentChangeEvent,
  PresenceInfo,
} from "./entities";

// Export ContentItem from entities as the default for content management operations
export type { ContentItem } from "./entities";

// Export analytics ContentItem with explicit alias
export type { ContentItem as AnalyticsContentItem } from "./analytics-service";

// Onboarding types
export type {
  OnboardingStep,
  OnboardingFormData,
  OnboardingState,
  OnboardingContextValue,
} from "./onboarding";

// Content Service Error types - with Content prefix to avoid conflicts
export type {
  ContentServiceErrorType,
  BaseContentServiceError,
  NetworkError as ContentNetworkError,
  AuthenticationError as ContentAuthenticationError,
  AuthorizationError as ContentAuthorizationError,
  ValidationError as ContentValidationError,
  NotFoundError,
  ConflictError,
  ServerError as ContentServerError,
  TimeoutError as ContentTimeoutError,
  RateLimitError,
  ServiceUnavailableError,
  ContentServiceError,
  ErrorContext,
  ErrorResponse,
  BulkOperationItemError,
  BulkOperationErrors,
  CircuitBreakerError as ContentCircuitBreakerError,
  UploadError,
  SearchError,
} from "./errors";

export { isCircuitBreakerError as isContentCircuitBreakerError } from "./errors";

// Notification Service types
export type {
  // Core notification types
  NotificationType,
  NotificationPriority,
  DeliveryChannel,
  NotificationStatus,
  Notification,
  NotificationList,
  NotificationQueryParams,

  // Device token management
  DeviceToken,
  DeviceMetadata,
  DeviceTokenRequest,
  DeviceTokenResponse,
  DeviceTokenStats,

  // Notification templates
  NotificationTemplate,
  RenderedNotification,
  TemplateRenderRequest,

  // Scheduling
  ScheduledNotification,
  RecurringPattern,
  ScheduleNotificationRequest,

  // Analytics and tracking
  DeliveryResult,
  NotificationAnalytics,
  AnalyticsQueryParams,
  AnalyticsMetric,
  AnalyticsData,

  // Preferences management
  NotificationPreferences as NotificationServicePreferences,
  QuietHours,
  FrequencySettings,
  GlobalNotificationSettings,

  // Real-time communication
  NotificationEventType,
  NotificationEvent,
  RealtimeNotification,
  WebSocketMessage as NotificationWebSocketMessage,
  EventHandler,

  // Learning-specific notifications
  AchievementNotificationRequest,
  SpacedRepetitionRequest,
  StreakReminderRequest,
  MockTestReminderRequest,

  // Error handling
  NotificationErrorType,
  NotificationError,
  ErrorContext,
  ErrorHandlingResult,

  // API response types
  ApiResponse as NotificationApiResponse,
  PaginatedResponse as NotificationPaginatedResponse,

  // Configuration types
  NotificationServiceClientConfig,
  CacheEntry,
  CacheType,

  // Circuit breaker types
  CircuitBreakerState as NotificationCircuitBreakerState,
  CircuitBreakerConfig as NotificationCircuitBreakerConfig,
  CircuitBreakerMetrics,

  // Authentication types
  JWTPayload,

  // Utility types
  DeepPartial,
  RequiredFields,
  OptionalFields,
} from "./notification-service";
