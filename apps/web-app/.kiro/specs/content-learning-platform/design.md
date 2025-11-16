# Design Document

## Overview

This design document specifies the architecture for building the complete user-facing experience layer of the content learning platform. The platform transforms a fully-functional backend content service and frontend foundation layer into an intuitive, engaging, and effective learning experience inspired by Duolingo's methodology.

### Design Principles

1. **Layer-Based Architecture**: Build from Layer 3 (UI components) upward to Layer 1 (pages), with each layer depending on the layer below
2. **Foundation Leverage**: Use existing hooks, contexts, and utilities exclusively - never duplicate functionality
3. **Performance First**: Code splitting, lazy loading, prefetching, and caching are non-negotiable
4. **Accessibility by Default**: WCAG 2.1 Level AA compliance built into every component
5. **Offline Resilience**: Graceful degradation with activity queueing and sync
6. **Real-Time Sync**: WebSocket integration for live updates across tabs and devices
7. **Adaptive Learning**: Leverage backend IRT and BKT models for personalized content
8. **Immediate Feedback**: Core learning loop provides instant educational value

### System Context

**Existing Infrastructure (Foundation Layer - Complete):**
- Backend: NestJS content service with 50+ RESTful endpoints
- Frontend Hooks: React hooks for content, media, workflow, bulk operations, real-time features
- Context Providers: Auth, User, Progress, Activity, Analytics
- Utilities: Circuit breaker, graceful degradation, performance monitoring, media optimization
- UI Library: Shadcn UI components installed and configured

**What We're Building (Experience Layer):**
- Route-level pages (Layer 1)
- Feature components (Layer 2)
- Custom composite UI components (Layer 3)
- Complete user flows and learning journeys

## Architecture

### Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Pages (Routes)                                      │
│ - Dashboard, Learning Path, Lesson View, Practice, etc.     │
└─────────────────────────────────────────────────────────────┘
                            ↓ uses
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Feature Components                                  │
│ - LessonContainer, ProgressOverview, SearchInterface, etc.  │
└─────────────────────────────────────────────────────────────┘
                            ↓ uses
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: UI Components                                       │
│ - QuestionDisplay, LessonCard, TopicBadge, etc.            │
└─────────────────────────────────────────────────────────────┘
                            ↓ uses
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Foundation (Existing)                              │
│ - Hooks, Contexts, Utilities, Shadcn UI                     │
└─────────────────────────────────────────────────────────────┘
```

### State Management Architecture

**URL State (Route Parameters & Query Strings):**
- Current lesson ID, search queries, filter selections
- Enables shareable URLs, browser navigation, bookmarking

**Server State (SWR via Hooks):**
- Content items, search results, recommendations, analytics
- Automatic revalidation, stale-while-revalidate, optimistic updates

**Context State (React Context):**
- Authentication, user profile, progress, activity tracking
- Cross-cutting concerns accessible throughout component tree

**Local Component State (useState):**
- UI state (modals, tabs), form inputs, temporary selections
- Transient state that doesn't need persistence


### Data Flow Architecture

**Content Loading Flow:**
```
User Action → Page Component → Hook (SWR) → Cache Check
                                    ↓
                            API Call (if needed)
                                    ↓
                    Content Service Client → Circuit Breaker
                                    ↓
                            Backend API
                                    ↓
                    Response → Cache Update → Component Re-render
```

**Activity Recording Flow:**
```
User Answers Question → Component Handler → activityRecorder.recordActivity()
                                                    ↓
                                            Local Batch Queue
                                                    ↓
                                    Batch Timer (5s or 10 activities)
                                                    ↓
                                            Backend API Call
                                                    ↓
                                    Backend Processes & Updates Progress
                                                    ↓
                                    WebSocket Push to Frontend
                                                    ↓
                                    ProgressContext Update
                                                    ↓
                                    All Subscribed Components Re-render
```

**Real-Time Sync Flow:**
```
Activity in Tab 1 → Progress Update → BroadcastChannel Message
                                            ↓
                                    Tab 2, Tab 3 Receive
                                            ↓
                                    ProgressContext Update
                                            ↓
                                    UI Updates in All Tabs
```

## Components and Interfaces

### Layer 1: Page Components (Routes)

#### Dashboard Page (`/learn/page.tsx`)

**Purpose:** Central hub for all learning activity, showing progress, recommendations, and quick actions.

**Data Dependencies:**
- `useAuth()` - Current user authentication
- `useProgressContext()` - Streak, daily goals, completion status
- `useRecommendations(userId, 'personalized')` - Recommended lessons
- `useRealtimeProgress(userId)` - Live progress updates

**Component Structure:**
```tsx
DashboardPage
├── DashboardHeader
│   ├── UserProfile
│   └── NotificationBell
├── DashboardSidebar
│   ├── NavigationMenu
│   └── ProgressSummary
└── DashboardContent
    ├── WelcomeSection (streak display)
    ├── ContinueLearningCard
    ├── ProgressOverview
    │   ├── StreakDisplay
    │   ├── DailyGoalProgress
    │   └── StatisticsCards
    ├── RecommendedLessons
    │   └── LessonCard[] (3-5 cards)
    └── AchievementBadges
        └── BadgeCard[]
