# Design Document

## Overview

This design document outlines the comprehensive frontend integration architecture for the notification service in a Duolingo-inspired learning platform. The system implements a five-layer component hierarchy following atomic design principles, utilizing all 30+ backend REST endpoints across 7 functional domains while maintaining consistency with existing authentication, user, and content service integrations.

### Design Goals

1. **Complete Backend Integration**: Utilize every notification service endpoint without exception
2. **Atomic Design Methodology**: Build from smallest reusable units upward through increasingly complex compositions
3. **Type Safety**: Enforce end-to-end TypeScript typing matching backend contracts exactly
4. **Real-Time Capability**: Provide instant notification delivery via WebSocket with automatic reconnection
5. **Accessibility First**: Ensure WCAG 2.1 AA compliance with keyboard navigation and screen reader support
6. **Performance Optimized**: Implement virtual scrolling, code splitting, and optimistic updates
7. **Mobile Responsive**: Touch-optimized interactions with swipe gestures and pull-to-refresh
8. **Fault Tolerant**: Circuit breaker patterns, graceful degradation, and comprehensive error handling

### Architecture Principles

- **Separation of Concerns**: Communication layer completely abstracted from UI components
- **Composition Over Inheritance**: Components compose cleanly with single responsibility
- **Progressive Enhancement**: Core functionality works without JavaScript, enhanced with interactivity
- **Optimistic UI**: Immediate feedback with rollback on failure
- **Cache-First Strategy**: React Query for server state with appropriate stale times
- **Event-Driven Updates**: WebSocket subscriptions for real-time synchronization

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend Application                         │
├─────────────────────────────────────────────────────────────────┤
│  Template Layer (Pages)                                          │
│  ├─ NotificationsPage                                           │
│  ├─ NotificationSettingsPage                                    │
│  └─ NotificationAnalyticsPage (Admin)                           │
├─────────────────────────────────────────────────────────────────┤
│  Organism Layer (Feature Sections)                              │
│  ├─ NotificationList          ├─ NotificationScheduler          │
│  ├─ NotificationCenter        ├─ NotificationTemplateManager    │
│  ├─ NotificationPreferences   ├─ NotificationAnalyticsDashboard │
│  ├─ DeviceTokenManager        ├─ AchievementNotification        │
│  ├─ PushPermissionFlow        ├─ SpacedRepetitionReminder       │
│  └─ NotificationToastSystem   └─ StreakReminder                 │
├─────────────────────────────────────────────────────────────────┤
│  Molecular Layer (Composite Elements)                           │
│  ├─ NotificationCard          ├─ NotificationGroupHeader        │
│  ├─ NotificationFilterBar     ├─ EmptyNotificationState         │
│  └─ NotificationSkeleton      └─ NotificationTypeIcon           │
├─────────────────────────────────────────────────────────────────┤
│  Atomic Layer (Shadcn Extensions)                               │
│  ├─ NotificationBadge         ├─ NotificationActionButton       │
│  ├─ NotificationIcon          ├─ NotificationStatusIndicator    │
│  ├─ NotificationTimestamp     └─ NotificationPriorityBadge      │
├─────────────────────────────────────────────────────────────────┤
│  Custom Hooks Layer                                             │
│  ├─ useNotifications          ├─ useNotificationPreferences     │
│  ├─ useNotificationMutations  ├─ useDeviceTokens               │
│  ├─ useNotificationCounts     ├─ useScheduledNotifications      │
│  ├─ useRealtimeNotifications  ├─ useNotificationTemplates       │
│  ├─ useAchievementNotif...    ├─ useNotificationAnalytics       │
│  ├─ useSpacedRepetition...    ├─ usePushPermission              │
│  ├─ useStreakReminders        └─ useNotificationSound           │
│  └─ useMockTestReminders                                        │
├─────────────────────────────────────────────────────────────────┤
│  Communication Layer                                            │
│  ├─ API Client (REST)         ├─ Error Handler                  │
│  ├─ WebSocket Client          ├─ Retry Manager                  │
│  ├─ Circuit Breaker           └─ Cache Manager                  │
├─────────────────────────────────────────────────────────────────┤
│  State Management                                               │
│  ├─ React Query (Server State)                                  │
│  ├─ Local Storage (Preferences Cache)                           │
│  └─ URL State (Filters & Pagination)                            │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│              Notification Service Backend (30+ Endpoints)        │
│  ├─ Core CRUD Operations      ├─ Analytics & Tracking           │
│  ├─ Device Token Management   ├─ Health Monitoring              │
│  ├─ Template System           └─ A/B Testing                    │
│  ├─ Learning Notifications                                      │
│  └─ Scheduling System                                           │
└─────────────────────────────────────────────────────────────────┘
```


### Data Flow Architecture

```
User Action → Component → Hook → API Client → Backend
                ↓           ↓
            Optimistic   React Query
              Update      Cache
                ↓           ↓
            Rollback    Invalidation
            on Error    on Success

WebSocket → Event Handler → Hook → React Query Cache → Component Re-render
```

### Component Hierarchy

The system follows a strict five-layer hierarchy:

**Layer 1: Atomic Components** - Shadcn UI extensions with notification-specific behavior
**Layer 2: Molecular Components** - Composite elements combining atomic components
**Layer 3: Organism Components** - Complete feature sections with business logic
**Layer 4: Specialized Components** - Notification type-specific implementations
**Layer 5: Template Components** - Full-page compositions

## Components and Interfaces

### Layer 1: Atomic Components

#### NotificationBadge

**Purpose**: Display notification counts with intelligent behavior

**Props Interface**:
```typescript
interface NotificationBadgeProps {
  count: number;
  variant?: 'unread' | 'urgent' | 'normal';
  maxCount?: number;
  showZero?: boolean;
  className?: string;
}
```

**Behavior**:
- Shows count when > 0, displays "99+" when exceeding maxCount
- Pulses when count increases (new notification indicator)
- Color-coded by variant (blue/red/gray)
- ARIA label: "X unread notifications"

**Integration**: Extends Shadcn Badge component

---

#### NotificationIcon

**Purpose**: Visual representation of notification types with priority styling

**Props Interface**:
```typescript
interface NotificationIconProps {
  type: NotificationType;
  iconUrl?: string;
  priority: NotificationPriority;
  isRead: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}
