# Notification Components

This directory contains all notification-related UI components for the notification service integration.

## Components

### NotificationCenter
The main notification interface component that provides:
- Comprehensive notification list with filtering and sorting
- Search functionality with keyboard shortcuts (⌘K)
- Bulk actions for managing multiple notifications
- Responsive design for mobile and desktop
- Real-time notification updates
- Push permission management integration

**Usage:**
```tsx
import { NotificationCenter } from '@/components/notifications'

<NotificationCenter
  userId="user-123"
  showHeader={true}
  showFilters={true}
  showSearch={true}
  showBulkActions={true}
  maxHeight={600}
  enableRealtime={true}
  onNotificationClick={(notification) => console.log(notification)}
  onClose={() => setIsOpen(false)}
/>
```

### EnhancedNotificationList
A high-performance notification list component with:
- Virtual scrolling for large datasets (50+ notifications)
- Notification grouping by date, type, or priority
- Infinite scroll pagination
- Keyboard navigation and accessibility features
- Bulk selection and actions

**Usage:**
```tsx
import { EnhancedNotificationList } from '@/components/notifications'

<EnhancedNotificationList
  notifications={notifications}
  groupBy="date"
  enableVirtualScrolling={true}
  showBulkActions={true}
  onNotificationClick={handleClick}
  onBulkAction={handleBulkAction}
/>
```

### NotificationToastSystem
Real-time toast notification system featuring:
- Customizable toast styles for different notification types
- Toast queuing and stacking for multiple notifications
- Action buttons and click handling
- Sound and vibration support
- Automatic grouping of similar notifications

**Usage:**
```tsx
import { NotificationToastSystem, useNotificationToast } from '@/components/notifications'

// Component
<NotificationToastSystem
  position="top-right"
  maxVisible={3}
  enableSounds={true}
  enableVibration={true}
/>

// Hook
const { showToast } = useNotificationToast()
showToast(notification, { persistent: true, showAvatar: true })
```

### PushPermissionFlow
Browser push notification permission management:
- User-friendly permission prompts with clear benefits
- Permission status tracking and re-prompt logic
- Fallback messaging for denied permissions
- Device token registration integration

**Usage:**
```tsx
import { PushPermissionFlow } from '@/components/notifications'

<PushPermissionFlow
  isOpen={showPermissionFlow}
  onClose={() => setShowPermissionFlow(false)}
  onPermissionGranted={() => console.log('Permission granted')}
  showBenefits={true}
  autoRegisterOnGrant={true}
/>
```

### NotificationItem
Individual notification display component:
- Type-specific styling and icons
- Action buttons (mark as read, delete, open link)
- Accessibility features and keyboard navigation
- Compact and full display modes

**Usage:**
```tsx
import { NotificationItem } from '@/components/notifications'

<NotificationItem
  notification={notification}
  onMarkAsRead={() => markAsRead(notification.id)}
  onClick={() => handleClick(notification)}
  showActions={true}
/>
```

## Features

### Real-time Updates
All components integrate with the WebSocket client for real-time notification delivery and updates.

### Accessibility
- Full keyboard navigation support
- Screen reader compatibility
- ARIA labels and roles
- High contrast support

### Performance
- Virtual scrolling for large datasets
- Optimistic updates for immediate UI feedback
- Intelligent caching and background refetching
- Debounced search and filtering

### Customization
- Themeable with CSS custom properties
- Configurable notification types and priorities
- Customizable action buttons and behaviors
- Responsive design breakpoints

## Integration

These components integrate with:
- `@/hooks/useNotifications` - Core notification data management
- `@/hooks/useNotificationMutations` - Notification state changes
- `@/hooks/useDeviceTokens` - Push notification setup
- `@/lib/notification-service` - API client and WebSocket integration

## Requirements Fulfilled

This implementation fulfills the following requirements from the notification service integration spec:

- **1.1, 1.2, 1.4**: Core notification operations and display
- **2.1, 2.2**: Device token management and push permissions
- **4.3**: Real-time notification display
- **7.4**: Performance optimization with virtual scrolling

## Demo

Use `NotificationCenterDemo` to test the complete notification center functionality:

```tsx
import { NotificationCenterDemo } from '@/components/notifications'

<NotificationCenterDemo />
```