# Offline Support and Activity Sync

This directory contains the implementation of offline support and activity synchronization for the learning platform.

## Overview

The offline support system provides:

1. **Offline Detection** - Detects when the user goes offline using navigator.onLine events and periodic heartbeat checks
2. **Activity Queueing** - Stores activities in IndexedDB when offline for later synchronization
3. **Content Caching** - Caches lesson data and user progress for offline access
4. **Automatic Sync** - Automatically syncs queued activities when connection is restored
5. **Progress Notifications** - Displays user-friendly notifications about sync status

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ User Action (Answer Question, Complete Lesson, etc.)        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ OfflineContext: Check if online/offline                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────┴───────┐
                    │               │
              Online│               │Offline
                    ↓               ↓
    ┌───────────────────┐   ┌──────────────────┐
    │ Send to Backend   │   │ Queue in IndexedDB│
    │ Immediately       │   │ for Later Sync    │
    └───────────────────┘   └──────────────────┘
                                      ↓
                            ┌──────────────────┐
                            │ Connection       │
                            │ Restored         │
                            └──────────────────┘
                                      ↓
                            ┌──────────────────┐
                            │ SyncManager      │
                            │ Processes Queue  │
                            └──────────────────┘
                                      ↓
                            ┌──────────────────┐
                            │ Send Batched     │
                            │ Activities       │
                            └──────────────────┘
                                      ↓
                            ┌──────────────────┐
                            │ Update Progress  │
                            │ Show Notification│
                            └──────────────────┘
```

## Components

### 1. IndexedDB Manager (`indexeddb-manager.ts`)

Provides a robust IndexedDB wrapper for storing offline activities.

**Key Features:**
- Persistent storage (survives page refreshes and browser restarts)
- Indexed queries for efficient retrieval
- Status tracking (pending, syncing, failed, synced)
- Retry count management
- Automatic date serialization

**Usage:**
```typescript
import { getIndexedDBManager } from '@/lib/offline/indexeddb-manager';

const dbManager = getIndexedDBManager();
await dbManager.init();

// Add activity to queue
await dbManager.addActivity({
  id: 'activity_123',
  userId: 'user_456',
  activityType: 'question_answered',
  data: { questionId: 'q1', correct: true },
  timestamp: new Date(),
  queuedAt: new Date(),
  retryCount: 0,
  maxRetries: 3,
  status: 'pending'
});

// Get pending activities
const pending = await dbManager.getActivitiesByStatus('pending');
```

### 2. Content Cache Manager (`content-cache.ts`)

Caches lesson data and user progress for offline access.

**Key Features:**
- TTL-based expiration
- Type-based organization (lesson, progress, user-data)
- User-specific caching
- Automatic cleanup of expired content
- Cache statistics

**Usage:**
```typescript
import { getContentCacheManager } from '@/lib/offline/content-cache';

const cacheManager = getContentCacheManager();
await cacheManager.init();

// Cache lesson data
await cacheManager.cacheContent(
  'lesson_123',
  'lesson',
  lessonData,
  {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    userId: 'user_456'
  }
);

// Retrieve cached lesson
const cached = await cacheManager.getCachedContent('lesson_123');
if (cached) {
  console.log('Using cached lesson:', cached.data);
}
```

### 3. Sync Manager (`sync-manager.ts`)

Handles synchronization of offline activities when connection is restored.

**Key Features:**
- Automatic sync on reconnection
- Retry logic with exponential backoff
- Progress tracking
- Error handling and reporting
- Batch processing in order

**Usage:**
```typescript
import { getSyncManager } from '@/lib/offline/sync-manager';

const syncManager = getSyncManager();
await syncManager.init();

// Sync all pending activities
const result = await syncManager.syncAll();
console.log(`Synced ${result.successCount} activities`);

// Listen to sync state changes
const unsubscribe = syncManager.addListener((state) => {
  console.log('Sync status:', state.status);
  if (state.progress) {
    console.log(`Progress: ${state.progress.percentage}%`);
  }
});
```

## Hooks

### 1. useOfflineSync (`src/hooks/useOfflineSync.ts`)

React hook for accessing offline sync functionality.

**Features:**
- Automatic sync on reconnection
- Progress tracking
- Toast notifications
- State management

**Usage:**
```typescript
import { useOfflineSync } from '@/hooks/useOfflineSync';

function MyComponent() {
  const { 
    syncAll, 
    isSyncing, 
    progress, 
    lastSyncResult 
  } = useOfflineSync();

  return (
    <div>
      {isSyncing && (
        <div>
          Syncing... {progress?.percentage}%
        </div>
      )}
      <button onClick={syncAll}>
        Sync Now
      </button>
    </div>
  );
}
```

### 2. useOfflineQueue (`src/hooks/useOfflineQueue.ts`)

React hook for managing the offline activity queue.

**Features:**
- Queue activities when offline
- Automatic sync attempts
- Retry failed activities
- Queue statistics

**Usage:**
```typescript
import { useOfflineQueue } from '@/hooks/useOfflineQueue';

function MyComponent() {
  const { 
    queueActivity, 
    state, 
    isOffline 
  } = useOfflineQueue(userId);

  const handleActivity = async (activity) => {
    if (isOffline) {
      await queueActivity(activity);
      console.log('Activity queued for later sync');
    }
  };

  return (
    <div>
      {state.pendingCount > 0 && (
        <div>
          {state.pendingCount} activities pending sync
        </div>
      )}
    </div>
  );
}
```

## UI Components

### 1. OfflineBanner (`src/components/offline/OfflineBanner.tsx`)

Displays a banner when offline or syncing.

**Features:**
- Offline indicator
- Sync progress bar
- Success/error notifications
- Dismissible

**Usage:**
```typescript
import { OfflineBanner } from '@/components/offline';