```

**Key Features:**
- Prominent "Continue Learning" button (one-click resume)
- Real-time streak counter with flame animation
- Daily goal progress with circular progress bar
- Recommended lessons with hover prefetch
- Achievement badges with celebration animations

**Performance Considerations:**
- Prefetch recommended lessons on mount
- Lazy load achievement animations
- Skeleton loaders for initial load
- Optimistic updates for quick interactions


#### Learning Path Page (`/learn/path/page.tsx`)

**Purpose:** Visual curriculum showing all units and lessons with dependencies and progress.

**Data Dependencies:**
- `useContentItems({ type: 'curriculum', jurisdiction: selectedJurisdiction })` - All units and lessons
- `useProgressContext()` - Completion status for each unit/lesson
- `useAuth()` - User's selected jurisdiction

**Component Structure:**
```tsx
LearningPathPage
├── PathHeader
│   ├── JurisdictionSelector
│   └── OverallProgress
└── PathContent
    ├── PathVisualization
    │   └── UnitNode[] (visual path)
    │       ├── UnitCard
    │       │   ├── UnitIcon
    │       │   ├── UnitTitle
    │       │   ├── ProgressBar
    │       │   └── LockIcon (if prerequisites unmet)
    │       └── LessonList (expanded on click)
    │           └── LessonCard[]
    └── PathSidebar
        ├── CurrentUnitFocus
        ├── NextRecommendedUnit
        └── CompletionEstimate
```

**Key Features:**
- Visual path with nodes and connection lines
- Lock/unlock states based on prerequisites
- Expandable units showing contained lessons
- Jurisdiction filter without page refresh
- Progress percentage for each unit
- Estimated time to completion

**Interaction Patterns:**
- Click unit → Expand to show lessons
- Click lesson → Navigate to lesson view
- Hover unit → Show tooltip with details
- Change jurisdiction → Filter content dynamically

#### Lesson View Page (`/learn/lesson/[lessonId]/page.tsx`)

**Purpose:** Core learning experience where users actively engage with questions.

**Data Dependencies:**
- `useContentItem(lessonId)` - Lesson data with all questions
- `useAuth()` - Current user for activity recording
- `useActivityRecorder(userId)` - Track all interactions

**Component Structure:**
```tsx
LessonPage
├── LessonHeader (sticky)
│   ├── ProgressBar (questions completed)
│   ├── QuestionCounter ("5 of 15")
│   ├── TimeElapsed
│   ├── CurrentAccuracy
│   └── ExitButton (with confirmation)
└── LessonContent
    ├── LessonIntro (first load only)
    │   ├── LessonTitle
    │   ├── LearningObjectives
    │   └── StartButton
    ├── QuestionDisplay
    │   ├── QuestionText (markdown support)
    │   ├── MediaGallery (images, videos)
    │   └── ChoiceList
    │       └── ChoiceButton[]
    ├── QuestionFeedback (after submission)
    │   ├── CorrectIncorrectIndicator
    │   ├── ExplanationText
    │   ├── ExternalReferences
    │   └── NextButton
    └── LessonCompletion (all questions done)
        ├── CelebrationAnimation
        ├── ScoreSummary
        ├── TopicsMastered
        ├── AchievementsEarned
        └── NextActions
            ├── ContinueToNextLesson
            └── ReturnToDashboard
```

**State Management:**
```tsx
interface LessonState {
  currentQuestionIndex: number
  userAnswers: Map<string, string> // questionId -> choiceId
  showFeedback: boolean
  lessonComplete: boolean
  score: number
  startTime: Date
}
```

**Key Features:**
- Distraction-free focused environment
- Immediate feedback after each answer
- Progress saved after every question
- Celebration on completion
- Smooth transitions between questions
- Media support with zoom/fullscreen

**Performance:**
- Prefetch next lesson at 80% completion
- Lazy load media below fold
- Optimistic UI updates
- Session storage for state persistence


#### Practice Mode Page (`/practice/page.tsx`)

**Purpose:** Flexible practice sessions with topic selection and adaptive difficulty.

**Data Dependencies:**
- `useContentItems({ type: 'topic' })` - All available topics with mastery
- `useRecommendations(userId, context)` - Optimal question sequence
- `useSpacedRepetitionReminders(userId)` - Due review items
- `useActivityRecorder(userId)` - Track practice activities

**Component Structure:**
```tsx
PracticePage
├── PracticeSetup (initial phase)
│   ├── TopicSelector (multi-select)
│   ├── DifficultySlider (-3 to 3 IRT scale)
│   ├── QuestionCountSelector (10, 20, 50, unlimited)
│   ├── TimerToggle (timed vs untimed)
│   ├── RecommendedSettings
│   └── StartPracticeButton
└── PracticeSession (active phase)
    ├── SessionHeader
    │   ├── Timer (if timed)
    │   ├── QuestionCounter
    │   ├── CurrentAccuracy
    │   └── StopButton
    ├── QuestionDisplay (reuse from lesson)
    └── SessionSummary (on stop/complete)
        ├── TotalQuestionsAnswered
        ├── AccuracyPercentage
        ├── TimeSpent
        ├── TopicsPracticedWithChanges
        ├── QuestionsToReview
        └── RecommendedNextFocus
