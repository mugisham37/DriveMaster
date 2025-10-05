# Notification Service

A comprehensive notification service built with NestJS that provides intelligent push notifications, spaced repetition reminders, and advanced analytics for the adaptive learning platform.

## Features

### Core Functionality
- **Multi-Platform Push Notifications**: Firebase Cloud Messaging (FCM) and Apple Push Notification Service (APNS)
- **Template System**: Dynamic notification templates with variable substitution
- **Scheduling**: Cron-based notification scheduling with timezone support
- **Device Token Management**: Automatic token registration, validation, and cleanup
- **Event-Driven Architecture**: Kafka integration for real-time notification triggers

### Intelligent Features
- **Spaced Repetition Reminders**: Automatically schedule review reminders based on SM-2 algorithm
- **Personalized Timing**: Optimize send times based on user engagement patterns
- **A/B Testing**: Built-in A/B testing framework for notification strategies
- **Analytics & Tracking**: Comprehensive delivery and engagement analytics
- **Frequency Optimization**: Prevent notification fatigue with intelligent frequency control

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Notification Service                         │
├─────────────────────────────────────────────────────────────────┤
│  Controllers                                                    │
│  ├── NotificationsController (REST API)                        │
│                                                                 │
│  Services                                                       │
│  ├── NotificationService (Core orchestration)                  │
│  ├── NotificationTemplateService (Template management)         │
│  ├── DeviceTokenService (Token management)                     │
│  ├── NotificationSchedulerService (Cron scheduling)            │
│  ├── KafkaConsumerService (Event processing)                   │
│  └── NotificationAnalyticsService (Analytics & A/B testing)    │
│                                                                 │
│  Providers                                                      │
│  ├── FCMProvider (Firebase Cloud Messaging)                    │
│  └── APNSProvider (Apple Push Notifications)                   │
└─────────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Notification Management
- `POST /notifications` - Create notification
- `POST /notifications/send` - Send immediate notification
- `POST /notifications/schedule` - Schedule notification
- `GET /notifications/:id` - Get notification details
- `GET /notifications/user/:userId` - Get user notifications
- `DELETE /notifications/:id` - Cancel scheduled notification

### Device Token Management
- `POST /notifications/tokens/register` - Register device token
- `DELETE /notifications/tokens/:userId/:token` - Remove device token
- `GET /notifications/tokens/:userId` - Get user tokens

### Template Management
- `POST /notifications/templates` - Create template
- `GET /notifications/templates` - List templates
- `GET /notifications/templates/:id` - Get template
- `POST /notifications/templates/:id/render` - Render template

### Specialized Notifications
- `POST /notifications/spaced-repetition` - Schedule spaced repetition reminder
- `POST /notifications/achievement` - Send achievement notification
- `POST /notifications/streak-reminder` - Schedule streak reminder
- `POST /notifications/mock-test-reminder` - Schedule mock test reminder

### Analytics
- `GET /notifications/analytics/delivery` - Delivery statistics
- `GET /notifications/analytics/engagement` - Engagement statistics
- `GET /notifications/analytics/ab-test-results` - A/B test results
- `POST /notifications/analytics/track-open` - Track notification open
- `POST /notifications/analytics/track-click` - Track notification click
- `GET /notifications/analytics/report` - Generate analytics report

## Configuration

### Environment Variables

```bash
# Service Configuration
PORT=3003
NODE_ENV=production

# Firebase Cloud Messaging
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY=your-private-key
# OR
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/service-account.json

# Apple Push Notifications
APNS_KEY_ID=your-apns-key-id
APNS_TEAM_ID=your-team-id
APNS_KEY_PATH=/path/to/apns-key.p8
APNS_BUNDLE_ID=com.yourapp.bundle
# OR
APNS_CERT_PATH=/path/to/cert.pem
APNS_KEY_PATH=/path/to/key.pem
APNS_PASSPHRASE=your-passphrase

# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_TOPIC_NOTIFICATIONS=notifications.push
KAFKA_CONSUMER_GROUP=notification-service

# Database (for notification templates and tracking)
DATABASE_URL=postgresql://user:password@localhost:5432/adaptive_learning

# Notification Settings
DEFAULT_NOTIFICATION_TTL=86400
MAX_RETRY_ATTEMPTS=3
BATCH_SIZE=100
```

## Usage Examples

### Send Immediate Notification

