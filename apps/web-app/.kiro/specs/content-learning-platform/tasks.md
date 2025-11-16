# Implementation Plan

This implementation plan breaks down the content learning platform into discrete, manageable coding tasks. Each task builds incrementally on previous tasks, with all code integrated and functional. Tasks are organized to build from Layer 3 (UI components) upward to Layer 1 (pages), following the architectural design.

## Task Organization

- Top-level tasks represent major features or component groups
- Sub-tasks represent specific implementation steps
- Tasks marked with `*` are optional (primarily testing-related)
- All tasks reference specific requirements from the requirements document
- Each task assumes access to requirements.md and design.md for context

## Implementation Tasks

- [x] 1. Set up project structure and shared utilities ✅ COMPLETE
  - [x] Create directory structure for components (Layer 3, Layer 2, Layer 1)
  - [x] Set up TypeScript interfaces for all data models from design.md
  - [x] Create shared utility functions for common operations (date formatting, number formatting, text truncation)
  - [x] Configure error boundary components (route-level and feature-level)
  - [x] Set up performance monitoring utilities
  - _Requirements: 13.1, 13.2, 14.1, 14.3_
  - _Status: All TypeScript interfaces, utilities, error boundaries, and performance monitoring are implemented and working correctly._

- [x] 2. Implement core UI components (Layer 3) ✅ COMPLETE
- [x] 2.1 Create ProgressBar component with multiple variants
  - Implement linear, circular, and segmented progress bar variants
  - Add smooth animations with configurable duration
  - Support color theming (primary, success, warning, error)
  - Add accessible labels and ARIA attributes
  - Create responsive sizing (sm, md, lg)
  - _Requirements: 2.5, 12.1, 12.3_
  - _Status: Implemented with linear and circular variants, color theming, animations, and responsive sizing. Fixed type errors._

- [x] 2.2 Create TopicBadge component with mastery indication
  - Implement badge with topic name display
  - Add color coding based on mastery level (red <50%, yellow 50-80%, green >80%)
  - Support optional mastery percentage display
  - Make clickable for filtering functionality
  - Implement consistent sizing variants
  - _Requirements: 9.2, 12.1_
  - _Status: Implemented with mastery color coding, optional percentage display, keyboard navigation, and ARIA labels._

- [x] 2.3 Create StreakDisplay component with animation
  - Implement flame icon with animation on updates
  - Add day count with number animation
  - Create expandable calendar view showing streak history
  - Highlight current streak in calendar
  - Add celebration animation on streak updates
  - _Requirements: 2.1, 2.5, 9.1_
  - _Status: Implemented with flame animation, expandable calendar, streak history display, and reduced motion support._

- [x] 2.4 Create LessonCard component for content preview
  - Implement card layout with thumbnail, title, description
  - Add difficulty badge and topic badges
  - Display estimated time and question count
  - Show progress bar when showProgress prop is true
  - Add hover state with elevation effect
  - Integrate with usePrefetchOnHover for performance
  - Create skeleton loader variant for loading states
  - _Requirements: 2.1, 5.3, 8.4, 13.3_
  - _Status: Implemented with thumbnail support, difficulty badges, topic badges, progress bar, hover effects, keyboard navigation, and skeleton loader._

- [x] 2.5 Create ChoiceButton component for question answers
  - Implement interactive button with choice text
  - Add visual states: default, hover, selected, correct, incorrect, disabled
  - Use color coding and icons (checkmark for correct, X for incorrect)
  - Support keyboard navigation with arrow keys
  - Add ARIA labels and screen reader announcements
  - Implement focus indicators meeting WCAG standards
  - _Requirements: 6.1, 6.3, 12.1, 12.2, 12.3_
  - _Status: Implemented with all visual states, color coding, icons, keyboard navigation, ARIA labels, and focus indicators._

- [x] 2.6 Create QuestionDisplay component
  - Implement question text rendering with markdown support
  - Create MediaGallery sub-component for images/videos with zoom and fullscreen
  - Build ChoiceList that renders ChoiceButton components
  - Add submit button that appears when choice is selected
  - Implement disabled state during submission
  - Add loading states for media
  - _Requirements: 6.1, 6.4, 12.1_
  - _Status: Implemented with question text rendering, media gallery with fullscreen support, choice list, submit button, feedback display, and external references._

- [ ]* 2.7 Write unit tests for UI components
  - Test ProgressBar rendering with different variants and values
  - Test TopicBadge color coding based on mastery levels
  - Test StreakDisplay animations and calendar expansion
  - Test LessonCard hover states and prefetch integration
  - Test ChoiceButton visual states and keyboard navigation
  - Test QuestionDisplay with various content types
  - _Requirements: 6.1, 12.1, 13.1_
  - _Status: Optional task - skipped as per implementation plan._