```

**Key Features:**
- Two-phase interface (setup → session)
- Real-time difficulty adjustment
- Spaced repetition integration
- Performance statistics during session
- Flexible stopping point
- Recommended settings based on progress

**Adaptive Behavior:**
- 3 correct in a row → Increase difficulty
- 2 incorrect in a row → Decrease difficulty
- Mix in review items from spaced repetition
- Track performance per topic

#### Search and Browse Page (`/browse/page.tsx`)

**Purpose:** Comprehensive content discovery with search, filters, and browsing.

**Data Dependencies:**
- `useContentSearch(searchRequest)` - Full-text search results
- `useSearchSuggestions(query)` - Autocomplete suggestions
- `useContentFilters()` - Filter state management
- `useRecommendations(userId, 'trending')` - Trending content

**Component Structure:**
```tsx
BrowsePage
├── SearchBar
│   ├── SearchInput (with debounce)
│   ├── AutocompleteDropdown
│   │   ├── Suggestions
│   │   ├── RecentSearches
│   │   └── PopularSearches
│   └── ClearButton
├── FilterSidebar
│   ├── TopicFilters (checkboxes)
│   ├── DifficultySlider
│   ├── JurisdictionSelector
│   ├── ItemTypeFilters
│   ├── CognitiveLevelFilters
│   ├── CompletionStatusFilter
│   └── ClearAllButton
├── ActiveFiltersChips (dismissible)
├── ResultsHeader
│   ├── ResultCount
│   └── SortSelector
└── ResultsGrid
    ├── ContentCard[] (grid or list view)
    │   ├── Thumbnail
    │   ├── Title
    │   ├── DescriptionSnippet
    │   ├── DifficultyBadge
    │   ├── TopicBadges
    │   ├── CompletionStatus
    │   └── BookmarkButton
    ├── TrendingSection
    └── BrowseByTopicSection
```

**Key Features:**
- Autocomplete with 300ms debounce
- Multi-faceted filtering
- Search term highlighting in results
- Hover prefetch for results
- Grid/list view toggle
- Trending and browse by topic sections

**Performance:**
- Debounced search input
- Prefetch on hover (500ms delay)
- Virtual scrolling for long lists
- Lazy load images


#### Progress and Analytics Page (`/progress/page.tsx`)

**Purpose:** Detailed learning statistics, insights, and performance tracking.

**Data Dependencies:**
- `useAnalytics()` - Overall analytics data
- `useProgressMetrics()` - Progress statistics
- `useHistoricalMetrics(query)` - Time-series data for charts
- `useProgressContext()` - Current progress state

**Component Structure:**
```tsx
ProgressPage
├── OverviewSection
│   ├── KeyMetricsCards
│   │   ├── TotalQuestionsAnswered
│   │   ├── OverallAccuracy
│   │   ├── TotalTimeSpent
│   │   ├── CurrentStreak
│   │   └── TopicsMastered
│   └── ComparisonIndicators (vs previous period)
├── TopicMasterySection
│   ├── RadarChart (or BarChart)
│   │   └── TopicMasteryData (0-100% per topic)
│   └── TopicList (clickable for details)
├── AccuracyTrendSection
│   ├── TimeRangeSelector (7d, 30d, 90d, all)
│   └── LineChart
│       ├── AccuracyOverTime
│       └── TrendLine
├── WeakAreasPanel
│   └── WeakAreaCard[]
│       ├── TopicName
│       ├── CurrentMastery
│       ├── Recommendation
│       └── QuickActionButton
├── MilestoneTimeline
│   ├── PastAchievements
│   ├── CurrentProgress
│   └── UpcomingMilestones
└── ActivityHeatmap
    └── CalendarGrid
        └── DayCell[] (colored by intensity)
```

**Key Features:**
- Comprehensive statistics dashboard
- Interactive charts with time range selection
- Topic mastery visualization
- Weak areas identification with recommendations
- Milestone tracking
- Activity heatmap calendar

**Chart Libraries:**
- Use recharts for charts (lazy loaded)
- Responsive chart sizing
- Accessible chart alternatives (data tables)

#### Mock Test Page (`/test/mock/page.tsx`)

**Purpose:** Full-length timed practice test simulating actual driving test.

**Data Dependencies:**
- `useContentItems({ type: 'mock-test', jurisdiction })` - Test questions
- `useActivityRecorder(userId)` - Track test performance

**Component Structure:**
```tsx
MockTestPage
├── TestSetup (initial)
│   ├── TestInstructions
│   ├── JurisdictionSelector
│   ├── TimeLimitDisplay
│   └── StartTestButton
└── TestSession (active)
    ├── TestHeader
    │   ├── Timer (countdown)
    │   ├── QuestionProgress
    │   └── SubmitTestButton
    ├── QuestionNavigationSidebar
    │   └── QuestionNavButton[]
    │       ├── QuestionNumber
    │       ├── AnsweredIndicator
    │       └── FlaggedIndicator
    ├── QuestionDisplay
    │   ├── QuestionContent
    │   ├── ChoiceList
    │   └── FlagForReviewButton
    └── TestResults (after submission)
        ├── ScoreSummary
        ├── PassFailIndicator
        ├── TimeUsed
        ├── TopicBreakdown
        ├── DetailedReview
        │   └── QuestionReviewCard[]
        └── RecommendationsPanel