```

**Behavior**:
- Type-specific default icons (trophy, flame, clipboard, gear, etc.)
- Priority-based styling (urgent: red pulse, high: orange glow, normal: blue)
- Read state affects opacity (60% when read)
- Fallback to bell icon on error

**Integration**: Extends Shadcn Avatar component

---

#### NotificationTimestamp

**Purpose**: Display notification time with timezone awareness

**Props Interface**:
```typescript
interface NotificationTimestampProps {
  timestamp: Date;
  format?: 'relative' | 'absolute' | 'both';
  timezone?: string;
  className?: string;
}
```

**Behavior**:
- Relative time for recent (2m ago, 1h ago)
- Absolute dates for older (Jan 15, Yesterday)
- Tooltip shows exact timestamp
- Auto-updates every minute for recent times
- Uses date-fns for internationalization

**Integration**: Custom component using HTML time element

---

#### NotificationActionButton

**Purpose**: Actionable buttons for notification operations

**Props Interface**:
```typescript
interface NotificationActionButtonProps {
  action: 'markRead' | 'markUnread' | 'delete' | 'snooze' | 'open' | 'archive';
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  onAction: () => void | Promise<void>;
  className?: string;
}
```

**Behavior**:
- Optimistic UI with loading states
- Confirmation dialogs for destructive actions
- Success/error animations
- Keyboard accessible (Enter/Space)
- ARIA labels describing action

**Integration**: Extends Shadcn Button component

---

#### NotificationStatusIndicator

**Purpose**: Visual status representation

**Props Interface**:
```typescript
interface NotificationStatusIndicatorProps {
  status: 'pending' | 'delivered' | 'read' | 'clicked' | 'failed' | 'scheduled';
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}
```

**Behavior**:
- Color-coded dots (gray/blue/green/purple/red/orange)
- Pulse animation for in-progress states
- Tooltip with detailed status information
- Compound indicator for delivery + engagement

**Integration**: Custom component

---

#### NotificationPriorityBadge

**Purpose**: Priority level visualization

**Props Interface**:
```typescript
interface NotificationPriorityBadgeProps {
  priority: NotificationPriority;
  showLabel?: boolean;
  size?: BadgeSize;
  className?: string;
}
```

**Behavior**:
- Icon-only or text display modes
- Color-coded (gray/blue/orange/red)
- Icon indicators (arrow-down/minus/arrow-up/alert)
- Pulse animation for urgent/critical

**Integration**: Extends Shadcn Badge component



### Layer 2: Molecular Components

#### NotificationCard

**Purpose**: Complete individual notification display

**Props Interface**:
```typescript
interface NotificationCardProps {
  notification: Notification;
  compact?: boolean;
  showActions?: boolean;
  onRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  onClick?: (notification: Notification) => void;
  onSnooze?: (id: string, duration: number) => void;
  onArchive?: (id: string) => void;
  className?: string;
}
```

**Composition**:
- NotificationIcon
- Title text (h3)
- Body content (p with markdown support)
- NotificationTimestamp
- NotificationActionButton[] (read, delete, snooze, archive)
- NotificationStatusIndicator
- NotificationPriorityBadge

**Behavior**:
- Unread visual distinction (bold text, blue left border, lighter background)
- Click expands truncated content or navigates to action URL
- Swipe-to-delete on mobile with visual feedback
- Hover reveals action buttons on desktop
- Image/icon display with Next.js Image optimization
- Markdown rendering for rich content
- Error boundary for rendering failures

**State Management**: Uses useNotificationMutations hook

---

#### NotificationFilterBar

**Purpose**: Comprehensive filtering controls

**Props Interface**:
```typescript
interface NotificationFilterBarProps {
  filters: NotificationQueryParams;
  onFilterChange: (filters: NotificationQueryParams) => void;
  availableTypes: NotificationType[];
  showSearch?: boolean;
  className?: string;
}
```

**Composition**:
- Shadcn Select (type filter)
- Shadcn Toggle (read/unread status)
- Shadcn Popover + DateRangePicker (time filtering)
- Shadcn Input (search with debouncing)
- Clear filters button
- Filter count badge

**Behavior**:
- Multi-select type filter with checkboxes
- Three-state status toggle (all/unread/read)
- Date range presets + custom calendar picker
- Real-time search with 300ms debounce
- URL synchronization for shareable links
- Mobile-responsive (stacks vertically)

**State Management**: Local state with URL sync

---

#### NotificationGroupHeader

**Purpose**: Section headers for grouped notifications

**Props Interface**:
```typescript
interface NotificationGroupHeaderProps {
  title: string;
  count: number;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  actions?: React.ReactNode;
  className?: string;
}
```

**Composition**:
- Shadcn Heading
- NotificationBadge (count)
- Collapse toggle button
- Optional action buttons

**Behavior**:
- Animated collapse using Shadcn Collapsible
- Chevron rotation on collapse
- Sticky positioning on scroll
- Local storage for collapsed state persistence
- Keyboard navigation (Enter/Space to toggle)

**State Management**: Local state + localStorage

---

#### EmptyNotificationState

**Purpose**: Contextual empty state display

**Props Interface**:
```typescript
interface EmptyNotificationStateProps {
  type: 'no-notifications' | 'filtered-empty' | 'error' | 'no-permission';
  onAction?: () => void;
  className?: string;
}
```

**Composition**:
- Icon (appropriate to type)
- Heading text
- Description text
- Optional CTA button

**Variants**:
- **no-notifications**: Friendly illustration, "No notifications yet"
- **filtered-empty**: Filter icon, "No matching notifications", "Clear filters" button
- **error**: Alert icon, error details, "Try again" button
- **no-permission**: Bell-off icon, enable instructions, "Enable notifications" button

**Behavior**:
- Fade-in animation
- Vertically centered in available space
- Responsive layout

---

#### NotificationSkeleton

**Purpose**: Loading placeholder

**Props Interface**:
```typescript
interface NotificationSkeletonProps {
  count?: number;
  compact?: boolean;
  className?: string;
}
```

**Composition**:
- Shimmer effect matching NotificationCard structure
- Icon circle placeholder
- Title bar placeholder
- Body text lines (2) placeholders
- Timestamp placeholder
- Action button placeholders

**Behavior**:
- Animated shimmer gradient
- Randomized widths (60-90%) for natural appearance
- Stagger animation (50ms delay between items)
- ARIA busy state
- Smooth crossfade to actual content

---

#### NotificationTypeIcon

**Purpose**: Specialized icon for notification types

**Props Interface**:
```typescript
interface NotificationTypeIconProps {
  type: NotificationType;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  className?: string;
}
```

**Behavior**:
- Type-specific Lucide React icons
- Type-specific color theming
- Optional entrance animation (scale-up + fade-in)
- Glow effect for important types
- Fallback to bell icon for unknown types

**Icon Mapping**:
- achievement → Trophy (gold)
- streak_reminder → Flame (orange)
- mock_test_reminder → Clipboard (blue)
- system → Settings (gray)
- mentoring → User (purple)
- course_update → BookOpen (green)
- spaced_repetition → Bell (blue)



### Layer 3: Organism Components

#### NotificationList

**Purpose**: Main notification feed with infinite scroll

**Props Interface**:
```typescript
interface NotificationListProps {
  userId: string;
  initialFilters?: NotificationQueryParams;
  groupBy?: 'none' | 'date' | 'type';
  pageSize?: number;
  enableRealtime?: boolean;
  className?: string;
}
```

**Composition**:
- NotificationFilterBar
- Virtualized list (react-window) of NotificationCard[]
- NotificationGroupHeader[] (when grouped)
- EmptyNotificationState
- NotificationSkeleton (loading)
- Bulk action toolbar

**Features**:
- Infinite scroll with intersection observer
- Virtual scrolling for 50+ notifications
- Real-time updates via WebSocket
- Optimistic UI for mutations
- Group by date (Today/Yesterday/This Week/Older)
- Group by type (Achievement/Streak/Test/etc.)
- Bulk actions (mark all read, delete selected)
- Pull-to-refresh on mobile
- Error boundary with retry

**Hooks Used**:
- useInfiniteNotifications (pagination)
- useRealtimeNotifications (WebSocket)
- useNotificationMutations (actions)

**State Management**:
- React Query cache (staleTime: 30s)
- WebSocket subscription lifecycle
- URL state for filters

---

#### NotificationCenter

**Purpose**: Dropdown notification center

**Props Interface**:
```typescript
interface NotificationCenterProps {
  trigger?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  maxHeight?: number;
  showPreferences?: boolean;
  className?: string;
}
```

**Composition**:
- Header (title + NotificationBadge + actions)
- NotificationList (compact mode, max 50 items)
- Footer ("View All" link)
- Shadcn Popover (desktop) / Sheet (mobile)

**Features**:
- Trigger with NotificationBellIcon + unread badge
- Pulse animation on new notifications
- Auto-close on outside click / Escape
- Keyboard navigation (Tab through items)
- Real-time count updates
- Mark all read action
- Settings link

**Hooks Used**:
- useNotifications (recent 50)
- useNotificationCounts (badge)
- useNotificationMutations (mark read)

**Behavior**:
- Desktop: Popover with blur backdrop
- Mobile: Full-screen or bottom sheet
- Focus trap when open
- Focus returns to trigger on close

---

#### NotificationPreferencesPanel

**Purpose**: Comprehensive notification settings

**Props Interface**:
```typescript
interface NotificationPreferencesPanelProps {
  userId: string;
  onSave?: (preferences: NotificationPreferences) => void;
  showAdvanced?: boolean;
  className?: string;
}
```

**Composition**:
- Type toggles section (enable/disable per type)
- Channel selectors (push/email/in-app/SMS per type)
- Quiet hours configuration (time range + days + timezone)
- Frequency settings (immediate/batched/daily/weekly per type)
- Global limits (max per day/hour)
- Critical override toggle
- Save/Cancel buttons
- Preview section

**Features**:
- Form state with react-hook-form
- Validation with Zod schema
- Optimistic updates with rollback
- Success/error messages
- Preview with example notifications
- Local storage caching

**Hooks Used**:
- useNotificationPreferences (fetch/update)

**Validation Rules**:
- Start time before end time for quiet hours
- At least one channel enabled per active type
- Reasonable limits (1-100/day, 1-20/hour)

---

#### DeviceTokenManager

**Purpose**: Device management interface

**Props Interface**:
```typescript
interface DeviceTokenManagerProps {
  userId: string;
  onTokenRegistered?: (token: DeviceToken) => void;
  className?: string;
}
```

**Composition**:
- Device list (DeviceCard[])
- Register device button
- Remove confirmation dialog
- Empty state

**DeviceCard displays**:
- Platform icon (Apple/Android/Chrome)
- Device model + OS version
- App version (mobile)
- Last used timestamp
- Active/inactive status
- Remove button

**Features**:
- Active devices first (sorted by last used)
- Inactive devices in separate section
- Browser permission flow on register
- FCM token generation
- Educational content for denied permission
- Optimistic removal with rollback

**Hooks Used**:
- useDeviceTokens (list/register/remove)
- usePushPermission (browser permission)

**Endpoints Used**:
- GET /notifications/tokens/:userId
- POST /notifications/tokens/register
- DELETE /notifications/tokens/:userId/:token

---

#### PushPermissionFlow

**Purpose**: Multi-step permission guidance

**Props Interface**:
```typescript
interface PushPermissionFlowProps {
  onComplete?: (token: string) => void;
  onSkip?: () => void;
  autoShow?: boolean;
  className?: string;
}
```

**Composition**:
- Shadcn Dialog (modal)
- Step 1: Benefits explanation + illustrations
- Step 2: Permission request + loading
- Step 3: Success/failure result

**Steps**:
1. **Explanation**: Benefits with icons, "Enable" / "Not Now" buttons
2. **Request**: Browser permission dialog, loading state
3. **Result**: 
   - Success: Checkmark, "You're all set", enabled types list
   - Failure: Alert icon, platform-specific instructions, "Try Again" / "Skip"

**Features**:
- FCM token registration on success
- Platform-specific instructions (Chrome/Safari/Mobile)
- "Don't ask again" checkbox (localStorage)
- Error handling for token generation failure

**Hooks Used**:
- useDeviceTokens (register)
- usePushPermission (permission state)



#### NotificationScheduler

**Purpose**: View and manage scheduled notifications

**Props Interface**:
```typescript
interface NotificationSchedulerProps {
  userId: string;
  view?: 'list' | 'calendar';
  editable?: boolean;
  className?: string;
}
```

**Composition**:
- View toggle (list/calendar)
- Calendar view (Shadcn Calendar)
- List view (chronological with groups)
- Cancel/reschedule dialogs
- Filter controls

**Features**:
- Calendar shows dots on dates with scheduled notifications
- Click date shows notifications in popover
- List groups: Today/Tomorrow/This Week/Next Week/Later
- Recurring notification indication
- Cancel single occurrence or entire series
- Reschedule with timezone support
- Filter by type and date range

**Hooks Used**:
- useScheduledNotifications (fetch/cancel/reschedule)

**Endpoints Used**:
- GET /notifications/schedule
- DELETE /notifications/:id
- PATCH /notifications/schedule/:id/reschedule

---

#### NotificationTemplateManager (Admin)

**Purpose**: Create and manage templates

**Props Interface**:
```typescript
interface NotificationTemplateManagerProps {
  onSave?: (template: NotificationTemplate) => void;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
  className?: string;
}
```

**Composition**:
- Template list (search + filters + sort)
- Template editor (form with rich text)
- Preview pane (rendered output)
- Variable helper reference

**Template List Features**:
- Search by name/description (300ms debounce)
- Filter by type
- Sort by name/date/status
- Create/edit/duplicate/delete actions
- Active/inactive status toggle

**Template Editor Features**:
- Name, description, type inputs
- Subject line field
- Rich text editor (Tiptap) with toolbar
- Variable insertion button
- Required variables validation
- Preview with sample data
- Version control

**Hooks Used**:
- useNotificationTemplates (CRUD operations)

**Endpoints Used**:
- GET /notifications/templates
- POST /notifications/templates
- GET /notifications/templates/:id
- PATCH /notifications/templates/:id
- DELETE /notifications/templates/:id
- POST /notifications/templates/:id/render

---

#### NotificationAnalyticsDashboard (Admin)

**Purpose**: Comprehensive analytics interface

**Props Interface**:
```typescript
interface NotificationAnalyticsDashboardProps {
  userId?: string; // Optional for user-specific vs global
  dateRange: { start: Date; end: Date };
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  className?: string;
}
```

**Composition**:
- Metric cards (4 key metrics)
- Delivery chart (time-series line)
- Engagement chart (combination chart)
- A/B test results table
- Type breakdown (horizontal bar chart)
- Channel performance (grouped bar chart)
- Filter controls
- Export button

**Key Metrics**:
1. **Delivery Rate**: % successfully delivered
2. **Open Rate**: % of delivered opened
3. **Click Rate**: % of opened clicked
4. **Engagement Score**: Composite metric

**Charts** (using Recharts):
- Delivery: Line chart (sent/delivered/failed over time)
- Engagement: Combo chart (open/click rates + total volume)
- Type Breakdown: Horizontal bar (distribution by type)
- Channel Performance: Grouped bar (metrics by channel)

**Features**:
- Date range presets + custom picker
- Type and segment filters
- Real-time updates toggle (30s refresh)
- Export to CSV/PDF
- Drill-down to detailed views

**Hooks Used**:
- useNotificationAnalytics (fetch metrics)

**Endpoints Used**:
- GET /notifications/analytics/delivery
- GET /notifications/analytics/engagement
- GET /notifications/analytics/ab-test-results
- GET /notifications/analytics/report

---

#### NotificationToastSystem

**Purpose**: Real-time toast notification manager

**Props Interface**:
```typescript
interface NotificationToastSystemProps {
  position?: 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center';
  maxToasts?: number;
  autoClose?: boolean;
  enableSound?: boolean;
  className?: string;
}
```

**Composition**:
- Toast container (fixed positioning)
- Multiple Toast instances (NotificationCard compact)
- Queue management logic
- Connection status indicator

**Features**:
- Stacked toasts (8px gap, slide-in animation)
- Auto-dismiss with progress bar (5s default)
- Pause on hover
- Swipe to dismiss (mobile)
- Priority-based display (urgent bypasses queue)
- Notification sound (respects preferences)
- Vibration (mobile, urgent only)
- Notification grouping (stack same type)
- Offline queuing (localStorage)
- Deduplication (by ID)

**Integration**:
- Uses sonner toast library
- WebSocket via useRealtimeNotifications
- Sound via useNotificationSound

**Behavior**:
- Desktop: Top-right by default
- Mobile: Bottom-center for thumb reach
- Max 3 visible, queue overflow
- Urgent notifications interrupt

---

#### NotificationBellIcon

**Purpose**: Global notification trigger

**Props Interface**:
```typescript
interface NotificationBellIconProps {
  position?: 'left' | 'center' | 'right';
  showBadge?: boolean;
  badgeVariant?: 'unread' | 'urgent' | 'normal';
  className?: string;
}
```

**Composition**:
- Bell icon (Lucide React)
- NotificationBadge (overlay)
- NotificationCenter (popover)

**Features**:
- Animated shake on new notification
- Unread count badge with pulse
- Click opens NotificationCenter
- Keyboard accessible (Tab + Enter)
- Hover tooltip ("Notifications, X unread")
- Real-time badge updates

**Integration**:
- Placed in MainNavigation component
- Uses useNotificationCounts hook
- ARIA label with count
- ARIA expanded state



### Layer 4: Specialized Notification Components

#### AchievementNotification

**Purpose**: Celebration component for achievement unlocks

**Props Interface**:
```typescript
interface AchievementNotificationProps {
  achievement: {
    name: string;
    description: string;
    icon?: string;
    points?: number;
    rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    badgeUrl?: string;
    shareUrl?: string;
  };
  onShare?: (platform: string) => void;
  onDismiss?: () => void;
  autoShow?: boolean;
  className?: string;
}
```

**Composition**:
- Shadcn Dialog (modal with custom styling)
- Animated achievement icon
- Title + description
- Points badge (AnimatedNumber)
- Share button
- Action button ("View Achievement")
- Close button

**Features**:
- Confetti animation (canvas-confetti, 3s burst)
- Rarity-based colors (blue/green/purple/orange/gold)
- Scale-up entrance animation (0 → 1.2 → 1.0, 500ms, elastic easing)
- Glow effect (radial gradient)
- Sound effect (short fanfare, respects preferences)
- Haptic feedback (mobile vibration)
- Auto-dismiss after 10s (countdown progress ring)
- Social share (native dialog mobile, popover desktop)

**Hooks Used**:
- useAchievementNotifications (send/track)

**Endpoints Used**:
- POST /notifications/achievement
- POST /notifications/analytics/track-open

**Accessibility**:
- ARIA live region (assertive)
- Keyboard navigation
- Escape to dismiss
- Reduced motion support (disables animations/confetti)

---

#### SpacedRepetitionReminder

**Purpose**: Educational reminder for content review

**Props Interface**:
```typescript
interface SpacedRepetitionReminderProps {
  reminder: {
    topic: string;
    itemsDue: number;
    difficulty: 'easy' | 'medium' | 'hard';
    lastReview?: Date;
    optimalTiming: boolean;
  };
  onReview?: () => void;
  onSnooze?: (duration: number) => void;
  className?: string;
}
```

**Composition**:
- NotificationCard (specialized variant)
- Topic icon (NotificationTypeIcon)
- Title ("Time to review {{topic}}")
- Items due display
- Difficulty indicator (colored bars)
- Optimal timing badge
- Last review timestamp
- Review button (primary)
- Snooze button (secondary)
- Progress indicator
- Motivation text
- Estimated duration

**Features**:
- Difficulty bars (1-3, green/yellow/red)
- Optimal timing badge (green "Perfect timing!" or red "Overdue by X hours")
- Snooze options (1h/3h/6h/Tomorrow/Custom)
- Progress toward daily goal (0-100% bar)
- Motivation varies by streak/timing
- Estimated duration based on item count

**Hooks Used**:
- useSpacedRepetitionReminders (manage state)

**Endpoints Used**:
- POST /notifications/spaced-repetition
- POST /notifications/analytics/track-click

---

#### StreakReminder

**Purpose**: Motivational component for streak maintenance

**Props Interface**:
```typescript
interface StreakReminderProps {
  streak: {
    currentStreak: number;
    longestStreak: number;
    streakGoal?: number;
    lastActivity: Date;
    timeRemaining: number; // hours
  };
  onContinue?: () => void;
  onDismiss?: () => void;
  className?: string;
}
```

**Composition**:
- Notification card (vibrant gradient background)
- Animated flame icon (flicker animation)
- Current streak count (large number)
- Streak visualization (progress ring)
- Motivational message
- Urgency indicator (countdown)
- Longest streak display
- Streak history mini-chart (last 7 days)
- Continue button (primary)
- Activity suggestion text
- Dismiss button (subtle)
- Streak freeze indicator (if applicable)
- Social comparison (optional)

**Features**:
- Gradient background (orange to red)
- Flame flicker animation (CSS keyframes, 2s interval)
- Progress ring toward next milestone (7/30/100/365 days)
- Motivational messages vary by status
- Countdown color transitions (green → orange → red)
- Streak history icons (filled flame / empty circle)
- Activity suggestion based on learning path
- Streak freeze badge ("Protected")
- Social comparison ("Better than 73% of learners")
- Milestone celebration (special animation/sound)

**Hooks Used**:
- useStreakReminders (manage state)

**Endpoints Used**:
- POST /notifications/streak-reminder
- POST /notifications/analytics/track-click

---

#### MockTestReminder

**Purpose**: Test preparation component

**Props Interface**:
```typescript
interface MockTestReminderProps {
  testReminder: {
    testName: string;
    testType: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    estimatedDuration: number; // minutes
    userPassRate: number; // percentage
    averagePassRate: number; // percentage
    scheduledTime: Date;
    preparationTips?: string[];
  };
  onStart?: () => void;
  onReschedule?: (newTime: Date) => void;
  className?: string;
}
```

**Composition**:
- Notification card (academic theme, blue)
- Test icon (clipboard)
- Test name + type badge
- Difficulty indicator
- Estimated duration
- User pass rate vs platform average
- Readiness score (0-100%)
- Preparation tips (collapsible list)
- Topic coverage checklist
- Start test button (primary when ready)
- Reschedule button
- Calendar integration offer
- Test history (last attempt)
- Motivational framing
- Prerequisites checker

**Features**:
- Readiness score color-coded (red <60%, yellow 60-79%, green 80-100%)
- Preparation tips tailored to weak areas
- Topic coverage with checkmarks
- Calendar integration (add to device calendar)
- Test history (last date + score)
- Motivational messages based on readiness
- Prerequisites warning if not met

**Hooks Used**:
- useMockTestReminders (manage state)

**Endpoints Used**:
- POST /notifications/mock-test-reminder
- POST /notifications/analytics/track-click

---

#### SystemNotification

**Purpose**: General system message component

**Props Interface**:
```typescript
interface SystemNotificationProps {
  notification: Notification;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}