- [x] 3. Implement feature components (Layer 2)





- [x] 3.1 Create LessonContainer component


  - Implement component that fetches lesson data using useContentItem hook
  - Create state management for current question index, user answers, feedback visibility
  - Build answer submission handler that validates selection and shows immediate feedback
  - Integrate useActivityRecorder to track time and record activities after each answer
  - Implement navigation logic between questions with smooth transitions
  - Add lesson completion detection and trigger completion celebration
  - Persist state to sessionStorage for page refresh resilience
  - _Requirements: 2.3, 2.4, 3.1, 3.4, 6.1, 6.2, 6.6_


- [x] 3.2 Create ProgressOverview component

  - Fetch progress data using useProgressContext hook
  - Integrate useRealtimeProgress for live updates via WebSocket
  - Display current streak with StreakDisplay component
  - Show daily goal progress with circular ProgressBar
  - Create statistics cards for questions answered, accuracy, time spent
  - Add animated counters for number updates
  - Implement celebration animations for milestone achievements
  - _Requirements: 2.1, 2.5, 9.1, 10.1, 10.4_

- [x] 3.3 Create RecommendedLessons component


  - Fetch recommendations using useRecommendations hook with 'personalized' type
  - Render 3-5 LessonCard components in grid layout
  - Integrate usePrefetchOnHover with 500ms delay for each card
  - Handle click navigation to lesson view page
  - Add loading skeleton while fetching recommendations
  - Display empty state if no recommendations available
  - _Requirements: 2.1, 3.1, 8.4, 13.3, 13.4_


- [x] 3.4 Create SearchInterface component

  - Implement search bar with debounced input (300ms) using useSearchSuggestions
  - Build autocomplete dropdown showing suggestions, recent searches, popular searches
  - Create filter sidebar with topic checkboxes, difficulty slider, jurisdiction selector
  - Implement useContentSearch hook integration for results
  - Use useContentFilters for filter state management
  - Display results in grid with ContentCard components
  - Add active filter chips that are dismissible
  - Show result count and sorting options
  - Implement hover prefetch for result cards
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 13.3_


- [x] 3.5 Create PracticeSetup component

  - Build topic selector with multi-select using useContentItems for topics
  - Implement difficulty slider with IRT scale (-3 to 3) and visual labels
  - Add question count selector (10, 20, 50, unlimited options)
  - Create timer toggle for timed vs untimed practice
  - Display recommended settings based on user progress (highlight low mastery topics)
  - Add start practice button that transitions to session phase
  - _Requirements: 7.1, 7.2_



- [x] 3.6 Create PracticeSession component





  - Implement session header with timer, question counter, current accuracy, stop button
  - Reuse QuestionDisplay component for question rendering
  - Integrate useRecommendations with practice context for adaptive question selection
  - Track real-time performance statistics (questions answered, accuracy, average time)
  - Implement adaptive difficulty adjustment (3 correct → increase, 2 incorrect → decrease)
  - Mix in spaced repetition items using useSpacedRepetitionReminders
  - Create session summary screen with results and recommendations
  - _Requirements: 3.1, 3.2, 4.3, 7.3, 7.4, 7.5_

- [ ]* 3.7 Write integration tests for feature components
  - Test LessonContainer data fetching and state management
  - Test ProgressOverview real-time updates via WebSocket
  - Test RecommendedLessons prefetch behavior
  - Test SearchInterface debouncing and filter updates
  - Test PracticeSession adaptive difficulty logic
  - _Requirements: 3.1, 7.3, 10.3_

- [x] 4. Implement Dashboard page (Layer 1)




- [x] 4.1 Create Dashboard page component structure


  - Set up Next.js page at /learn/page.tsx
  - Implement authentication check using useRequireAuth hook
  - Create page layout with header, sidebar, and main content area
  - Add loading states with skeleton loaders
  - Implement error boundary for route-level error handling
  - _Requirements: 1.1, 2.1, 13.2, 14.3_



- [x] 4.2 Integrate Dashboard data fetching

  - Call useAuth to get current user
  - Call useProgressContext to get streak, daily goals, completion status
  - Call useRecommendations with userId and 'personalized' type
  - Call useRealtimeProgress for live updates
  - Handle loading states for each data source
  - Handle error states with retry options

  - _Requirements: 2.1, 10.1, 14.1, 14.2_

- [x] 4.3 Build Dashboard welcome and continue learning section

  - Create welcome section displaying "Welcome back" with user name
  - Integrate StreakDisplay component showing current streak
  - Build prominent "Continue Learning" card showing last incomplete lesson
  - Display lesson progress bar and one-click resume functionality

  - Add lesson preview with thumbnail and description
  - _Requirements: 2.1, 2.2_