```

**Key Features:**
- Full-screen test environment
- Countdown timer with auto-submit
- Question navigation sidebar
- Flag for review functionality
- Detailed results with topic breakdown
- Recommendations for improvement

**State Management:**
```tsx
interface MockTestState {
  questions: ContentItem[]
  currentQuestionIndex: number
  answers: Map<string, string>
  flaggedQuestions: Set<string>
  timeRemaining: number
  testStartTime: Date
  testSubmitted: boolean
}
```

### Layer 2: Feature Components

#### LessonContainer Component

**Purpose:** Orchestrates lesson flow, manages state, coordinates child components.

**Props:**
```tsx
interface LessonContainerProps {
  lessonId: string
  onComplete?: (results: LessonResults) => void
  onExit?: () => void
}
```

**Responsibilities:**
- Fetch lesson data via `useContentItem(lessonId)`
- Manage current question index and answers
- Handle answer submission and validation
- Record activities via `useActivityRecorder`
- Coordinate transitions between questions
- Trigger completion celebration

**State:**
```tsx
interface LessonContainerState {
  currentIndex: number
  answers: Map<string, string>
  showFeedback: boolean
  startTime: Date
  questionStartTime: Date
}
```


#### ProgressOverview Component

**Purpose:** Display comprehensive progress summary with real-time updates.

**Props:**
```tsx
interface ProgressOverviewProps {
  userId: string
  showDetailedStats?: boolean
}
```

**Data Sources:**
- `useProgressContext()` - Current progress data
- `useRealtimeProgress(userId)` - Live updates

**Features:**
- Streak display with animation
- Daily goal progress (circular progress bar)
- Statistics cards (questions, accuracy, time)
- Real-time updates via WebSocket
- Celebration animations for milestones

#### SearchInterface Component

**Purpose:** Comprehensive search with autocomplete, filters, and results.

**Props:**
```tsx
interface SearchInterfaceProps {
  initialQuery?: string
  initialFilters?: ContentFilters
  onResultClick?: (item: ContentItem) => void
}
```

**Data Sources:**
- `useContentSearch(searchRequest)` - Search results
- `useSearchSuggestions(query)` - Autocomplete
- `useContentFilters()` - Filter management

**Features:**
- Debounced search input (300ms)
- Autocomplete dropdown
- Multi-faceted filtering
- Result highlighting
- Hover prefetch
- Grid/list view toggle

#### RecommendedLessons Component

**Purpose:** Display personalized lesson recommendations with prefetch.

**Props:**
```tsx
interface RecommendedLessonsProps {
  userId: string
  limit?: number
  onLessonClick?: (lessonId: string) => void
}
```

**Data Sources:**
- `useRecommendations(userId, 'personalized', { limit })`
- `usePrefetchOnHover()` - Prefetch on hover

**Features:**
- 3-5 lesson cards
- Hover prefetch (500ms delay)
- Difficulty badges
- Estimated time
- Completion status
- Click navigation

### Layer 3: UI Components

#### QuestionDisplay Component

**Purpose:** Render question with media, choices, and feedback.

**Props:**
```tsx
interface QuestionDisplayProps {
  question: ContentItem
  selectedChoice?: string
  showFeedback: boolean
  onChoiceSelect: (choiceId: string) => void
  onSubmit: () => void
  disabled?: boolean
}
```

**Structure:**
```tsx
QuestionDisplay
├── QuestionText (markdown rendering)
├── MediaGallery (if media exists)
│   ├── ImageViewer (zoom, fullscreen)
│   └── VideoPlayer (lazy loaded)
├── ChoiceList
│   └── ChoiceButton[]
└── SubmitButton (if choice selected)
```

**Features:**
- Rich text rendering (markdown)
- Media gallery with zoom/fullscreen
- Interactive choice buttons
- Visual feedback states
- Accessibility support (keyboard nav)

#### ChoiceButton Component

**Purpose:** Interactive button for question choices with visual states.

**Props:**
```tsx
interface ChoiceButtonProps {
  choice: Choice
  selected: boolean
  correct?: boolean
  incorrect?: boolean
  showFeedback: boolean
  onClick: () => void
  disabled?: boolean
}
```

**Visual States:**
- Default: Neutral background, border
- Hover: Highlighted border
- Selected (no feedback): Blue background
- Correct (with feedback): Green background, checkmark icon
- Incorrect (with feedback): Red background, X icon
- Disabled: Grayed out, no interaction

**Accessibility:**
- Keyboard navigation (arrow keys)
- Focus indicators
- ARIA labels
- Screen reader announcements


#### LessonCard Component

**Purpose:** Reusable card displaying lesson preview across multiple pages.

**Props:**
```tsx
interface LessonCardProps {
  lesson: ContentItem
  showProgress?: boolean
  onHover?: () => void
  onClick?: () => void
  actions?: React.ReactNode
}
```

**Structure:**
```tsx
LessonCard
├── Thumbnail (lazy loaded image)
├── ContentSection
│   ├── Title
│   ├── Description (truncated)
│   ├── Badges
│   │   ├── DifficultyBadge
│   │   └── TopicBadges
│   └── Metadata
│       ├── EstimatedTime
│       └── QuestionCount
├── ProgressSection (if showProgress)
│   └── ProgressBar
└── ActionsSection (if actions provided)
```

**Features:**
- Hover state with elevation
- Prefetch on hover
- Completion status indicator
- Responsive layout
- Skeleton loader variant

#### TopicBadge Component

**Purpose:** Consistent topic display with mastery indication.

**Props:**
```tsx
interface TopicBadgeProps {
  topic: string
  masteryLevel?: number // 0-100
  showMastery?: boolean
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
}
```

**Visual Design:**
- Color coding by mastery:
  - Red (<50%): Needs work
  - Yellow (50-80%): In progress
  - Green (>80%): Mastered
- Optional mastery percentage display
- Clickable for filtering
- Consistent sizing

#### StreakDisplay Component

**Purpose:** Show current streak with animation and calendar.

**Props:**
```tsx
interface StreakDisplayProps {
  currentStreak: number
  longestStreak: number
  showCalendar?: boolean
  onStreakClick?: () => void
}
```

**Features:**
- Flame icon with animation
- Day count with number animation
- Expandable calendar view
- Highlight current streak in calendar
- Celebration animation on update

#### ProgressBar Component

**Purpose:** Reusable progress indicator with multiple styles.

**Props:**
```tsx
interface ProgressBarProps {
  current: number
  max: number
  variant?: 'linear' | 'circular' | 'segmented'
  color?: 'primary' | 'success' | 'warning' | 'error'
  showLabel?: boolean
  animated?: boolean
  size?: 'sm' | 'md' | 'lg'
}
```

**Variants:**
- Linear: Horizontal bar
- Circular: Ring progress
- Segmented: Discrete steps

**Features:**
- Smooth animations
- Accessible labels
- Color theming
- Responsive sizing

## Data Models

### Content Item Model

```typescript
interface ContentItem {
  id: string
  slug: string
  type: 'question' | 'lesson' | 'unit' | 'mock-test'
  title: string
  description?: string
  content: string // Question text or lesson content
  choices?: Choice[]
  correctChoiceIds?: string[]
  explanation?: string
  externalReferences?: ExternalReference[]
  