```

**Composition**:
- Notification card (priority-based styling)
- System icon (info/warning/error/success)
- Title (bold heading)
- Body (markdown support)
- Action button (optional)
- Dismiss button
- Expiration timer (time-sensitive)
- Image/video support
- Attachment list

**Features**:
- Priority styling (info: blue, warning: yellow, error: red, success: green)
- Markdown rendering (react-markdown with sanitization)
- Expandable body (>200 chars shows "Read more")
- Link handling (internal vs external)
- Image display (Next.js Image)
- Video embed (YouTube/Vimeo)
- Attachments (downloadable files)
- Persistent display for critical (non-dismissible until action/expiration)
- Read receipt tracking

**Endpoints Used**:
- POST /notifications (admin sends)
- POST /notifications/analytics/track-open

---

#### MentoringNotification

**Purpose**: Mentoring interaction component

**Props Interface**:
```typescript
interface MentoringNotificationProps {
  notification: {
    mentorName: string;
    mentorAvatar: string;
    messagePreview: string;
    conversationId: string;
    unread: boolean;
    timestamp: Date;
  };
  onReply?: () => void;
  onView?: () => void;
  className?: string;
}
```

**Composition**:
- Notification card (personal touch, warm styling)
- Mentor avatar (with online status)
- Mentor name + "Mentor" badge
- Message preview (first 100 chars)
- Unread indicator
- Reply button (primary)
- Quick reply suggestions (chips)
- View conversation button
- Conversation context
- Mentor availability indicator
- Mentorship relationship context
- Typing indicator (real-time)

**Features**:
- Online status (green dot if active)
- Verification checkmark (verified mentors)
- Quick replies ("Thank you!", "I'll try that", "Can you explain more?")
- Inline reply composer (textarea + emoji + attachments)
- Conversation context (topic + original question)
- Mentor response time ("Typically responds within 2 hours")
- Relationship duration ("Your mentor for 3 months")
- Read receipt (informs mentor)
- Typing indicator via WebSocket
- Notification grouping (multiple messages in thread)

**Hooks Used**:
- useMentorNotifications (filter mentoring type)

**Integration**: Messaging service for full conversation



### Layer 5: Template Components (Pages)

#### NotificationsPage

**Purpose**: Full-page notification management interface

**Route**: `/notifications`

**Composition**:
- Page header (title + unread count + bulk actions + view toggle + refresh + settings link)
- Main content (NotificationList in full mode)
- Sidebar (NotificationFilterBar + statistics panel + quick links)
- Breadcrumb navigation

**Features**:
- Full NotificationList with all features
- View mode toggle (list/grid)
- Bulk selection with toolbar
- Sidebar statistics (today's count, weekly trend, most active type, engagement rate)
- Quick links (settings, scheduled, analytics)
- Mobile: sidebar as slide-out sheet
- Grid layout (2-3 per row on wide screens)
- Empty state with illustration
- Loading skeleton matching layout
- Error boundary with navigation home
- Keyboard shortcuts (select all, mark read, delete) with legend (? key)

**Metadata**:
```typescript
export const metadata = {
  title: 'Notifications | Learning Platform',
  description: 'View and manage your notifications'
}
```

**Accessibility**:
- Semantic HTML5 (header, main, aside, footer)
- Skip links to main content
- ARIA landmarks
- Keyboard shortcuts

---

#### NotificationSettingsPage

**Purpose**: Comprehensive settings interface

**Route**: `/settings/notifications`

**Composition**:
- Page header (title + save status + last saved timestamp)
- Tabbed interface (Preferences / Devices / Schedule / Templates[admin])
- Tab 1: NotificationPreferencesPanel (full mode)
- Tab 2: DeviceTokenManager
- Tab 3: NotificationScheduler (editable)
- Tab 4: NotificationTemplateManager (admin only)
- Save/Reset buttons (page level or per-tab)

**Features**:
- Shadcn Tabs with keyboard navigation
- URL hash synchronization (#preferences, #devices, etc.)
- Unsaved changes warning (confirmation dialog)
- Export/import settings (JSON)
- Preview mode (example notifications)
- Keyboard shortcuts (Cmd/Ctrl+S save, Escape cancel)
- Help tooltips on complex settings
- Real-time preview
- Settings sync across devices

**Metadata**:
```typescript
export const metadata = {
  title: 'Notification Settings | Learning Platform',
  description: 'Configure your notification preferences'
}
```

**State Management**:
- react-hook-form tracking changes across tabs
- Optimistic updates with rollback
- Backend storage for cross-device sync

---

#### NotificationAnalyticsPage (Admin)

**Purpose**: Comprehensive analytics dashboard

**Route**: `/admin/notifications/analytics`

**Auth**: Admin role required

**Composition**:
- Page header (title + date range selector + refresh + export menu)
- Dashboard section (NotificationAnalyticsDashboard expanded)
- Detailed reports section (tabbed: Delivery / Engagement / A/B Tests / Segments / Trends)
- Export tools section

**Report Tabs**:
1. **Delivery Report**: Comprehensive delivery statistics with drill-down
2. **Engagement Report**: Detailed engagement metrics with cohort analysis
3. **A/B Test Results**: All tests with statistical analysis
4. **User Segment Analysis**: Comparison across segments
5. **Trend Analysis**: Long-term patterns with forecasting

**Features**:
- Expanded metrics (bounce rate, unsubscribe rate, device breakdown)
- Anomaly detection (highlights unusual patterns)
- Funnel visualization (delivery → open → click → conversion)
- Cohort analysis
- Forecasting (future volume/engagement)
- Seasonality detection (day/time patterns)
- Custom report builder
- Dashboard widgets (add/remove charts)
- Scheduled email reports
- User-level insights (top engaged, at-risk, disabled)
- Performance recommendations
- Failure analysis (common reasons)
- Cost analysis (if applicable)

**Metadata**:
```typescript
export const metadata = {
  title: 'Notification Analytics | Admin',
  description: 'Comprehensive notification performance analytics'
}
```

**Accessibility**:
- Data tables with sortable columns
- Chart descriptions for screen readers
- High contrast mode support
- Downloadable accessible formats

## Data Models

### Core Notification Model

```typescript
interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  status: NotificationStatus;
  priority: NotificationPriority;
  channels: DeliveryChannel[];
  templateId?: string;
  templateData?: Record<string, unknown>;
  scheduledFor?: Date;
  expiresAt?: Date;
  actionUrl?: string;
  imageUrl?: string;
  iconUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Notification Preferences Model