```typescript
const result = await notificationService.sendNotification({
    userId: 'user-123',
    title: 'Great job!',
    body: 'You completed your daily practice session.',
    data: { type: 'achievement', points: 100 },
    priority: NotificationPriority.HIGH,
});
```

### Schedule Spaced Repetition Reminder

```typescript
const notificationId = await notificationService.scheduleSpacedRepetitionReminder(
    'user-123',
    'Traffic Signs',
    5,
    new Date('2024-01-15T09:00:00Z')
);
```

### Create Custom Template

```typescript
const template = await templateService.createTemplate({
    name: 'Custom Achievement',
    type: NotificationType.ACHIEVEMENT,
    titleTemplate: '🎉 {{achievementName}} Unlocked!',
    bodyTemplate: 'Congratulations! You earned {{points}} points for {{action}}.',
    requiredVariables: ['achievementName', 'points', 'action'],
});
```

### Register Device Token

```typescript
await deviceTokenService.registerToken(
    'user-123',
    'device-token-abc123',
    'ios',
    { appVersion: '1.2.0', deviceModel: 'iPhone 12' }
);
```

## Event-Driven Notifications

The service automatically processes Kafka events to trigger intelligent notifications:

### Attempt Events
- Schedules spaced repetition reminders based on SM-2 algorithm
- Sends streak encouragement for good performance
- Provides gentle reminders for struggling topics

### Session Events
- Suggests mock tests after good practice performance
- Celebrates high accuracy achievements
- Encourages continued practice for low performance

### Placement Events
- Welcomes new users with personalized skill level
- Schedules first learning session reminder

## A/B Testing

Built-in A/B testing framework allows optimization of notification strategies:

```typescript
// Users are automatically assigned to variants
const variantId = await analyticsService.assignUserToVariant('user-123', NotificationType.SPACED_REPETITION);

// Get variant configuration
const variant = await analyticsService.getVariantConfig(variantId);

// View A/B test results
const results = await analyticsService.getABTestResults();
```

## Analytics & Insights

Comprehensive analytics track notification effectiveness:

- **Delivery Rate**: Percentage of notifications successfully delivered
- **Open Rate**: Percentage of delivered notifications opened by users
- **Click Rate**: Percentage of opened notifications that resulted in app engagement
- **Optimal Timing**: Best times to send notifications per user
- **A/B Test Performance**: Comparative performance of different strategies

## Monitoring & Health

### Health Check
```bash
GET /notifications/health
```

### Metrics
- Notification delivery rates
- Provider-specific success rates
- Template usage statistics
- User engagement metrics
- A/B test performance

### Automated Cleanup
- Daily cleanup of old notifications (30+ days)
- Weekly cleanup of inactive device tokens (30+ days)
- Quarterly cleanup of old analytics events (90+ days)

## Development

### Running the Service

```bash
# Install dependencies
npm install

# Start in development mode
npm run start:dev

# Start in production mode
npm run start:prod

# Run tests
npm test
```

### Docker

```bash
# Build image
docker build -t notification-service .

# Run container
docker run -p 3003:3003 --env-file .env notification-service
```

## Integration with Other Services

### User Service
- Retrieves user preferences and timezone information
- Updates user engagement metrics

### Scheduler Service
- Receives spaced repetition timing data
- Gets next due items for reminders

### Analytics Service
- Sends notification engagement events
- Receives user behavior insights

### Event Service
- Consumes user activity events via Kafka
- Publishes notification delivery events

## Security Considerations

- All device tokens are validated before use
- Push notification payloads are sanitized
- Rate limiting prevents notification spam
- User preferences are respected for quiet hours
- GDPR compliance for user data handling

## Performance

- Batch processing for high-volume notifications
- Connection pooling for push notification providers
- Intelligent caching of templates and user preferences
- Asynchronous processing of Kafka events
- Optimized database queries with proper indexing

## Troubleshooting

### Common Issues

1. **Notifications not delivering**
   - Check device token validity
   - Verify push notification provider credentials
   - Review rate limiting settings

2. **High failure rates**
   - Monitor device token cleanup
   - Check network connectivity
   - Verify provider service status

3. **Poor engagement rates**
   - Review A/B test results
   - Analyze optimal timing data
   - Check notification content relevance

### Logs

The service provides structured logging for:
- Notification creation and delivery
- Device token management
- Template rendering
- Analytics events
- Error conditions

## Contributing

1. Follow NestJS best practices
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Monitor performance impact of changes
5. Ensure GDPR compliance for user data