  // Metadata
  difficulty: number // IRT parameter (-3 to 3)
  discrimination?: number
  guessingProbability?: number
  topics: string[]
  jurisdiction: string
  itemType: 'multiple-choice' | 'true-false' | 'scenario'
  cognitiveLevel: 'remember' | 'understand' | 'apply' | 'analyze'
  estimatedTime: number // seconds
  points: number
  
  // Media
  mediaAssets?: MediaAsset[]
  
  // Status
  status: 'draft' | 'review' | 'approved' | 'published' | 'archived'
  version: number
  
  // Timestamps
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
}

interface Choice {
  id: string
  text: string
  explanation?: string
  isCorrect: boolean
}

interface MediaAsset {
  id: string
  type: 'image' | 'video' | 'audio' | 'diagram'
  url: string
  thumbnailUrl?: string
  alt?: string
  caption?: string
  metadata?: Record<string, unknown>
}

interface ExternalReference {
  title: string
  url: string
  type: 'manual' | 'regulation' | 'guide'
}
```

### Progress Models

```typescript
interface UserProgress {
  userId: string
  currentStreak: number
  longestStreak: number
  dailyGoal: number
  dailyProgress: number
  totalQuestionsAnswered: number
  totalCorrect: number
  overallAccuracy: number
  totalStudyTimeMs: number
  topicsMastered: number
  lastActivityDate: Date
}

interface TopicMastery {
  userId: string
  topic: string
  mastery: number // 0-100
  confidence: number
  practiceCount: number
  correctStreak: number
  longestStreak: number
  totalTimeMs: number
  lastPracticed: Date
}

interface ActivityRecord {
  userId: string
  questionId: string
  selectedChoiceId: string
  correctChoiceId: string
  isCorrect: boolean
  timeSpentMs: number
  hintsUsed: number
  timestamp: Date
  sessionId: string
  context: {
    lessonId?: string
    practiceMode?: boolean
    mockTest?: boolean
  }
}
```

### Recommendation Models

```typescript
interface RecommendationRequest {
  userId: string
  type: 'personalized' | 'similar' | 'trending' | 'by-topic' | 'next-question'
  context?: {
    currentLessonId?: string
    completedQuestionIds?: string[]
    currentSessionPerformance?: SessionPerformance
    topicsFocused?: string[]
    difficultyPreference?: number
  }
  limit?: number
}