```typescript
interface NotificationPreferences {
  userId: string;
  enabledTypes: NotificationType[];
  quietHours?: QuietHours;
  frequency: Record<NotificationType, FrequencySettings>;
  channels: Record<NotificationType, DeliveryChannel[]>;
  globalSettings: GlobalNotificationSettings;
  updatedAt: Date;
}

interface QuietHours {
  enabled: boolean;
  start: string; // HH:mm
  end: string; // HH:mm
  timezone: string;
  daysOfWeek?: number[]; // 0-6
}

interface FrequencySettings {
  type: 'immediate' | 'batched' | 'daily' | 'weekly' | 'disabled';
  batchInterval?: number; // minutes
  dailyTime?: string; // HH:mm
  weeklyDay?: number; // 0-6
  weeklyTime?: string; // HH:mm
}

interface GlobalNotificationSettings {
  enabled: boolean;
  maxPerDay?: number;
  maxPerHour?: number;
  respectQuietHours: boolean;
  allowCriticalOverride: boolean;
}
```

### Device Token Model

```typescript
interface DeviceToken {
  id: string;
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  isActive: boolean;
  lastUsedAt: Date;
  metadata?: DeviceMetadata;
  createdAt: Date;
  updatedAt: Date;
}

interface DeviceMetadata {
  userAgent?: string;
  appVersion?: string;
  osVersion?: string;
  deviceModel?: string;
  browserName?: string;
  browserVersion?: string;
  timezone?: string;
  language?: string;
}
```