- [x] 4.4 Build Dashboard progress overview section

  - Integrate ProgressOverview component
  - Display daily goal progress with circular progress bar
  - Show statistics cards: total questions, accuracy, time spent

  - Add animated counters for number updates
  - Implement real-time updates when progress changes
  - _Requirements: 2.1, 2.5, 9.1_

- [x] 4.5 Build Dashboard recommended lessons section

  - Integrate RecommendedLessons component
  - Display 3-5 lesson cards in responsive grid

  - Implement hover prefetch for performance
  - Add click navigation to lesson view
  - Show loading skeleton while fetching
  - _Requirements: 2.1, 13.3_

- [x] 4.6 Build Dashboard achievement badges section

  - Fetch achievements using useAchievementNotifications hook
  - Display earned badges in grid layout
  - Show locked badges grayed out with unlock tooltips
  - Implement celebration animations for new achievements
  - Add click handler to view achievement details
  - _Requirements: 2.5, 10.4_

- [ ]* 4.7 Write end-to-end tests for Dashboard
  - Test complete dashboard load with all sections
  - Test "Continue Learning" navigation
  - Test real-time progress updates
  - Test achievement celebration animations
  - _Requirements: 2.1, 2.5, 10.1_


- [x] 5. Implement Learning Path page (Layer 1)





- [x] 5.1 Create Learning Path page component structure


  - Set up Next.js page at /learn/path/page.tsx
  - Implement authentication check using useRequireAuth
  - Create page layout with header and main content area
  - Add loading states with skeleton loaders
  - Implement error boundary
  - _Requirements: 5.1, 13.2, 14.3_


- [x] 5.2 Implement Learning Path data fetching

  - Call useContentItems with filters for curriculum type and jurisdiction
  - Call useProgressContext for completion status of units and lessons
  - Call useAuth to get user's selected jurisdiction
  - Handle loading and error states
  - _Requirements: 5.1, 14.1_


- [x] 5.3 Build Learning Path header with jurisdiction selector

  - Create header with jurisdiction selector dropdown
  - Implement jurisdiction change handler that updates filter without page refresh
  - Display overall path completion percentage
  - Add estimated time to completion based on current pace

  - _Requirements: 5.5_

- [x] 5.4 Build Learning Path visualization with units

  - Create visual path layout with unit nodes and connection lines
  - Render UnitCard components for each unit showing title, icon, progress
  - Implement lock/unlock states based on prerequisites
  - Add tooltips on hover showing unit details and prerequisite requirements
  - Display progress percentage for each unit
  - _Requirements: 5.1, 5.2_

- [x] 5.5 Implement unit expansion and lesson display

  - Add click handler to expand unit and show contained lessons
  - Render LessonCard components for lessons within expanded unit
  - Display lesson difficulty, estimated time, completion status
  - Implement click navigation to lesson view page
  - Add collapse functionality to close expanded unit
  - _Requirements: 5.3, 5.4_

- [x] 5.6 Build Learning Path sidebar

  - Display current unit focus
  - Show next recommended unit based on progress
  - Display overall completion estimate
  - Add quick navigation to current unit
  - _Requirements: 5.1_

- [ ]* 5.7 Write end-to-end tests for Learning Path
  - Test jurisdiction selector updates content
  - Test unit expansion and lesson display
  - Test prerequisite lock behavior
  - Test navigation to lesson view
  - _Requirements: 5.1, 5.4, 5.5_

- [x] 6. Implement Lesson View page (Layer 1)





- [x] 6.1 Create Lesson View page component structure


  - Set up Next.js dynamic page at /learn/lesson/[lessonId]/page.tsx
  - Extract lessonId from URL params using Next.js useParams
  - Implement authentication check using useRequireAuth
  - Create focused, distraction-free layout
  - Add error boundary
  - _Requirements: 1.4, 6.1, 13.2, 14.3_


- [x] 6.2 Implement Lesson View data fetching

  - Call useContentItem with lessonId to fetch lesson data
  - Call useAuth to get current user for activity recording
  - Initialize useActivityRecorder with userId
  - Handle loading state with skeleton loader
  - Handle error state with retry option
  - _Requirements: 2.3, 6.1, 14.1_


- [x] 6.3 Build Lesson header with progress indicators

  - Create sticky header that remains visible during scroll
  - Display progress bar showing questions completed out of total
  - Show question counter (e.g., "Question 5 of 15")
  - Display time elapsed since lesson start
  - Show current accuracy percentage for session
  - Add exit button with confirmation dialog if progress would be lost
  - _Requirements: 6.1, 12.1_