interface SessionPerformance {
  questionsAnswered: number
  correctAnswers: number
  averageTimeMs: number
  consecutiveCorrect: number
  consecutiveIncorrect: number
}

interface RecommendationResponse {
  items: ContentItem[]
  reasoning?: string
  confidence?: number
}
```


## Error Handling

### Error Boundary Strategy

**Route-Level Error Boundaries:**
- Wrap each page component
- Catch catastrophic rendering errors
- Display full-page error UI with recovery options
- Log errors to monitoring service
- Preserve user state where possible

**Feature-Level Error Boundaries:**
- Wrap major feature components
- Prevent error propagation to entire page
- Display inline error UI
- Allow rest of page to function normally

**Error Boundary Component:**
```tsx
interface ErrorBoundaryProps {
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  level: 'route' | 'feature'
}

interface ErrorFallbackProps {
  error: Error
  resetError: () => void
  level: 'route' | 'feature'
}
```

### API Error Handling

**Error Categories:**

1. **Network Errors** (offline, timeout, connection refused)
   - Display offline banner
   - Queue activities for later sync
   - Show cached data if available
   - Provide manual retry option

2. **Authentication Errors** (401, 403)
   - Redirect to sign-in with return URL
   - Preserve current state
   - Clear invalid tokens
   - Show session expired message

3. **Validation Errors** (400 with field messages)
   - Display inline field errors
   - Highlight invalid fields
   - Provide correction guidance
   - Prevent submission until fixed

4. **Server Errors** (500, 503)
   - Show user-friendly message
   - Provide retry button
   - Log to monitoring
   - Suggest alternative actions

5. **Not Found Errors** (404)
   - Show helpful message
   - Suggest similar content
   - Provide navigation options
   - Log for content audit

**Retry Logic:**
```typescript
interface RetryConfig {
  maxAttempts: 3
  delays: [1000, 2000, 4000] // Exponential backoff
  retryableStatuses: [408, 429, 500, 502, 503, 504]
}
```

### Circuit Breaker Integration

**Configuration:**
```typescript
interface CircuitBreakerConfig {
  failureThreshold: 5 // Open after 5 consecutive failures
  recoveryTimeout: 30000 // 30 seconds
  monitoringPeriod: 60000 // 1 minute window
  halfOpenMaxCalls: 3 // Test with 3 calls in half-open
  successThreshold: 2 // Close after 2 successes
}
```

**States:**
- **Closed**: Normal operation, all requests pass through
- **Open**: Failures exceeded threshold, block requests, return cached data
- **Half-Open**: Testing recovery, allow limited requests

**UI Indicators:**
- Closed: No indicator
- Open: "Service temporarily unavailable" banner with countdown
- Half-Open: "Reconnecting..." indicator

### Offline Support

**Offline Detection:**
```typescript
// Listen to online/offline events
window.addEventListener('online', handleOnline)
window.addEventListener('offline', handleOffline)