### Notification Template Model

```typescript
interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  titleTemplate: string;
  bodyTemplate: string;
  defaultData?: Record<string, unknown>;
  requiredVariables?: string[];
  supportedChannels: DeliveryChannel[];
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Scheduled Notification Model

```typescript
interface ScheduledNotification {
  id: string;
  userId: string;
  templateId?: string;
  notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt' | 'status'>;
  scheduledFor: Date;
  timezone?: string;
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
  status: 'pending' | 'sent' | 'cancelled' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

interface RecurringPattern {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: Date;
  maxOccurrences?: number;
}
```

### Analytics Models

```typescript
interface NotificationAnalytics {
  notificationId: string;
  userId: string;
  type: NotificationType;
  deliveryResults: DeliveryResult[];
  openedAt?: Date;
  clickedAt?: Date;
  dismissedAt?: Date;
  engagementScore: number;
  metadata?: Record<string, unknown>;
}

interface DeliveryResult {
  success: boolean;
  channel: DeliveryChannel;
  timestamp: Date;
  error?: string;
  metadata?: Record<string, unknown>;
}

interface AnalyticsData {
  period: string;
  metrics: Record<AnalyticsMetric, number>;
  breakdown?: Record<string, Record<AnalyticsMetric, number>>;
}
```

## Error Handling

### Error Types and Recovery Strategies

```typescript
type NotificationErrorType =
  | 'network'        // Network connectivity issues
  | 'authentication' // Auth token expired/invalid
  | 'validation'     // Invalid request data
  | 'service'        // Backend service error
  | 'permission'     // Browser permission denied
  | 'quota'          // Rate limit exceeded
  | 'template'       // Template rendering error
  | 'device'         // Device token invalid
  | 'websocket';     // WebSocket connection error

interface NotificationError {
  type: NotificationErrorType;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
  recoverable: boolean;
  retryAfter?: number;
  correlationId?: string;
  timestamp: Date;
}
```

### Error Handling Strategy

**Network Errors**:
- Automatic retry with exponential backoff (3 attempts)
- Offline queue in localStorage
- Connection status indicator
- User message: "Connection lost. Retrying..."

**Authentication Errors**:
- Automatic token refresh attempt
- Redirect to login if refresh fails
- Preserve notification state for post-login
- User message: "Session expired. Please log in again."

**Validation Errors**:
- Highlight invalid fields
- Display specific error messages
- Prevent submission until fixed
- User message: Field-specific validation errors

**Service Errors**:
- Circuit breaker pattern (open after 5 failures)
- Graceful degradation (show cached data)
- Retry button for user-initiated retry
- User message: "Service temporarily unavailable. Try again in X minutes."

**Permission Errors**:
- Educational content explaining benefits
- Platform-specific instructions
- "Don't ask again" option
- User message: "Notifications are blocked. Here's how to enable them..."

**Quota Errors**:
- Display current usage and limits
- Suggest adjusting preferences
- Queue non-critical notifications
- User message: "Daily notification limit reached. Critical notifications will still be delivered."

**Template Errors**:
- Validation before save
- Preview with error highlighting
- Required variables check
- User message: "Template is missing required variable: {{variableName}}"

**Device Errors**:
- Token refresh attempt
- Re-registration flow
- Remove invalid tokens
- User message: "Device registration expired. Please re-enable notifications."

**WebSocket Errors**:
- Automatic reconnection (exponential backoff, max 5 attempts)
- Fallback to polling
- Connection status indicator
- User message: "Real-time updates paused. Reconnecting..."

### Circuit Breaker Implementation

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number;      // 5 failures
  recoveryTimeout: number;        // 60000ms (1 minute)
  monitoringPeriod: number;       // 10000ms (10 seconds)
  halfOpenMaxCalls: number;       // 3 test calls
  successThreshold: number;       // 2 successes to close
}

type CircuitBreakerState = 'closed' | 'open' | 'half-open';
```

**States**:
- **Closed**: Normal operation, requests pass through
- **Open**: Failures exceeded threshold, requests fail fast
- **Half-Open**: Testing recovery, limited requests allowed

**Behavior**:
- Track failures in monitoring period
- Open circuit after threshold exceeded
- Wait recovery timeout before half-open
- Allow limited requests in half-open
- Close after success threshold met
- Reset to open if failures continue



## Testing Strategy

### Unit Testing

**Scope**: Hooks, utility functions, atomic components

**Tools**: Jest, React Testing Library

**Coverage Targets**:
- Hooks: 90%+ coverage
- Utilities: 95%+ coverage
- Components: 85%+ coverage

**Test Cases**:

**Hooks**:
```typescript
describe('useNotifications', () => {
  it('fetches notifications for authenticated user')
  it('applies filters correctly')
  it('handles pagination with cursor')
  it('updates cache on WebSocket message')
  it('handles network errors gracefully')
  it('respects enabled option')
})

describe('useNotificationMutations', () => {
  it('marks notification as read optimistically')
  it('rolls back on server error')
  it('invalidates queries on success')
  it('handles concurrent mutations')
})

describe('useDeviceTokens', () => {
  it('registers FCM token successfully')
  it('handles permission denied')
  it('removes token with confirmation')
  it('handles token generation failure')
})
```

**Components**:
```typescript
describe('NotificationCard', () => {
  it('renders notification content correctly')
  it('shows unread visual distinction')
  it('calls onRead when clicked')
  it('shows action buttons on hover')
  it('handles swipe gesture on mobile')
  it('renders markdown in body')
  it('displays images with optimization')
})

describe('NotificationFilterBar', () => {
  it('filters by notification type')
  it('toggles read/unread status')
  it('debounces search input')
  it('updates URL on filter change')
  it('clears all filters')
})
```

### Integration Testing

**Scope**: Organism components with mocked API

**Tools**: Jest, React Testing Library, MSW (Mock Service Worker)

**Test Cases**:

```typescript
describe('NotificationList Integration', () => {
  it('loads and displays notifications')
  it('implements infinite scroll')
  it('groups notifications by date')
  it('performs bulk actions')
  it('updates in real-time via WebSocket')
  it('handles empty state')
  it('recovers from errors')
})

describe('NotificationCenter Integration', () => {
  it('opens on bell icon click')
  it('displays recent notifications')
  it('marks all as read')
  it('navigates to full page')
  it('closes on outside click')
  it('updates badge in real-time')
})

describe('NotificationPreferencesPanel Integration', () => {
  it('loads current preferences')
  it('validates form inputs')
  it('saves preferences successfully')
  it('handles validation errors')
  it('shows preview with changes')
})
```

### End-to-End Testing

**Scope**: Critical user flows

**Tools**: Playwright or Cypress

**Test Flows**:

**Flow 1: Receive and Interact with Notification**
1. User logs in
2. Trigger notification via backend
3. Toast appears with notification
4. User clicks toast
5. Notification marked as read
6. User navigates to action URL

**Flow 2: Configure Notification Preferences**
1. User navigates to settings
2. User disables achievement notifications
3. User configures quiet hours
4. User saves preferences
5. Verify preferences persisted
6. Verify achievement notifications suppressed

**Flow 3: Enable Push Notifications**
1. User clicks bell icon
2. User clicks "Enable Notifications"
3. Permission flow displays
4. User grants permission
5. FCM token registered
6. Device appears in device list

**Flow 4: Admin Creates Template**
1. Admin logs in
2. Admin navigates to templates
3. Admin creates new template
4. Admin inserts variables
5. Admin previews template
6. Admin saves template
7. Verify template in list

**Flow 5: View Analytics Dashboard**
1. Admin navigates to analytics
2. Dashboard loads with metrics
3. Admin selects date range
4. Charts update
5. Admin exports report
6. Verify CSV download

### Accessibility Testing

**Automated**: jest-axe for WCAG 2.1 AA compliance

**Manual**: Screen reader testing (NVDA, JAWS, VoiceOver)

**Test Cases**:
- Keyboard navigation through all components
- Screen reader announcements for new notifications
- Focus management in modals and popovers
- ARIA labels and live regions
- Color contrast ratios
- Reduced motion support

### Performance Testing

**Tools**: Lighthouse, React DevTools Profiler

**Metrics**:
- First Contentful Paint < 1.5s
- Time to Interactive < 3.5s
- Largest Contentful Paint < 2.5s
- Cumulative Layout Shift < 0.1
- Total Blocking Time < 300ms

**Load Testing**:
- Notification list with 1000+ items (virtual scrolling)
- 50 concurrent WebSocket connections
- Rapid notification delivery (10/second)
- Bundle size < 200KB (notification module)

### Test Data Management

**Mock Data**:
- Notification fixtures for all types
- User preferences fixtures
- Device token fixtures
- Template fixtures
- Analytics data fixtures

**Test Utilities**:
```typescript
// Test helpers
function createMockNotification(overrides?: Partial<Notification>): Notification
function createMockPreferences(overrides?: Partial<NotificationPreferences>): NotificationPreferences
function setupWebSocketMock(): MockWebSocket
function triggerNotificationEvent(notification: Notification): void
```

## Performance Optimizations

### Code Splitting

**Strategy**: Lazy load non-critical components

```typescript
// Lazy load admin components
const NotificationTemplateManager = lazy(() => 
  import('@/components/notifications/NotificationTemplateManager')
);

const NotificationAnalyticsDashboard = lazy(() => 
  import('@/components/notifications/NotificationAnalyticsDashboard')
);

// Lazy load specialized notifications
const AchievementNotification = lazy(() => 
  import('@/components/notifications/AchievementNotification')
);
```

**Bundle Analysis**:
- Main bundle: Core notification components
- Admin bundle: Template manager + analytics
- Specialized bundle: Achievement, streak, test reminders
- Chart bundle: Recharts library

### Virtual Scrolling

**Implementation**: react-window for lists > 50 items

```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={notifications.length}
  itemSize={120}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <NotificationCard notification={notifications[index]} />
    </div>
  )}
</FixedSizeList>
```

### Image Optimization

**Strategy**: Next.js Image component with automatic optimization

```typescript
import Image from 'next/image';

<Image
  src={notification.imageUrl}
  alt={notification.title}
  width={400}
  height={300}
  loading="lazy"
  placeholder="blur"
/>
```

### Debouncing and Throttling

**Search Input**: 300ms debounce
```typescript
const debouncedSearch = useMemo(
  () => debounce((value: string) => setSearchQuery(value), 300),
  []
);
```

**Scroll Events**: 100ms throttle
```typescript
const throttledScroll = useMemo(
  () => throttle(handleScroll, 100),
  []
);
```

### Memoization

**Expensive Computations**:
```typescript
const groupedNotifications = useMemo(() => 
  groupNotificationsByDate(notifications),
  [notifications]
);

const filteredNotifications = useMemo(() => 
  applyFilters(notifications, filters),
  [notifications, filters]
);
```

**Component Memoization**:
```typescript
const MemoizedNotificationCard = memo(NotificationCard, (prev, next) => 
  prev.notification.id === next.notification.id &&
  prev.notification.status.isRead === next.notification.status.isRead
);
```

### React Query Optimization

**Stale Time Configuration**:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds for notifications
      cacheTime: 300000, // 5 minutes
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});
```

**Prefetching**:
```typescript
// Prefetch next page on scroll
const prefetchNextPage = useCallback(() => {
  if (hasNextPage) {
    queryClient.prefetchInfiniteQuery({
      queryKey: notificationQueryKeys.list(filters),
      queryFn: () => fetchNotifications({ ...filters, cursor: nextCursor }),
    });
  }
}, [hasNextPage, nextCursor, filters]);
```

### WebSocket Optimization

**Connection Pooling**: Single WebSocket connection per user

**Message Batching**: Batch multiple notifications in single message

**Heartbeat**: Ping/pong every 30 seconds to keep connection alive

**Automatic Reconnection**: Exponential backoff (1s, 2s, 4s, 8s, 16s)

### Bundle Size Optimization

**Tree Shaking**: Import only used Lucide icons
```typescript
import { Bell, Trophy, Flame } from 'lucide-react';
```

**Dynamic Imports**: Load heavy libraries on demand
```typescript
const confetti = await import('canvas-confetti');
confetti.default({ /* options */ });
```

**Compression**: Enable gzip/brotli compression

**Target Bundle Sizes**:
- Core notification module: < 150KB
- Admin module: < 100KB
- Specialized notifications: < 50KB
- Total (all modules): < 300KB

## Security Considerations

### Authentication and Authorization

**JWT Validation**:
- Verify JWT signature on every API request
- Check token expiration
- Refresh token automatically before expiration
- Redirect to login on invalid token

**Role-Based Access Control**:
- Admin-only routes protected with role check
- Template management requires admin role
- Analytics dashboard requires admin role
- User can only access own notifications

### Input Validation and Sanitization

**Client-Side Validation**:
- Zod schemas for all form inputs
- Type checking with TypeScript
- Length limits on text inputs
- Format validation (email, URL, time)

**Markdown Sanitization**:
```typescript
import DOMPurify from 'isomorphic-dompurify';

