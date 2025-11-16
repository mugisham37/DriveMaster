# Learning Platform Implementation Guide

This guide provides detailed instructions for implementing the content learning platform components.

## Quick Start

### Prerequisites
- All foundation layer components are complete (hooks, contexts, utilities)
- Shadcn UI components are installed and configured
- TypeScript interfaces are defined in `src/types/learning-platform.ts`
- Utility functions are available in `src/utils/learning-platform.ts`

### Implementation Order

Follow this strict order to ensure dependencies are met:

1. **Layer 3: UI Components** (Tasks 2.1-2.6)
2. **Layer 2: Feature Components** (Tasks 3.1-3.6)
3. **Layer 1: Page Components** (Tasks 4-10)
4. **Cross-Cutting Features** (Tasks 11-17)

## Layer 3: UI Components

### Component Template

```typescript
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ComponentNameProps {
  // Props definition
  className?: string;
}

export function ComponentName({ className, ...props }: ComponentNameProps) {
  return (
    <div className={cn('base-classes', className)}>
      {/* Component implementation */}
    </div>
  );
}
```

### Key Patterns

1. **Accessibility**: Always include ARIA attributes
2. **Styling**: Use Tailwind classes with `cn()` utility
3. **Props**: Accept `className` for style overrides
4. **Events**: Use callback props for user interactions
5. **Loading**: Support loading states with skeletons

### Example: ProgressBar Component

```typescript
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface ProgressBarProps {
  value: number; // 0-100
  variant?: 'linear' | 'circular';
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  variant = 'linear',
  size = 'md',
  color = 'primary',
  showLabel = false,
  animated = true,
  className,
}: ProgressBarProps) {
  const colorClasses = {
    primary: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    error: 'bg-red-600',
  };

  if (variant === 'circular') {
    // Circular implementation
    return (
      <div className={cn('relative', className)}>
        {/* SVG circle implementation */}
      </div>
    );
  }

  // Linear implementation
  return (
    <div className={cn('w-full', className)}>
      <Progress 
        value={value} 
        className={cn(
          animated && 'transition-all duration-300',
          colorClasses[color]
        )}
      />
      {showLabel && (
        <span className="text-sm text-gray-600 mt-1">
          {value}%
        </span>
      )}
    </div>
  );
}
```

## Layer 2: Feature Components

### Component Template

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { useContentItem } from '@/hooks/use-content-query';
import { useProgressContext } from '@/contexts/ProgressContext';
import { FeatureErrorBoundary } from '@/components/error-boundaries';

interface FeatureComponentProps {
  // Props definition
}

export function FeatureComponent(props: FeatureComponentProps) {
  // Hooks
  const { data, isLoading, error } = useContentItem(props.id);
  const { progress } = useProgressContext();

  // State
  const [localState, setLocalState] = useState();

  // Effects
  useEffect(() => {
    // Side effects
  }, []);

  // Handlers
  const handleAction = () => {
    // Handle user action
  };

  // Loading state
  if (isLoading) {
    return <SkeletonLoader />;
  }

  // Error state
  if (error) {
    return <ErrorDisplay error={error} />;
  }

  return (
    <FeatureErrorBoundary featureName="FeatureComponent">
      <div>
        {/* Feature implementation */}
      </div>
    </FeatureErrorBoundary>
  );
}
```

### Key Patterns

1. **Data Fetching**: Use foundation hooks (never direct API calls)
2. **State Management**: Use local state for UI, context for shared state
3. **Error Handling**: Wrap in FeatureErrorBoundary
4. **Loading States**: Show skeletons during data fetching
5. **Optimistic Updates**: Update UI immediately, sync with backend

## Layer 1: Page Components

### Page Template

```typescript
'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { RouteErrorBoundary } from '@/components/error-boundaries';
import { redirect } from 'next/navigation';

export default function PageName() {
  // Authentication check
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!user) {
    redirect('/auth/signin');
  }

  return (
    <RouteErrorBoundary>
      <div className="min-h-screen">
        <PageHeader />
        <PageContent />
        <PageFooter />
      </div>
    </RouteErrorBoundary>
  );
}
```

### Key Patterns

1. **Authentication**: Check auth status before rendering
2. **Layout**: Use consistent page structure
3. **Error Boundaries**: Wrap entire page in RouteErrorBoundary
4. **SEO**: Add metadata and title tags
5. **Performance**: Prefetch related pages

## Data Fetching Patterns

### Using Content Hooks

```typescript
// Fetch single content item
const { data: lesson, isLoading, error } = useContentItem(lessonId);

// Fetch multiple items with filters
const { data: lessons, isLoading } = useContentItems({
  type: 'lesson',
  jurisdiction: 'CA',
  difficulty: 'beginner',
});

// Search content
const { data: results, isLoading } = useContentSearch({
  query: searchTerm,
  filters: { topics: ['traffic-signs'] },
});

// Get recommendations
const { data: recommendations } = useRecommendations(userId, 'personalized');
```

### Using Progress Context

```typescript
const {
  progress,
  updateProgress,
  isLoading,
} = useProgressContext();

// Access progress data
const currentStreak = progress.currentStreak;
const dailyGoal = progress.dailyGoal;
const topicMastery = progress.topicMastery;

// Update progress (handled automatically by activity recording)
```

### Using Activity Recording

```typescript
const activityRecorder = useActivityRecorder(userId);

// Record question answer
await activityRecorder.recordActivity({
  type: 'question_answered',
  questionId,
  lessonId,
  selectedChoiceId,
  isCorrect,
  timeSpentSeconds,
  context: 'lesson',
});