function Layout({ children }) {
  return (
    <>
      <OfflineBanner />
      {children}
    </>
  );
}
```

### 2. OfflineIndicator (`src/components/offline/OfflineBanner.tsx`)

Compact offline/syncing indicator for headers or sidebars.

**Usage:**
```typescript
import { OfflineIndicator } from '@/components/offline';

function Header() {
  return (
    <header>
      <OfflineIndicator />
      {/* other header content */}
    </header>
  );
}
```

### 3. OfflineIntegration (`src/components/offline/OfflineIntegration.tsx`)

Integrates all offline functionality and should be added to the root layout.

**Usage:**
```typescript
import { OfflineIntegration } from '@/components/offline';

function RootLayout({ children }) {
  return (
    <OfflineProvider>
      <OfflineIntegration />
      {children}
    </OfflineProvider>
  );
}
```

## Integration Guide

### Step 1: Add OfflineProvider to Root Layout

```typescript
// app/layout.tsx
import { OfflineProvider } from '@/contexts/OfflineContext';
import { OfflineIntegration } from '@/components/offline';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <OfflineProvider>
          <OfflineIntegration />
          {children}
        </OfflineProvider>
      </body>
    </html>
  );
}
```

### Step 2: Use Offline Queue in Activity Recording

```typescript
// In your activity recording logic
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useOffline } from '@/contexts/OfflineContext';

function LessonComponent() {
  const { isOffline } = useOffline();
  const { queueActivity } = useOfflineQueue(userId);
  const { mutateAsync: recordActivity } = useRecordActivity();

  const handleAnswerSubmit = async (answer) => {
    const activity = {
      userId,
      activityType: 'question_answered',
      data: { questionId, answer, correct: isCorrect },
      // ... other fields
    };

    if (isOffline) {
      // Queue for later sync
      await queueActivity(activity);
      // Show immediate UI feedback
      showSuccessMessage('Answer recorded (will sync when online)');
    } else {
      // Send immediately
      await recordActivity(activity);
    }
  };

  return (
    // ... component JSX
  );
}
```

### Step 3: Cache Content for Offline Access

```typescript
// When loading lesson data
import { getContentCacheManager } from '@/lib/offline/content-cache';

async function loadLesson(lessonId: string) {
  const cacheManager = getContentCacheManager();
  await cacheManager.init();

  // Try to get from cache first
  const cached = await cacheManager.getCachedContent(lessonId);
  if (cached && navigator.onLine === false) {
    return cached.data;
  }

  // Fetch from API
  const lesson = await fetchLessonFromAPI(lessonId);

  // Cache for offline use
  await cacheManager.cacheContent(
    lessonId,
    'lesson',
    lesson,
    { ttl: 24 * 60 * 60 * 1000 } // 24 hours
  );

  return lesson;
}
```

## Configuration

### Offline Detection

Configure heartbeat interval and endpoint in OfflineProvider:

```typescript
<OfflineProvider
  heartbeatInterval={30000} // 30 seconds
  heartbeatEndpoint="/api/health"
>
  {children}
</OfflineProvider>
```

### Sync Manager

Configure retry behavior:

```typescript
const syncManager = getSyncManager();
syncManager.maxRetries = 3;
syncManager.retryDelay = 2000; // 2 seconds
```

### IndexedDB

Configure database name and version:

```typescript
const dbManager = new IndexedDBManager({
  dbName: 'learning-platform-offline',
  version: 1,
  storeName: 'activities'
});
```

## Testing

### Manual Testing

1. **Test Offline Detection:**
   - Open DevTools Network tab
   - Set throttling to "Offline"
   - Verify offline banner appears

2. **Test Activity Queueing:**
   - Go offline
   - Answer questions
   - Check IndexedDB (Application tab in DevTools)
   - Verify activities are stored

3. **Test Sync on Reconnection:**
   - Go back online
   - Verify sync starts automatically
   - Check success notification
   - Verify activities are removed from IndexedDB

4. **Test Retry Logic:**
   - Simulate API errors
   - Verify activities are retried
   - Check failed activities after max retries

### Automated Testing

```typescript
// Example test
import { getSyncManager } from '@/lib/offline/sync-manager';

describe('SyncManager', () => {
  it('should sync pending activities', async () => {
    const syncManager = getSyncManager();
    await syncManager.init();

    // Add test activities to IndexedDB
    // ...

    const result = await syncManager.syncAll();

    expect(result.success).toBe(true);
    expect(result.successCount).toBeGreaterThan(0);
  });
});
```

## Troubleshooting

### Activities Not Syncing

1. Check browser console for errors
2. Verify IndexedDB is supported and not full
3. Check network connectivity
4. Verify API endpoints are accessible
5. Check sync manager state

### IndexedDB Errors

1. Clear browser data and try again
2. Check storage quota
3. Verify database version compatibility
4. Check for browser-specific issues

### Performance Issues

1. Limit queue size (clear old activities)
2. Adjust batch size for sync
3. Optimize activity data size
4. Use compression for large payloads

## Requirements Mapping

This implementation satisfies the following requirements:

- **11.1**: Offline detection with banner display
- **11.2**: Activity queueing in IndexedDB
- **11.3**: Offline content caching
- **11.4**: Automatic sync on reconnection
- **11.5**: Sync error handling and retry logic
- **14.1**: Error handling with retry logic

## Future Enhancements

1. **Conflict Resolution**: Handle conflicts when syncing activities
2. **Compression**: Compress activity data to save storage
3. **Selective Sync**: Allow users to choose what to sync
4. **Background Sync**: Use Service Workers for background sync
5. **Sync Scheduling**: Smart scheduling based on network conditions
6. **Analytics**: Track offline usage patterns