// Periodic heartbeat check
setInterval(checkConnection, 30000)
```

**Offline Capabilities:**
- View cached content
- Answer questions (queued)
- Navigate between cached pages
- View progress (last synced state)

**Offline Queue:**
```typescript
interface OfflineQueue {
  activities: ActivityRecord[]
  mutations: MutationRecord[]
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error'
  lastSyncAttempt?: Date
}
```

**Sync Strategy:**
- Auto-sync on connection restore
- Batch activities in order
- Handle conflicts (server wins)
- Notify user of sync status
- Retry failed syncs

## Testing Strategy

### Unit Testing

**Component Testing:**
- Test rendering with various props
- Test user interactions (clicks, inputs)
- Test state changes
- Test error states
- Test accessibility features

**Hook Testing:**
- Test data fetching
- Test caching behavior
- Test error handling
- Test optimistic updates
- Test real-time updates

**Utility Testing:**
- Test helper functions
- Test data transformations
- Test validation logic
- Test error handling

### Integration Testing

**Flow Testing:**
- Test complete user journeys
- Test data flow through layers
- Test context updates
- Test cross-tab sync
- Test offline/online transitions

**API Integration:**
- Test hook-to-backend integration
- Test error scenarios
- Test retry logic
- Test circuit breaker behavior
- Test WebSocket connections

### End-to-End Testing

**Critical Paths:**
1. New user onboarding → First lesson → Completion
2. Returning user → Continue learning → Progress update
3. Search → Filter → View content
4. Practice mode → Adaptive difficulty → Completion
5. Mock test → Timed session → Results

**Cross-Browser Testing:**
- Chrome, Firefox, Safari, Edge
- Mobile browsers (iOS Safari, Chrome Mobile)
- Tablet browsers

### Accessibility Testing

**Automated Testing:**
- Run axe-core on all pages
- Check WCAG 2.1 Level AA compliance
- Validate ARIA attributes
- Check color contrast
- Verify heading hierarchy

**Manual Testing:**
- Keyboard-only navigation
- Screen reader testing (NVDA, JAWS, VoiceOver)
- High contrast mode
- Reduced motion preference
- Zoom to 200%

### Performance Testing

**Metrics to Validate:**
- First Contentful Paint < 1.5s
- Largest Contentful Paint < 2.5s
- Time to Interactive < 3.5s
- First Input Delay < 100ms
- Cumulative Layout Shift < 0.1

**Load Testing:**
- Test with slow 3G network
- Test with 4x CPU throttling
- Test with limited memory
- Measure bundle sizes
- Validate code splitting

### Visual Regression Testing

**Screenshot Comparison:**
- Capture screenshots of key pages
- Compare against baseline
- Flag visual changes
- Review and approve changes

**Responsive Testing:**
- Test at multiple breakpoints
- Validate mobile layouts
- Check tablet layouts
- Verify desktop layouts


## Performance Optimization

### Code Splitting Strategy

**Route-Based Splitting:**
```typescript
// Dynamic imports for pages
const DashboardPage = dynamic(() => import('./pages/dashboard'))
const LessonPage = dynamic(() => import('./pages/lesson/[id]'))
const PracticePage = dynamic(() => import('./pages/practice'))
const ProgressPage = dynamic(() => import('./pages/progress'))
```

**Component-Based Splitting:**
```typescript
// Lazy load heavy components
const ChartComponent = lazy(() => import('./components/Chart'))
const VideoPlayer = lazy(() => import('./components/VideoPlayer'))
const BulkOperations = lazy(() => import('./components/BulkOperations'))
```

**Bundle Size Targets:**
- Initial bundle: < 200KB gzipped
- Each route chunk: < 100KB gzipped
- Shared vendor chunk: < 150KB gzipped

### Data Prefetching

**Prefetch Strategies:**

1. **On Mount Prefetch:**
   - Dashboard prefetches recommended lessons
   - Learning path prefetches first unit details

2. **On Hover Prefetch:**
   - Lesson cards prefetch on 500ms hover
   - Search results prefetch top 3 on hover

3. **On Progress Prefetch:**
   - Lesson view prefetches next lesson at 80% completion
   - Practice mode prefetches next question batch

4. **Predictive Prefetch:**
   - Prefetch likely next actions based on user patterns
   - Prefetch content for upcoming scheduled reviews

**Prefetch Implementation:**
```typescript
const usePrefetchOnHover = (
  prefetchFn: () => Promise<void>,
  delay: number = 500
) => {
  const timeoutRef = useRef<NodeJS.Timeout>()
  
  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(prefetchFn, delay)
  }
  
  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }
  
  return { handleMouseEnter, handleMouseLeave }
}
```

### Image Optimization

**Optimization Pipeline:**
1. Compress on upload (JPEG quality 80, PNG with pngquant)
2. Convert to WebP with fallback
3. Generate responsive sizes (300px, 800px, 1920px)
4. Store in CDN with aggressive caching

**Next.js Image Component:**
```tsx
<Image
  src={imageUrl}
  alt={altText}
  width={800}
  height={600}
  loading={aboveFold ? 'eager' : 'lazy'}
  priority={aboveFold}
  placeholder="blur"
  blurDataURL={blurDataUrl}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

### Caching Strategy

**SWR Configuration:**
```typescript
const swrConfig = {
  // Content items: 5 minutes (rarely change)
  contentItems: {
    dedupingInterval: 5 * 60 * 1000,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  },
  
  // User progress: 30 seconds (frequent updates)
  progress: {
    dedupingInterval: 30 * 1000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  },
  
  // Search results: 2 minutes (acceptable staleness)
  search: {
    dedupingInterval: 2 * 60 * 1000,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  },
}
```

**Browser Caching:**
- Immutable assets (JS, CSS): 1 year
- Media files: 1 year with CDN
- API responses: Respect Cache-Control headers
- HTML pages: no-cache (allow updates)

### Rendering Optimization

**Memoization:**
```typescript
// Memoize expensive computations
const sortedTopics = useMemo(
  () => topics.sort((a, b) => b.mastery - a.mastery),
  [topics]
)

// Memoize expensive components
const MemoizedChart = memo(Chart, (prev, next) => {
  return prev.data === next.data && prev.options === next.options
})
```

**Virtual Scrolling:**
```typescript
// For long lists (search results, question history)
import { FixedSizeList } from 'react-window'

<FixedSizeList
  height={600}
  itemCount={items.length}
  itemSize={80}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <ItemCard item={items[index]} />
    </div>
  )}
</FixedSizeList>
```

**Debouncing:**
```typescript
// Search input debouncing
const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    performSearch(query)
  }, 300),
  []
)
```

### Network Optimization

**Request Batching:**
- Batch activity records (10 activities or 5 seconds)
- Batch analytics events
- Combine multiple API calls where possible

**Request Prioritization:**
- Critical: User authentication, current lesson data
- High: Progress data, recommendations
- Medium: Search results, analytics
- Low: Prefetch, background sync

**Compression:**
- Enable gzip/brotli compression
- Minimize JSON payloads
- Use efficient data formats

## Accessibility Implementation

### Keyboard Navigation

