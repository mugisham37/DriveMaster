# Specialized Notification Components

This directory contains specialized notification components for different notification types in the learning platform. Each component is designed to provide a rich, contextual experience tailored to its specific notification type.

## Implemented Components

### 1. AchievementNotification
**Purpose**: Celebration component for achievement unlocks

**Features**:
- ✅ Shadcn Dialog with custom styling
- ✅ Animated achievement icon with scale-up entrance
- ✅ Confetti animation (30 particles, 3s duration)
- ✅ Rarity-based colors and glow effects (common/uncommon/rare/epic/legendary)
- ✅ Points badge with animated display
- ✅ Share button with native/popover options
- ✅ Auto-dismiss with 10s countdown
- ✅ Accessibility: ARIA labels, keyboard navigation, reduced motion support

**Usage**:
```tsx
<AchievementNotification
  achievement={{
    name: "First Lesson Complete",
    description: "You completed your first lesson!",
    points: 50,
    rarity: "rare",
    badgeUrl: "/badges/first-lesson.png",
    shareUrl: "/achievements/first-lesson"
  }}
  onShare={(platform) => console.log('Share to:', platform)}
  onDismiss={() => console.log('Dismissed')}
/>
```

### 2. SpacedRepetitionReminder
**Purpose**: Educational reminder for content review

**Features**:
- ✅ Specialized NotificationCard variant
- ✅ Topic icon and items due display
- ✅ Difficulty indicator with colored bars (easy/medium/hard)
- ✅ Optimal timing badge (green for perfect timing, red for overdue)
- ✅ Review button (primary action)
- ✅ Snooze button with options (1h/3h/6h/Tomorrow)
- ✅ Progress indicator toward daily goal
- ✅ Motivational text based on timing and status
- ✅ Estimated duration calculation

**Usage**:
```tsx
<SpacedRepetitionReminder
  reminder={{
    topic: "Spanish Vocabulary",
    itemsDue: 15,
    difficulty: "medium",
    lastReview: new Date('2024-01-15'),
    optimalTiming: true
  }}
  onReview={() => console.log('Start review')}
  onSnooze={(hours) => console.log('Snooze for', hours, 'hours')}
/>
```

### 3. StreakReminder
**Purpose**: Motivational component for streak maintenance

**Features**:
- ✅ Card with vibrant gradient background (orange to red)
- ✅ Animated flame icon with flicker effect
- ✅ Current streak count display (large, prominent)
- ✅ Streak visualization with progress ring toward goal
- ✅ Motivational message (varies by streak length and urgency)
- ✅ Urgency indicator with countdown (color-coded: green/orange/red)
- ✅ Streak history mini-chart (last 7 days)
- ✅ Continue button (primary action)
- ✅ Streak freeze indicator (protected badge for 7+ day streaks)
- ✅ Longest streak display

**Usage**:
```tsx
<StreakReminder
  streak={{
    currentStreak: 15,
    longestStreak: 30,
    streakGoal: 30,
    lastActivity: new Date(),
    timeRemaining: 8 // hours
  }}
  onContinue={() => console.log('Continue streak')}
  onDismiss={() => console.log('Dismissed')}
/>
```

### 4. MockTestReminder
**Purpose**: Test preparation component with readiness assessment

**Features**:
- ✅ Card with academic theme (blue color scheme)
- ✅ Test icon and metadata display
- ✅ Readiness score with color coding (red <60%, yellow 60-79%, green 80-100%)
- ✅ Preparation tips (collapsible section)
- ✅ Topic coverage checklist with checkmarks
- ✅ Start test button (disabled if readiness < 40%)
- ✅ Reschedule button with date picker integration
- ✅ Calendar integration offer
- ✅ Prerequisites checker with warnings
- ✅ Difficulty badge (beginner/intermediate/advanced/expert)
- ✅ Estimated duration and pass rate display

**Usage**:
```tsx
<MockTestReminder
  testReminder={{
    testName: "Spanish Grammar Test",
    testType: "Practice Test",
    difficulty: "intermediate",
    estimatedDuration: 45,
    userPassRate: 75,
    averagePassRate: 70,
    scheduledTime: new Date('2024-01-20T10:00:00'),
    preparationTips: [
      "Review verb conjugations",
      "Practice with flashcards",
      "Complete practice exercises"
    ]
  }}
  onStart={() => console.log('Start test')}
  onReschedule={(newTime) => console.log('Reschedule to:', newTime)}
/>
```