const sanitizedBody = DOMPurify.sanitize(notification.body, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li', 'code'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
});
```

### XSS Prevention

**Content Security Policy**:
```typescript
// next.config.ts
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  font-src 'self';
  connect-src 'self' wss: https:;
  frame-ancestors 'none';
`;
```

**React's Built-in Protection**:
- Automatic escaping of JSX content
- dangerouslySetInnerHTML only for sanitized markdown

### CSRF Protection

**Token Validation**:
- CSRF token in all mutation requests
- Token stored in httpOnly cookie
- Validate token on backend

### Rate Limiting

**Client-Side Throttling**:
- Limit API calls per minute
- Queue requests when limit reached
- Display warning to user

**Backend Rate Limits**:
- Respect rate limit headers
- Exponential backoff on 429 responses
- Display remaining quota to user

### Secure WebSocket Connection

**WSS Protocol**: Use wss:// for encrypted connection

**Authentication**: Send JWT in connection handshake

**Message Validation**: Validate all incoming messages

**Connection Limits**: Max 1 connection per user

### Data Privacy

**PII Handling**:
- No PII in client-side logs
- Encrypt sensitive data in localStorage
- Clear cache on logout

**GDPR Compliance**:
- User can export notification data
- User can delete notification data
- User can opt-out of notifications
- Clear consent for data collection

