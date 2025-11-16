 Learning Platform Components

This directory contains all components for the content learning platform, organized by architectural layer.

## Directory Structure

```
learning-platform/
├── layer-3-ui/          # Reusable UI components (lowest level)
│   ├── ProgressBar/
│   ├── TopicBadge/
│   ├── StreakDisplay/
│   ├── LessonCard/
│   ├── ChoiceButton/
│   └── QuestionDisplay/
│
├── layer-2-features/    # Feature-specific components (middle level)
│   ├── LessonContainer/
│   ├── ProgressOverview/
│   ├── RecommendedLessons/
│   ├── SearchInterface/
│   ├── PracticeSetup/
│   └── PracticeSession/
│
└── layer-1-pages/       # Page-level components (highest level)
    ├── Dashboard/
    ├── LearningPath/
    ├── LessonView/
    ├── PracticeMode/
    ├── SearchAndBrowse/
    ├── ProgressAnalytics/
    └── MockTest/
```

## Layer Architecture

### Layer 3: UI Components
- **Purpose**: Reusable, presentational components
- **Dependencies**: Only Shadcn UI components and utilities
- **Examples**: ProgressBar, TopicBadge, LessonCard
- **Rules**: 
  - No direct API calls
  - No business logic
  - Accept data via props
  - Emit events via callbacks

### Layer 2: Feature Components
- **Purpose**: Feature-specific logic and composition
- **Dependencies**: Layer 3 components, hooks, contexts
- **Examples**: LessonContainer, SearchInterface
- **Rules**:
  - Use foundation hooks for data fetching
  - Manage feature-specific state
  - Compose Layer 3 components
  - Handle user interactions

### Layer 1: Page Components
- **Purpose**: Route-level pages and layouts
- **Dependencies**: Layer 2 and Layer 3 components
- **Examples**: Dashboard, LessonView, PracticeMode
- **Rules**:
  - Map to Next.js routes
  - Orchestrate multiple features
  - Handle authentication
  - Manage page-level state

## Development Guidelines

1. **Build Bottom-Up**: Always implement Layer 3 before Layer 2, and Layer 2 before Layer 1
2. **Use Foundation Layer**: Never duplicate functionality from hooks, contexts, or utilities
3. **Follow Patterns**: Study existing components before creating new ones
4. **Accessibility First**: All components must meet WCAG 2.1 Level AA standards
5. **Performance**: Use React.memo, useMemo, and lazy loading appropriately
6. **Error Handling**: Wrap features in FeatureErrorBoundary
7. **Testing**: Write tests for critical user flows

## Component Naming Conventions

- **UI Components**: Descriptive nouns (e.g., `ProgressBar`, `LessonCard`)
- **Feature Components**: Action-oriented (e.g., `LessonContainer`, `SearchInterface`)
- **Page Components**: Route names (e.g., `Dashboard`, `LessonView`)

## Import Patterns

```typescript
// Layer 3 component imports
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// Layer 2 component imports
import { ProgressBar } from '@/components/learning-platform/layer-3-ui/ProgressBar';
import { LessonCard } from '@/components/learning-platform/layer-3-ui/LessonCard';

// Hook imports
import { useContentItem } from '@/hooks/use-content-query';
import { useProgressContext } from '@/contexts/ProgressContext';

// Utility imports
import { formatDuration, calculateAccuracy } from '@/utils/learning-platform';
```

## State Management

- **URL State**: Route parameters, query strings (for shareable URLs)
- **Server State**: SWR via hooks (for API data)
- **Context State**: Auth, User, Progress, Activity (for cross-cutting concerns)
- **Local State**: UI state, forms, temporary selections (for component-specific state)

## Performance Considerations

- Use `React.memo` for expensive components
- Use `useMemo` for expensive computations
- Use `useCallback` for event handlers passed to children
- Lazy load heavy components (charts, video player)
- Prefetch on hover for navigation
- Implement virtual scrolling for long lists

## Accessibility Checklist

- [ ] Semantic HTML elements
- [ ] ARIA labels and roles
- [ ] Keyboard navigation support
- [ ] Focus indicators
- [ ] Screen reader announcements
- [ ] Color contrast ratios
- [ ] Reduced motion support
- [ ] Alt text for images

## Related Documentation

- [Requirements Document](../../../.kiro/specs/content-learning-platform/requirements.md)
- [Design Document](../../../.kiro/specs/content-learning-platform/design.md)
- [Tasks Document](../../../.kiro/specs/content-learning-platform/tasks.md)