### 5. SystemNotification
**Purpose**: General system message component with rich content support

**Features**:
- ✅ Card with priority-based styling (info/warning/error/success)
- ✅ System icon with color coding
- ✅ Markdown rendering for body content (with DOMPurify sanitization)
- ✅ Expandable body for long content (>200 chars)
- ✅ Action button (optional, customizable label)
- ✅ Image support with lazy loading
- ✅ Video embed support (YouTube/Vimeo)
- ✅ Attachment list with download links
- ✅ Persistent display for critical notifications (non-dismissible)
- ✅ Expiration timer display
- ✅ External link detection with icons

**Usage**:
```tsx
<SystemNotification
  notification={{
    id: "sys-001",
    title: "System Maintenance",
    body: "We'll be performing **scheduled maintenance** on January 20th...",
    priority: "warning",
    actionUrl: "/maintenance-schedule",
    actionLabel: "View Schedule",
    imageUrl: "/images/maintenance.png",
    attachments: [
      { name: "maintenance-plan.pdf", url: "/files/plan.pdf", size: "2.5 MB" }
    ],
    expiresAt: new Date('2024-01-20'),
    persistent: false
  }}
  onAction={() => console.log('Action clicked')}
  onDismiss={() => console.log('Dismissed')}
/>
```

### 6. MentoringNotification
**Purpose**: Personal messaging component for mentor interactions

**Features**:
- ✅ Card with personal touch styling (purple theme)
- ✅ Mentor avatar with online status indicator
- ✅ Message preview (first 100 chars)
- ✅ Reply button with inline composer
- ✅ Quick reply suggestions (chips)
- ✅ View conversation button
- ✅ Conversation context (topic + original question)
- ✅ Typing indicator (animated dots)
- ✅ Mentor verification badge
- ✅ Response time indicator
- ✅ Relationship duration display
- ✅ Unread badge
- ✅ Timestamp with relative formatting

**Usage**:
```tsx
<MentoringNotification
  notification={{
    mentorName: "Dr. Sarah Johnson",
    mentorAvatar: "/avatars/sarah.jpg",
    messagePreview: "Great question! Let me explain the concept...",
    conversationId: "conv-123",
    unread: true,
    timestamp: new Date(),
    isOnline: true,
    isVerified: true,
    responseTime: "2 hours",
    relationshipDuration: "3 months",
    conversationContext: {
      topic: "Spanish Grammar",
      originalQuestion: "How do I use the subjunctive mood?"
    }
  }}
  onReply={(message) => console.log('Reply:', message)}
  onView={() => console.log('View conversation')}
/>
```

## Design Principles

All specialized components follow these principles:

1. **Accessibility First**: WCAG 2.1 AA compliant with ARIA labels, keyboard navigation, and screen reader support
2. **Responsive Design**: Mobile-optimized with touch-friendly interactions
3. **Performance**: Optimized animations, lazy loading, and memoization
4. **Type Safety**: Full TypeScript support with comprehensive prop types
5. **Composability**: Built with Shadcn UI components for consistency
6. **Customization**: Flexible props and className support for styling

## Dependencies

- `framer-motion`: Animations and transitions
- `canvas-confetti`: Confetti effects for achievements
- `react-markdown`: Markdown rendering for system notifications
- `lucide-react`: Icon library
- `@radix-ui/*`: Shadcn UI primitives

## Testing

Unit tests for these components are planned in Task 6.7. Test coverage will include:
- Component rendering with various props
- User interactions (clicks, hovers, swipes)
- Animation behavior
- Accessibility features
- Edge cases and error states

## Future Enhancements

- Sound effects integration (Task 1.7)
- Haptic feedback for mobile (Task 9.5)
- WebSocket integration for real-time updates (Task 8.3)
- Analytics tracking for engagement (Task 8.8)
- Internationalization support (Task 11.5)

## Related Documentation

- [Design Document](../../../.kiro/specs/notification-service-frontend-integration/design.md)
- [Requirements Document](../../../.kiro/specs/notification-service-frontend-integration/requirements.md)
- [Tasks Document](../../../.kiro/specs/notification-service-frontend-integration/tasks.md)