### Secure Storage

**localStorage**:
- Encrypt sensitive preferences
- Clear on logout
- Set expiration for cached data

**sessionStorage**:
- Use for temporary state
- Automatically cleared on tab close

**Cookies**:
- httpOnly for auth tokens
- Secure flag in production
- SameSite=Strict for CSRF protection



## Accessibility Implementation

### WCAG 2.1 AA Compliance

**Perceivable**:
- Color contrast ratio ≥ 4.5:1 for normal text
- Color contrast ratio ≥ 3:1 for large text
- Color not sole indicator (use icons + text)
- Alt text for all images
- Captions for video content

**Operable**:
- All functionality keyboard accessible
- No keyboard traps
- Skip links to main content
- Visible focus indicators (2px outline)
- Sufficient time for interactions
- Pause/stop for auto-updating content

**Understandable**:
- Clear, consistent navigation
- Predictable behavior
- Input assistance and error prevention
- Error messages with suggestions
- Labels for all form controls

**Robust**:
- Valid HTML5 markup
- ARIA attributes where needed
- Compatible with assistive technologies
- Progressive enhancement

### Keyboard Navigation

**Global Shortcuts**:
- `Tab`: Move focus forward
- `Shift+Tab`: Move focus backward
- `Enter/Space`: Activate focused element
- `Escape`: Close modals/popovers
- `?`: Show keyboard shortcuts legend
- `Ctrl/Cmd+S`: Save (in settings)
- `Ctrl/Cmd+K`: Focus search

**Notification List**:
- `↑/↓`: Navigate through notifications
- `Enter`: Open notification
- `Space`: Select notification (bulk mode)
- `Ctrl/Cmd+A`: Select all
- `Delete`: Delete selected
- `M`: Mark selected as read

**Modal Dialogs**:
- Focus trap within modal
- Focus first interactive element on open
- Return focus to trigger on close
- `Escape` to close

### Screen Reader Support

**ARIA Live Regions**:
```typescript
// New notification announcement
<div role="status" aria-live="polite" aria-atomic="true">
  {newNotificationCount} new notifications
</div>

// Urgent notification announcement
<div role="alert" aria-live="assertive" aria-atomic="true">
  Urgent: {notification.title}
</div>
```

**ARIA Labels**:
```typescript
<button
  aria-label={`Mark notification as read: ${notification.title}`}
  onClick={handleMarkRead}
>
  <CheckIcon />
</button>

<div
  role="region"
  aria-label="Notifications"
  aria-describedby="notification-count"
>
  <span id="notification-count" className="sr-only">
    {unreadCount} unread notifications
  </span>
  {/* Notification list */}
</div>
```

**ARIA Expanded**:
```typescript
<button
  aria-expanded={isOpen}
  aria-controls="notification-center"
  aria-haspopup="dialog"
>
  <BellIcon />
</button>
```

**Semantic HTML**:
```typescript
<article aria-labelledby={`notification-${id}`}>
  <h3 id={`notification-${id}`}>{title}</h3>
  <p>{body}</p>
  <time dateTime={timestamp.toISOString()}>
    {formatRelativeTime(timestamp)}
  </time>
</article>
```

### Focus Management

**Modal Focus Trap**:
```typescript
import { FocusTrap } from '@headlessui/react';

<FocusTrap>
  <Dialog>
    {/* Modal content */}
  </Dialog>
</FocusTrap>
```

**Focus Return**:
```typescript
const triggerRef = useRef<HTMLButtonElement>(null);

const handleClose = () => {
  setIsOpen(false);
  // Return focus to trigger
  triggerRef.current?.focus();
};
```

**Skip Links**:
```typescript
<a href="#main-content" className="skip-link">
  Skip to main content
</a>

<main id="main-content" tabIndex={-1}>
  {/* Main content */}
</main>
```

### Reduced Motion Support

**Respect User Preference**:
```typescript
const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

<motion.div
  animate={prefersReducedMotion ? {} : { scale: [0, 1.2, 1] }}
  transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5 }}
>
  {/* Content */}
</motion.div>
```

**CSS Alternative**:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Touch Target Sizes

**Minimum Size**: 44x44px for all interactive elements

```typescript
const buttonStyles = {
  minWidth: '44px',
  minHeight: '44px',
  padding: '12px',
};
```

### Color Accessibility

**High Contrast Mode**:
```css
@media (prefers-contrast: high) {
  .notification-card {
    border: 2px solid currentColor;
  }
  
  .notification-badge {
    outline: 2px solid currentColor;
  }
}
```

**Color Blind Friendly**:
- Use patterns in addition to colors
- Provide text labels
- Test with color blindness simulators

## Mobile Optimization

### Responsive Design

**Breakpoints**:
```typescript
const breakpoints = {
  xs: '320px',  // Small phones
  sm: '640px',  // Large phones
  md: '768px',  // Tablets
  lg: '1024px', // Laptops
  xl: '1280px', // Desktops
  '2xl': '1536px', // Large desktops
};
```