- [x] 6.4 Build Lesson intro screen

  - Display lesson title and description
  - Show learning objectives
  - Display estimated time and difficulty
  - Add brief animated introduction (10 seconds max) explaining format
  - Implement "Start Lesson" button to begin questions
  - Show intro only on first load, not on resume
  - _Requirements: 1.3, 6.1_


- [x] 6.5 Integrate LessonContainer for question flow

  - Integrate LessonContainer component to manage lesson state
  - Pass lesson data and callbacks for completion and exit
  - Handle answer submission and activity recording
  - Implement smooth transitions between questions
  - Save progress to sessionStorage after each question
  - _Requirements: 2.3, 2.4, 6.1, 6.2_

- [x] 6.6 Build Lesson completion screen


  - Display celebration animation (confetti effect) on completion
  - Show final score and accuracy percentage
  - Display time taken to complete lesson
  - List topics covered and mastery level changes
  - Show any achievements earned during lesson
  - Add "Continue to Next Lesson" button using recommendations
  - Add "Return to Dashboard" button
  - _Requirements: 1.5, 6.6_

- [x] 6.7 Implement Lesson prefetch for next lesson


  - Prefetch next recommended lesson when user reaches 80% completion
  - Use useRecommendations to get next lesson ID
  - Call usePrefetchOnHover or manual prefetch for next lesson data
  - Enable instant navigation on completion
  - _Requirements: 13.4_

- [ ]* 6.8 Write end-to-end tests for Lesson View
  - Test complete lesson flow from intro to completion
  - Test answer submission and immediate feedback
  - Test progress saving and resume functionality
  - Test exit confirmation dialog
  - Test prefetch of next lesson
  - _Requirements: 1.3, 1.4, 1.5, 2.3, 6.1, 6.6_


- [x] 7. Implement Practice Mode page (Layer 1)




- [x] 7.1 Create Practice Mode page component structure


  - Set up Next.js page at /practice/page.tsx
  - Implement authentication check using useRequireAuth
  - Create two-phase layout (setup phase and session phase)
  - Add state management for phase transitions
  - Implement error boundary
  - _Requirements: 7.1, 13.2, 14.3_


- [x] 7.2 Integrate PracticeSetup component

  - Integrate PracticeSetup component for initial phase
  - Pass callback to handle practice start with selected settings
  - Fetch topics using useContentItems for topic selector
  - Display recommended settings based on user progress
  - Transition to session phase when user clicks start
  - _Requirements: 7.1, 7.2_



- [x] 7.3 Integrate PracticeSession component
  - Integrate PracticeSession component for active phase
  - Pass selected settings (topics, difficulty, count, timed)
  - Handle session stop and completion
  - Display session summary on stop/complete
  - Add option to start new practice session

  - _Requirements: 7.3, 7.4, 7.5_

- [x] 7.4 Implement spaced repetition integration

  - Call useSpacedRepetitionReminders to fetch due review items
  - Mix review items into practice session questions
  - Mark review questions with "Review" badge
  - Track review completion and update schedules
  - _Requirements: 4.3, 7.3_


- [x] 7.5 Build Practice session summary screen

  - Display total questions answered and accuracy percentage
  - Show time spent and topics practiced
  - Display mastery level changes for each topic
  - List questions to review (incorrectly answered)
  - Show recommended next practice focus based on performance
  - Add buttons to start new practice or return to dashboard
  - _Requirements: 7.5_

- [ ]* 7.6 Write end-to-end tests for Practice Mode
  - Test practice setup with topic and difficulty selection
  - Test adaptive difficulty adjustment during session
  - Test spaced repetition item integration
  - Test session summary and recommendations
  - _Requirements: 3.2, 4.3, 7.1, 7.3, 7.5_

- [x] 8. Implement Search and Browse page (Layer 1)





- [x] 8.1 Create Search and Browse page component structure


  - Set up Next.js page at /browse/page.tsx
  - Implement authentication check using useRequireAuth
  - Create layout with search bar, filter sidebar, and results area
  - Add loading states with skeleton loaders
  - Implement error boundary
  - _Requirements: 8.1, 13.2, 14.3_

- [x] 8.2 Integrate SearchInterface component


  - Integrate SearchInterface component for search and filtering
  - Handle initial query from URL params if present
  - Update URL params when search query or filters change
  - Enable shareable search URLs
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 8.3 Build search results display


  - Render ContentCard components in grid or list view
  - Implement view toggle (grid/list)
  - Add sorting options (relevance, difficulty, newest, popular)
  - Display result count and active filters
  - Implement pagination or infinite scroll for large result sets
  - Add empty state when no results found
  - _Requirements: 8.2, 8.3_

- [x] 8.4 Implement result card hover prefetch


  - Integrate usePrefetchOnHover for each result card
  - Set 500ms hover delay before prefetch
  - Prefetch full content data for hovered cards
  - Enable instant navigation when card is clicked
  - _Requirements: 8.4, 13.3_