// Activities are batched and sent automatically
```

## State Management Patterns

### Local Component State

```typescript
// UI state
const [showFeedback, setShowFeedback] = useState(false);
const [selectedChoice, setSelectedChoice] = useState<string>();

// Form state
const [formData, setFormData] = useState({
  topics: [],
  difficulty: 'intermediate',
});
```

### Session Storage

```typescript
import { saveLessonState, loadLessonState } from '@/utils/learning-platform';

// Save state
saveLessonState(lessonId, {
  currentQuestionIndex,
  userAnswers,
  startTime,
});

// Load state
const savedState = loadLessonState(lessonId);
if (savedState) {
  // Restore state
}
```

### URL State

```typescript
import { useSearchParams, useRouter } from 'next/navigation';

const searchParams = useSearchParams();
const router = useRouter();

// Read from URL
const query = searchParams.get('q');
const filters = searchParams.get('filters');

// Update URL
const updateUrl = (newQuery: string) => {
  const params = new URLSearchParams(searchParams);
  params.set('q', newQuery);
  router.push(`/search?${params.toString()}`);
};
```

## Performance Optimization

### Code Splitting

```typescript
import dynamic from 'next/dynamic';

// Lazy load heavy components
const ChartComponent = dynamic(() => import('./ChartComponent'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});
```

### Memoization

```typescript
import { useMemo, useCallback } from 'react';

// Memoize expensive computations
const sortedLessons = useMemo(() => {
  return lessons.sort((a, b) => a.order - b.order);
}, [lessons]);

// Memoize callbacks
const handleClick = useCallback(() => {
  // Handle click
}, [dependencies]);
```

### Prefetching

```typescript
import { usePrefetchOnHover } from '@/hooks/usePrefetchOnHover';

const prefetch = usePrefetchOnHover({
  queryKey: ['lesson', lessonId],
  queryFn: () => fetchLesson(lessonId),
  delay: 500,
});

<LessonCard
  onMouseEnter={prefetch}
  onClick={() => navigate(`/lesson/${lessonId}`)}
/>
```

## Accessibility Implementation

### Keyboard Navigation

```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
  switch (e.key) {
    case 'Enter':
      handleSubmit();
      break;
    case 'Escape':
      handleClose();
      break;
    case 'ArrowUp':
    case 'ArrowDown':
      handleNavigate(e.key);
      break;
  }
};

<div
  role="button"
  tabIndex={0}
  onKeyDown={handleKeyDown}
  onClick={handleClick}
>
  {/* Content */}
</div>
```

### Screen Reader Support

```typescript
import { LiveRegion } from '@/components/ui/live-region';

// Announce dynamic changes
<LiveRegion role="status" aria-live="polite">
  {feedbackMessage}
</LiveRegion>

// Add ARIA labels
<button
  aria-label="Submit answer"
  aria-describedby="submit-help"
>
  Submit
</button>
<span id="submit-help" className="sr-only">
  Press Enter to submit your selected answer
</span>
```

### Reduced Motion

```typescript
import { prefersReducedMotion } from '@/utils/learning-platform';

const shouldAnimate = !prefersReducedMotion();

<div
  className={cn(
    shouldAnimate && 'transition-all duration-300',
    'transform'
  )}
>
  {/* Content */}
</div>
```

## Error Handling

### Component-Level Errors

```typescript
import { FeatureErrorBoundary } from '@/components/error-boundaries';

<FeatureErrorBoundary
  featureName="LessonContainer"
  fallback={<LessonErrorFallback />}
  onError={(error, errorInfo) => {
    // Log to monitoring service
    console.error('Lesson error:', error, errorInfo);
  }}
>
  <LessonContent />
</FeatureErrorBoundary>
```

### API Error Handling

```typescript
const { data, error, isLoading, refetch } = useContentItem(lessonId);

if (error) {
  return (
    <ErrorDisplay
      title="Failed to load lesson"
      message={error.message}
      onRetry={refetch}
    />
  );
}
```

## Testing Guidelines

### Component Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('renders with correct value', () => {
    render(<ProgressBar value={75} showLabel />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('applies correct color class', () => {
    const { container } = render(<ProgressBar value={50} color="success" />);
    expect(container.querySelector('.bg-green-600')).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { LessonContainer } from './LessonContainer';

describe('LessonContainer', () => {
  it('loads and displays lesson', async () => {
    render(<LessonContainer lessonId="123" />);
    
    await waitFor(() => {
      expect(screen.getByText('Lesson Title')).toBeInTheDocument();
    });
  });

  it('records activity on answer submission', async () => {
    const { user } = render(<LessonContainer lessonId="123" />);
    
    const choice = screen.getByRole('button', { name: /choice a/i });
    await user.click(choice);
    
    const submit = screen.getByRole('button', { name: /submit/i });
    await user.click(submit);
    
    // Verify activity was recorded
    expect(mockActivityRecorder.recordActivity).toHaveBeenCalled();
  });
});
```

## Common Pitfalls

1. **Don't duplicate hooks**: Always use existing foundation hooks
2. **Don't skip error boundaries**: Wrap all features and pages
3. **Don't forget accessibility**: Test with keyboard and screen reader
4. **Don't ignore loading states**: Always show feedback during async operations
5. **Don't make direct API calls**: Use hooks that handle caching and errors
6. **Don't forget to save progress**: Record activities after every user action
7. **Don't skip performance optimization**: Use memoization and code splitting

## Resources

- [Requirements Document](../../../.kiro/specs/content-learning-platform/requirements.md)
- [Design Document](../../../.kiro/specs/content-learning-platform/design.md)
- [Tasks Document](../../../.kiro/specs/content-learning-platform/tasks.md)
- [Shadcn UI Documentation](https://ui.shadcn.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