**Global Shortcuts:**
- `Tab` / `Shift+Tab`: Navigate between interactive elements
- `Enter` / `Space`: Activate buttons and links
- `Escape`: Close modals and dialogs
- `?`: Show keyboard shortcuts help

**Page-Specific Shortcuts:**
- Lesson View:
  - `1-4`: Select choice (if 4 or fewer)
  - `Enter`: Submit answer
  - `N`: Next question (after feedback)
  - `Escape`: Exit lesson (with confirmation)
  
- Dashboard:
  - `C`: Continue learning
  - `S`: Search
  - `P`: View progress
  
- Search:
  - `/`: Focus search input
  - `Arrow Up/Down`: Navigate suggestions
  - `Enter`: Select suggestion

**Focus Management:**
```typescript
// Trap focus in modals
const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (!isActive) return
    
    const container = containerRef.current
    if (!container) return
    
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }
    
    container.addEventListener('keydown', handleTabKey)
    firstElement.focus()
    
    return () => container.removeEventListener('keydown', handleTabKey)
  }, [isActive])
  
  return containerRef
}
```

### Screen Reader Support

**ARIA Live Regions:**
```tsx
// Announce dynamic updates
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {announcement}
</div>

// For urgent updates
<div
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
  className="sr-only"
>
  {urgentMessage}
</div>
```

**Semantic HTML:**
```tsx
<header>
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="/learn">Dashboard</a></li>
      <li><a href="/practice">Practice</a></li>
    </ul>
  </nav>
</header>

<main id="main-content">
  <h1>Dashboard</h1>
  <section aria-labelledby="progress-heading">
    <h2 id="progress-heading">Your Progress</h2>
    {/* Progress content */}
  </section>
</main>

<aside aria-label="Recommendations">
  {/* Sidebar content */}
</aside>
```

**Form Accessibility:**
```tsx
<form>
  <label htmlFor="search-input">
    Search content
  </label>
  <input
    id="search-input"
    type="text"
    aria-describedby="search-help"
    aria-invalid={hasError}
    aria-errormessage={hasError ? "search-error" : undefined}
  />
  <div id="search-help" className="help-text">
    Search by topic, difficulty, or keywords
  </div>
  {hasError && (
    <div id="search-error" role="alert">
      {errorMessage}
    </div>
  )}
</form>
```

### Visual Accessibility

**Color Contrast:**
- Normal text: 4.5:1 minimum
- Large text (18pt+): 3:1 minimum
- UI components: 3:1 minimum
- Never rely on color alone

**Focus Indicators:**
```css
*:focus-visible {
  outline: 2px solid var(--focus-color);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Never remove focus indicators */
*:focus {
  outline: none; /* Only if :focus-visible is supported */
}
```

**Responsive Text:**
```css
/* Base font size */
html {
  font-size: 16px;
}

/* Support browser zoom */
body {
  font-size: 1rem; /* Scales with zoom */
}

/* Minimum touch target size */
button, a {
  min-height: 44px;
  min-width: 44px;
}
```

**Motion Preferences:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

```typescript
// Detect motion preference
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches

// Conditionally apply animations
const animationVariants = prefersReducedMotion
  ? { initial: {}, animate: {} }
  : { initial: { opacity: 0 }, animate: { opacity: 1 } }
```

## Security Considerations

### Content Security Policy

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.example.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https: blob:;
      font-src 'self' data:;
      connect-src 'self' https://api.example.com wss://ws.example.com;
      media-src 'self' https://media.example.com;
      frame-ancestors 'none';
    `.replace(/\s{2,}/g, ' ').trim()
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
]
```

### Input Sanitization

```typescript
// Sanitize user input before rendering
import DOMPurify from 'isomorphic-dompurify'

const sanitizeHtml = (dirty: string): string => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  })
}

// Use in components
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(userContent) }} />
```

### Authentication Token Management

```typescript
// Store tokens securely
const tokenManager = {
  setToken: (token: string) => {
    // Use httpOnly cookies for production
    // sessionStorage for development
    if (process.env.NODE_ENV === 'production') {
      // Token set via httpOnly cookie from backend
    } else {
      sessionStorage.setItem('auth_token', token)
    }
  },
  
  getToken: (): string | null => {
    if (process.env.NODE_ENV === 'production') {
      // Token sent automatically with requests
      return null
    } else {
      return sessionStorage.getItem('auth_token')
    }
  },
  
  clearToken: () => {
    sessionStorage.removeItem('auth_token')
    // Clear cookie via backend endpoint
  }
}
```

### XSS Prevention

- Sanitize all user-generated content
- Use React's built-in XSS protection (JSX escaping)
- Avoid `dangerouslySetInnerHTML` unless necessary
- Validate and sanitize URLs
- Use Content Security Policy headers

### CSRF Protection

- Use SameSite cookies
- Implement CSRF tokens for state-changing operations
- Validate origin headers
- Use POST for mutations, GET for queries

This completes the design document. The design provides comprehensive architecture for all layers, detailed component specifications, data models, error handling strategies, testing approaches, performance optimizations, accessibility implementation, and security considerations.