- [x] 8.5 Build Trending and Browse by Topic sections


  - Fetch trending content using useRecommendations with 'trending' type
  - Display trending section with content cards
  - Create "Browse by Topic" section with topic category cards
  - Implement click handler to filter by selected topic
  - _Requirements: 8.5_

- [ ]* 8.6 Write end-to-end tests for Search and Browse
  - Test search with autocomplete
  - Test filter application and result updates
  - Test result card prefetch behavior
  - Test trending content display
  - Test browse by topic filtering
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [-] 9. Implement Progress and Analytics page (Layer 1)


- [x] 9.1 Create Progress and Analytics page component structure


  - Set up Next.js page at /progress/page.tsx
  - Implement authentication check using useRequireAuth
  - Create layout with multiple sections for different analytics
  - Add loading states with skeleton loaders
  - Implement error boundary
  - _Requirements: 9.1, 13.2, 14.3_

- [x] 9.2 Implement Progress data fetching

  - Call useAnalytics for overall analytics data
  - Call useProgressMetrics for progress statistics
  - Call useHistoricalMetrics with time range for chart data
  - Call useProgressContext for current progress state
  - Handle loading and error states for each data source
  - _Requirements: 9.1, 14.1_

- [x] 9.3 Build Progress overview section with key metrics

  - Display key metrics cards: total questions, accuracy, time, streak, topics mastered
  - Add comparison indicators showing change vs previous period
  - Implement animated counters for number updates
  - Use StreakDisplay component for streak visualization
  - _Requirements: 9.1_

- [x] 9.4 Build Topic mastery section with visualization


  - Implement radar chart or bar chart showing mastery per topic (0-100%)
  - Use recharts library (lazy loaded) for chart rendering
  - Color-code topics: green (>80%), yellow (50-80%), red (<50%)
  - Make topics clickable to filter detailed statistics
  - Add accessible data table alternative for screen readers
  - _Requirements: 9.2_

- [x] 9.5 Build Accuracy trend section with time-series chart


  - Implement line chart displaying accuracy percentage over time
  - Add time range selector (7 days, 30 days, 90 days, all time)
  - Show trend line and percentage change indicators
  - Use recharts library for chart rendering
  - Add accessible data table alternative
  - _Requirements: 9.3_

- [x] 9.6 Build Weak areas panel with recommendations


  - Identify topics with low mastery or declining performance
  - Display weak area cards with topic name, current mastery, recommendation
  - Add quick action buttons to start targeted practice on weak topics
  - Link to practice mode with pre-selected weak topic
  - _Requirements: 9.4_



- [ ] 9.7 Build Milestone timeline
  - Display past achievements with dates
  - Show current progress toward next milestones
  - Display upcoming milestones with requirements
  - Show estimated dates to reach milestones based on current pace
  - _Requirements: 9.4_

- [-] 9.8 Build Activity heatmap calendar

  - Create calendar grid showing learning activity per day
  - Color each day by intensity of activity (darker = more active)
  - Highlight current streak
  - Add tooltip on hover showing questions answered and time spent
  - _Requirements: 9.5_

- [ ]* 9.9 Write end-to-end tests for Progress and Analytics
  - Test all sections load with correct data
  - Test time range selector updates charts
  - Test topic click filters detailed statistics
  - Test weak area quick action navigation
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_


- [ ] 10. Implement Mock Test page (Layer 1)
- [ ] 10.1 Create Mock Test page component structure
  - Set up Next.js page at /test/mock/page.tsx
  - Implement authentication check using useRequireAuth
  - Create two-phase layout (setup and test session)
  - Add state management for test flow
  - Implement error boundary
  - _Requirements: 15.1, 13.2, 14.3_

- [ ] 10.2 Build Mock Test setup screen
  - Display test instructions and overview
  - Add jurisdiction selector for test content
  - Show time limit and question count
  - Display "Start Test" button to begin
  - Add confirmation dialog before starting
  - _Requirements: 15.1_

- [ ] 10.3 Implement Mock Test data fetching
  - Call useContentItems with filters for mock-test type and jurisdiction
  - Fetch appropriate number of questions for full test
  - Initialize useActivityRecorder for test performance tracking
  - Handle loading and error states
  - _Requirements: 15.1, 14.1_

- [ ] 10.4 Build Mock Test session interface
  - Create full-screen test environment
  - Implement countdown timer with auto-submit on expiry
  - Build question navigation sidebar showing all questions
  - Display answered and flagged indicators for each question
  - Reuse QuestionDisplay component for question rendering
  - Add flag-for-review functionality
  - Implement submit test button with confirmation dialog
  - _Requirements: 15.1, 15.2, 15.3_