**Layout Adaptations**:
- **Mobile (< 640px)**: Single column, full-width cards, bottom sheet modals
- **Tablet (640-1024px)**: Two columns, side-by-side filters
- **Desktop (> 1024px)**: Three columns, sidebar filters, popovers

### Touch Interactions

**Swipe Gestures**:
```typescript
import { useSwipeable } from 'react-swipeable';

const handlers = useSwipeable({
  onSwipedLeft: () => handleDelete(),
  onSwipedRight: () => handleArchive(),
  preventDefaultTouchmoveEvent: true,
  trackMouse: false,
});

<div {...handlers}>
  <NotificationCard />
</div>
```

**Pull-to-Refresh**:
```typescript
const handleTouchStart = (e: TouchEvent) => {
  if (scrollTop === 0) {
    startY = e.touches[0].clientY;
  }
};

const handleTouchMove = (e: TouchEvent) => {
  if (startY && scrollTop === 0) {
    const currentY = e.touches[0].clientY;
    const pullDistance = currentY - startY;
    
    if (pullDistance > 80) {
      triggerRefresh();
    }
  }
};
```

**Long Press**:
```typescript
const useLongPress = (callback: () => void, ms = 500) => {
  const timerRef = useRef<NodeJS.Timeout>();
  
  const start = useCallback(() => {
    timerRef.current = setTimeout(callback, ms);
  }, [callback, ms]);
  
  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);
  
  return {
    onTouchStart: start,
    onTouchEnd: stop,
    onTouchMove: stop,
  };
};
```

### Haptic Feedback

**Vibration API**:
```typescript
const triggerHaptic = (pattern: number | number[]) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

// Success: Short pulse
triggerHaptic(50);

// Error: Two short pulses
triggerHaptic([50, 100, 50]);

// Achievement: Celebration pattern
triggerHaptic([100, 50, 100, 50, 200]);
```

### Mobile-Specific Components

**Bottom Sheet**:
```typescript
import { Sheet } from '@/components/ui/sheet';

<Sheet open={isOpen} onOpenChange={setIsOpen}>
  <SheetContent side="bottom" className="h-[80vh]">
    <NotificationList />
  </SheetContent>
</Sheet>
```

**Mobile Navigation**:
```typescript
// Sticky header on mobile
<header className="sticky top-0 z-50 bg-background border-b">
  <div className="flex items-center justify-between p-4">
    <button onClick={handleBack}>
      <ArrowLeftIcon />
    </button>
    <h1>Notifications</h1>
    <button onClick={handleSettings}>
      <SettingsIcon />
    </button>
  </div>
</header>
```

### Performance on Mobile

**Lazy Loading**:
- Load images only when in viewport
- Defer non-critical JavaScript
- Use Intersection Observer for infinite scroll

**Reduced Data Usage**:
- Compress images
- Minimize API payloads
- Cache aggressively

**Battery Optimization**:
- Throttle scroll events
- Pause animations when tab inactive
- Reduce WebSocket ping frequency

## Internationalization (i18n)

### Translation Strategy

**Library**: next-intl or react-i18next

**Supported Languages**: English (default), Spanish, French, German, Japanese, Chinese

**Translation Files**:
```
locales/
  en/
    notifications.json
    common.json
  es/
    notifications.json
    common.json
  ...
```

**Example Translation File**:
```json
{
  "notifications": {
    "title": "Notifications",
    "empty": "No notifications yet",
    "markAllRead": "Mark all as read",
    "filter": {
      "all": "All",
      "unread": "Unread",
      "read": "Read"
    },
    "types": {
      "achievement": "Achievement",
      "streak": "Streak",
      "test": "Test",
      "system": "System"
    }
  }
}
```

**Usage**:
```typescript
import { useTranslations } from 'next-intl';

const t = useTranslations('notifications');

<h1>{t('title')}</h1>
<button>{t('markAllRead')}</button>
```

### Date and Time Formatting

**Library**: date-fns with locale support

```typescript
import { format } from 'date-fns';
import { enUS, es, fr, de, ja, zhCN } from 'date-fns/locale';

const locales = { en: enUS, es, fr, de, ja, zh: zhCN };

const formatDate = (date: Date, formatStr: string, locale: string) => {
  return format(date, formatStr, { locale: locales[locale] });
};
```

### Number Formatting

```typescript
const formatNumber = (num: number, locale: string) => {
  return new Intl.NumberFormat(locale).format(num);
};

// 1,234 (en-US)
// 1.234 (de-DE)
// 1 234 (fr-FR)
```

### RTL Support

**Detect RTL Languages**:
```typescript
const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
const isRTL = rtlLanguages.includes(locale);
```

**Apply RTL Styles**:
```typescript
<html dir={isRTL ? 'rtl' : 'ltr'} lang={locale}>
  {/* Content */}
</html>
```

```css
[dir="rtl"] .notification-card {
  text-align: right;
  border-left: none;
  border-right: 4px solid var(--primary);
}
```

## Monitoring and Analytics

### Error Monitoring

**Tool**: Sentry or similar

**Configuration**:
```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event, hint) {
    // Filter out PII
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  },
});
```

**Error Tracking**:
```typescript
try {
  await markNotificationAsRead(id);
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      component: 'NotificationCard',
      action: 'markAsRead',
    },
    extra: {
      notificationId: id,
      userId: user.id,
    },
  });
}
```

### Performance Monitoring

**Web Vitals**:
```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  const body = JSON.stringify(metric);
  const url = '/api/analytics';
  
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, body);
  } else {
    fetch(url, { body, method: 'POST', keepalive: true });
  }
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### User Analytics

**Tool**: Google Analytics, Mixpanel, or custom

**Events to Track**:
- Notification viewed
- Notification clicked
- Notification dismissed
- Filter applied
- Preferences updated
- Device registered
- Template created (admin)
- Analytics viewed (admin)

**Implementation**:
```typescript
const trackEvent = (eventName: string, properties?: Record<string, unknown>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, properties);
  }
};

// Usage
trackEvent('notification_clicked', {
  notification_id: notification.id,
  notification_type: notification.type,
  priority: notification.priority,
});
```

### Custom Dashboards

**Metrics to Monitor**:
- Notification delivery rate
- WebSocket connection stability
- API response times
- Error rates by component
- User engagement rates
- Device registration success rate
- Template usage statistics

**Alerting**:
- Error rate > 5%
- WebSocket disconnection rate > 10%
- API response time > 2s
- Notification delivery failure rate > 5%

## Deployment Strategy

### Environment Configuration

**Environment Variables**:
```bash
# API Configuration
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
NEXT_PUBLIC_WS_URL=wss://api.example.com/ws

# Firebase Configuration (for FCM)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_VAPID_KEY=...

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_AB_TESTING=true

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=...
SENTRY_AUTH_TOKEN=...
```

### Build Optimization

**Next.js Configuration**:
```typescript
// next.config.ts
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  images: {
    domains: ['cdn.example.com'],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizeCss: true,
  },
};
```

### Progressive Web App (PWA)

**Service Worker**:
```typescript
// public/sw.js
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      notificationId: data.id,
      actionUrl: data.actionUrl,
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    const url = event.notification.data.actionUrl || '/notifications';
    event.waitUntil(clients.openWindow(url));
  }
});
```

**Manifest**:
```json
{
  "name": "Learning Platform",
  "short_name": "LearnApp",
  "description": "Your personalized learning platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Continuous Integration

**GitHub Actions Workflow**:
```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
      - run: npm run test:e2e
  
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v3
        with:
          name: build
          path: .next
  
  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: actions/download-artifact@v3
      - run: npm run deploy
```

### Rollback Strategy

**Versioning**: Semantic versioning (MAJOR.MINOR.PATCH)

**Deployment Process**:
1. Deploy to staging environment
2. Run smoke tests
3. Deploy to production (canary: 10% traffic)
4. Monitor metrics for 30 minutes
5. Gradually increase to 100%
6. Rollback if error rate > 5%

**Rollback Triggers**:
- Error rate spike
- Performance degradation
- WebSocket connection failures
- Critical bug reports