- [ ] 10.5 Build Mock Test results screen
  - Display final score and pass/fail indicator
  - Show accuracy percentage and time used
  - Create topic breakdown showing performance per topic
  - Build detailed review section with QuestionReviewCard components
  - Show correct/incorrect for each question with explanations
  - Display recommendations panel for improvement
  - Add buttons to retake test or return to dashboard
  - _Requirements: 15.4, 15.5_

- [ ]* 10.6 Write end-to-end tests for Mock Test
  - Test complete mock test flow from setup to results
  - Test timer countdown and auto-submit
  - Test question navigation and flag functionality
  - Test results display with topic breakdown
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

- [ ] 11. Implement real-time features and cross-tab synchronization
- [ ] 11.1 Set up WebSocket connection management
  - Verify existing WebSocket manager from foundation layer
  - Create connection initialization on app mount
  - Implement reconnection logic with exponential backoff
  - Add connection state monitoring
  - Handle authentication for WebSocket connections
  - _Requirements: 10.3, 14.1_

- [ ] 11.2 Implement progress update subscriptions
  - Subscribe to user-specific progress channel on dashboard mount
  - Listen for progress update messages from backend
  - Update ProgressContext when messages received
  - Trigger re-renders of subscribed components
  - Add error handling for message parsing
  - _Requirements: 10.3, 10.4_

- [ ] 11.3 Implement cross-tab synchronization with BroadcastChannel
  - Create BroadcastChannel for cross-tab communication
  - Broadcast progress updates to other tabs when activity recorded
  - Listen for broadcasts in all tabs and update ProgressContext
  - Ensure no duplicate API calls across tabs
  - Handle tab close cleanup
  - _Requirements: 10.1, 10.2_

- [ ] 11.4 Implement achievement notifications
  - Subscribe to achievement channel for real-time achievement unlocks
  - Display toast notifications with celebration animations
  - Show achievement details in modal on click
  - Broadcast achievement to all tabs
  - Track viewed achievements to prevent duplicate notifications
  - _Requirements: 10.4_

- [ ]* 11.5 Write integration tests for real-time features
  - Test WebSocket connection and reconnection
  - Test progress update message handling
  - Test cross-tab synchronization
  - Test achievement notifications
  - _Requirements: 10.1, 10.3, 10.4_

- [ ] 12. Implement offline support and activity queueing
- [ ] 12.1 Set up offline detection
  - Listen to navigator.onLine events for offline/online detection
  - Implement periodic heartbeat check (30 second interval)
  - Update UI state when offline detected
  - Display offline banner when connection lost
  - _Requirements: 11.1, 14.1_

- [ ] 12.2 Implement offline activity queue
  - Create IndexedDB database for offline activity storage
  - Queue activities when offline instead of sending to backend
  - Store activities with timestamp and order
  - Display immediate UI feedback for queued activities
  - _Requirements: 11.2, 11.3_

- [ ] 12.3 Implement offline content caching
  - Cache lesson data when loaded while online
  - Allow viewing cached lessons while offline
  - Cache user progress (last synced state)
  - Display "cached content" indicator when offline
  - _Requirements: 11.2_

- [ ] 12.4 Implement activity sync on reconnection
  - Detect when connection is restored
  - Process offline queue in order
  - Send batched activities to backend
  - Handle sync errors with retry logic
  - Update progress after successful sync
  - Display "Your offline progress has been saved" notification
  - Clear queue after successful sync
  - _Requirements: 11.4, 11.5_

- [ ]* 12.5 Write end-to-end tests for offline support
  - Test offline detection and banner display
  - Test activity queueing while offline
  - Test cached content viewing
  - Test sync on reconnection
  - Test error handling during sync
  - _Requirements: 11.1, 11.2, 11.4, 11.5_


- [ ] 13. Implement accessibility features
- [ ] 13.1 Implement keyboard navigation
  - Add global keyboard shortcuts (Tab, Enter, Escape, ?)
  - Implement page-specific shortcuts (lesson: 1-4 for choices, Enter to submit, N for next)
  - Add skip links at top of each page ("Skip to main content")
  - Implement focus trap for modals and dialogs
  - Ensure logical tab order throughout application
  - Add visible focus indicators (2px solid outline) meeting WCAG standards
  - _Requirements: 12.1, 12.4_

- [ ] 13.2 Implement screen reader support
  - Add ARIA live regions for dynamic content updates (role="status" for progress, role="alert" for errors)
  - Use semantic HTML elements (header, nav, main, aside, article, section)
  - Add ARIA labels for icon buttons and custom components
  - Implement screen reader announcements for question feedback, progress updates, achievements
  - Ensure all images have descriptive alt text or marked as decorative
  - Add ARIA labelledby and describedby for complex widgets
  - _Requirements: 12.2, 12.3_

- [ ] 13.3 Implement motion preferences
  - Detect prefers-reduced-motion media query
  - Disable animations when reduced motion preferred
  - Apply to celebration animations, transitions, progress animations
  - Provide instant state changes instead of animated transitions
  - _Requirements: 12.5_

- [ ] 13.4 Implement high contrast mode support
  - Detect prefers-contrast media query
  - Apply high-contrast theme when requested
  - Ensure all text meets WCAG AA contrast ratios (4.5:1 normal, 3:1 large)
  - Never rely on color alone to convey information
  - _Requirements: 12.3_

- [ ]* 13.5 Run accessibility audits and fix issues
  - Run axe-core automated testing on all pages
  - Perform manual keyboard-only navigation testing
  - Test with screen readers (NVDA, JAWS, VoiceOver)
  - Validate WCAG 2.1 Level AA compliance
  - Fix all identified accessibility issues
  - _Requirements: 12.1, 12.2, 12.3, 12.5_

- [ ] 14. Implement performance optimizations
- [ ] 14.1 Implement code splitting
  - Configure Next.js dynamic imports for all page routes
  - Lazy load heavy components (charts, video player, bulk operations)
  - Split vendor chunks appropriately
  - Validate bundle sizes meet targets (<200KB initial, <100KB per route)
  - _Requirements: 13.1, 13.5_

- [ ] 14.2 Implement data prefetching
  - Add prefetch on mount for dashboard recommended lessons
  - Implement hover prefetch for lesson cards (500ms delay)
  - Prefetch next lesson at 80% completion in lesson view
  - Prefetch search result top 3 on hover
  - _Requirements: 13.3, 13.4_

- [ ] 14.3 Implement image optimization
  - Use Next.js Image component throughout application
  - Configure responsive image sizes
  - Add lazy loading for below-fold images
  - Set priority for above-fold images
  - Generate blur placeholders for progressive loading
  - _Requirements: 13.1_

- [ ] 14.4 Implement rendering optimizations
  - Add useMemo for expensive computations (sorting, filtering)
  - Use React.memo for expensive components
  - Implement virtual scrolling for long lists (search results, question history)
  - Debounce user inputs (search 300ms, filters 500ms)
  - _Requirements: 13.1_

- [ ]* 14.5 Run performance audits and optimize
  - Run Lighthouse audits on all pages
  - Validate performance metrics (FCP <1.5s, LCP <2.5s, TTI <3.5s)
  - Test with slow 3G network and 4x CPU throttling
  - Optimize any pages not meeting targets
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_


- [ ] 15. Implement error handling and resilience
- [ ] 15.1 Create error boundary components
  - Implement route-level error boundary for catastrophic errors
  - Implement feature-level error boundary for component errors
  - Create error fallback UI with recovery options (retry, go back, contact support)
  - Add error logging to monitoring service
  - Preserve user state where possible on error
  - _Requirements: 14.3_

- [ ] 15.2 Implement API error handling
  - Handle network errors with offline banner and cached data
  - Handle authentication errors with redirect to sign-in
  - Handle validation errors with inline field messages
  - Handle server errors with user-friendly messages and retry
  - Handle not found errors with helpful suggestions
  - _Requirements: 14.1, 14.2, 14.4, 14.5_

- [ ] 15.3 Implement retry logic with exponential backoff
  - Configure retry for transient failures (3 attempts, 1s, 2s, 4s delays)
  - Display retry count and next attempt time to user
  - Provide manual retry button
  - Stop retrying after max attempts and show error
  - _Requirements: 14.1_

- [ ] 15.4 Integrate circuit breaker pattern
  - Verify circuit breaker configuration in existing client
  - Display appropriate UI when circuit is open (service unavailable banner)
  - Show cached data when available during circuit open
  - Display reconnecting indicator during half-open state
  - _Requirements: 14.1_

- [ ] 15.5 Implement form validation
  - Add client-side validation for all form inputs
  - Display inline validation errors on blur or submit
  - Validate required fields, formats, ranges, file sizes
  - Disable submit buttons during processing
  - Show success feedback after successful submission
  - _Requirements: 14.2_

- [ ]* 15.6 Write integration tests for error handling
  - Test error boundary catches and displays errors
  - Test API error handling for each error type
  - Test retry logic with mock failures
  - Test circuit breaker behavior
  - Test form validation
  - _Requirements: 14.1, 14.2, 14.3_

- [ ] 16. Implement navigation and routing
- [ ] 16.1 Set up Next.js App Router structure
  - Verify Next.js 13+ App Router configuration
  - Create route groups for authenticated and public routes
  - Set up layout components for different sections
  - Configure middleware for authentication checks
  - _Requirements: 1.1, 2.1_

- [ ] 16.2 Implement navigation menu component
  - Create main navigation menu with links to all pages
  - Highlight active route
  - Add icons for each navigation item
  - Make responsive for mobile (hamburger menu)
  - Add keyboard navigation support
  - _Requirements: 12.1_

- [ ] 16.3 Implement breadcrumb navigation
  - Add breadcrumbs for deep pages (lesson view, search results)
  - Make breadcrumb items clickable for navigation
  - Update breadcrumbs based on current route
  - Add ARIA labels for accessibility
  - _Requirements: 12.2_

- [ ] 16.4 Implement route transitions
  - Add loading indicators during route changes
  - Implement smooth page transitions
  - Preserve scroll position on back navigation
  - Handle route errors gracefully
  - _Requirements: 13.1_

- [ ] 17. Final integration and polish
- [ ] 17.1 Integrate all pages with navigation
  - Ensure all pages are accessible from navigation menu
  - Verify all internal links work correctly
  - Test navigation flow between all pages
  - Ensure consistent layout across pages
  - _Requirements: 1.1, 2.1_

- [ ] 17.2 Implement loading states consistently
  - Use skeleton loaders for initial page loads
  - Use spinners for button actions
  - Display progress indicators for long operations
  - Ensure loading states are accessible
  - _Requirements: 13.2_

- [ ] 17.3 Implement empty states
  - Create empty state components for no data scenarios
  - Add helpful messages and call-to-action buttons
  - Use illustrations or icons for visual appeal
  - Ensure empty states are accessible
  - _Requirements: 8.3_

- [ ] 17.4 Add meta tags and SEO optimization
  - Add title tags for all pages
  - Add description meta tags
  - Add Open Graph tags for social sharing
  - Add canonical URLs
  - Configure robots.txt and sitemap
  - _Requirements: 13.1_

- [ ] 17.5 Implement analytics tracking
  - Integrate analytics tracking for key user actions
  - Track lesson started, question answered, lesson completed
  - Track daily goal reached, streak maintained, achievement earned
  - Track search performed, filter applied
  - Use existing AnalyticsContext for event sending
  - _Requirements: 9.1_

- [ ] 17.6 Perform cross-browser testing
  - Test on Chrome, Firefox, Safari, Edge
  - Test on mobile browsers (iOS Safari, Chrome Mobile)
  - Test on tablet browsers
  - Fix any browser-specific issues
  - _Requirements: 13.1_

- [ ] 17.7 Perform final end-to-end testing
  - Test complete new user flow (onboarding → first lesson → completion)
  - Test returning user flow (dashboard → continue learning → progress update)
  - Test search and discovery flow
  - Test practice mode with adaptive difficulty
  - Test mock test complete flow
  - Test offline/online transitions
  - Test cross-tab synchronization
  - _Requirements: 1.1, 1.5, 2.1, 2.5, 3.2, 7.3, 11.1, 11.5, 15.1_

- [ ]* 17.8 Perform final accessibility audit
  - Run comprehensive accessibility testing
  - Validate WCAG 2.1 Level AA compliance
  - Test with multiple screen readers
  - Test keyboard-only navigation
  - Fix any remaining accessibility issues
  - _Requirements: 12.1, 12.2, 12.3, 12.5_

- [ ]* 17.9 Perform final performance audit
  - Run Lighthouse on all pages
  - Validate all performance metrics meet targets
  - Test on slow networks and low-end devices
  - Optimize any remaining performance issues
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

## Implementation Notes

- All tasks should be implemented using the existing foundation layer (hooks, contexts, utilities)
- Never create direct API calls - always use the provided hooks
- Follow the layer architecture strictly (Layer 3 → Layer 2 → Layer 1)
- Each task should result in production-ready, fully functional code
- Test tasks marked with `*` are optional but recommended
- All components must be accessible and performant from the start
- Progress should be saved after every user action
- Real-time updates should work across all tabs
- Offline support should be seamless and transparent to users

## Success Criteria

The implementation will be considered complete when:
1. All non-optional tasks are completed and integrated
2. Users can complete the entire learning journey from onboarding to lesson completion
3. All pages load within performance targets (FCP <1.5s, LCP <2.5s, TTI <3.5s)
4. All pages meet WCAG 2.1 Level AA accessibility standards
5. Offline support works seamlessly with automatic sync on reconnection
6. Real-time updates work across multiple tabs
7. Adaptive difficulty adjusts based on user performance
8. Spaced repetition schedules reviews appropriately
9. All error scenarios are handled gracefully with recovery options
10. Cross-browser testing passes on all major browsers
