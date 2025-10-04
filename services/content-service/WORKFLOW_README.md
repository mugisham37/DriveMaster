# Content Approval Workflow Implementation

This document describes the content approval workflow system implemented for the adaptive learning platform's content management service.

## Overview

The workflow system provides a structured approval process for content items, ensuring quality control and proper review before publication. It includes role-based access control, comprehensive audit trails, and automated notifications.

## Workflow States

Content items progress through the following states:

1. **DRAFT** - Initial state when content is created or returned for revision
2. **UNDER_REVIEW** - Content has been submitted for review
3. **APPROVED** - Content has been approved by a reviewer
4. **PUBLISHED** - Content is live and available to learners
5. **ARCHIVED** - Content has been removed from active use

## Workflow Actions

### 1. Submit for Review

- **Endpoint**: `POST /content/items/:id/submit-for-review`
- **Role Required**: `CONTENT_AUTHOR` or `ADMIN`
- **Preconditions**: Item must be in `DRAFT` status
- **Validation**: Ensures item has required fields (content, choices, correct answers, topics, jurisdictions)
- **Result**: Changes status to `UNDER_REVIEW`

### 2. Assign Reviewer

- **Endpoint**: `POST /content/items/:id/assign-reviewer`
- **Role Required**: `CONTENT_REVIEWER` or `ADMIN`
- **Preconditions**: Item must be in `UNDER_REVIEW` status
- **Result**: Assigns a specific reviewer to the item

### 3. Review Item (Approve/Reject)

- **Endpoint**: `POST /content/items/:id/review`
- **Role Required**: `CONTENT_REVIEWER` or `ADMIN`
- **Preconditions**: Item must be in `UNDER_REVIEW` status
- **Authorization**: Only assigned reviewer can complete the review (if assigned)
- **Results**:
  - **Approve**: Changes status to `APPROVED`, sets `approvedBy`
  - **Reject**: Changes status to `DRAFT`, clears `approvedBy`

### 4. Publish Item

- **Endpoint**: `POST /content/items/:id/publish`
- **Role Required**: `CONTENT_REVIEWER` or `ADMIN`
- **Preconditions**: Item must be in `APPROVED` status
- **Result**: Changes status to `PUBLISHED`, sets `publishedAt` timestamp

### 5. Archive Item

- **Endpoint**: `POST /content/items/:id/archive`
- **Role Required**: `CONTENT_REVIEWER` or `ADMIN`
- **Result**: Changes status to `ARCHIVED`

### 6. Restore Item

- **Endpoint**: `POST /content/items/:id/restore`
- **Role Required**: `ADMIN`
- **Preconditions**: Item must be in `ARCHIVED` status
- **Result**: Changes status to `DRAFT` for re-review

## Role-Based Access Control

### User Roles

- **LEARNER** - Can only view published content
- **CONTENT_AUTHOR** - Can create and edit content, submit for review
- **CONTENT_REVIEWER** - Can review, approve, reject, and publish content
- **ADMIN** - Full access to all workflow operations

### Role Hierarchy

Roles inherit permissions from lower levels:

- `ADMIN` > `CONTENT_REVIEWER` > `CONTENT_AUTHOR` > `LEARNER`

## Audit Trail

All workflow actions are tracked in the `workflow_history` table:

```sql
CREATE TABLE workflow_history (
    id UUID PRIMARY KEY,
    item_id UUID NOT NULL,
    action workflow_action NOT NULL,
    performed_by UUID NOT NULL,
    previous_status item_status NOT NULL,
    new_status item_status NOT NULL,
    comments TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tracked Actions

- `created` - Item initially created
- `submitted_for_review` - Submitted for review
- `assigned_reviewer` - Reviewer assigned
- `approved` - Item approved
- `rejected` - Item rejected
- `published` - Item published
- `archived` - Item archived
- `restored` - Item restored from archive
- `updated` - Item content updated

## Notification System

The workflow integrates with a notification service to send alerts for:

- **Review Assignment**: Notifies assigned reviewer
- **Status Changes**: Notifies relevant stakeholders
- **Approval/Rejection**: Notifies content author
- **Publication**: Notifies stakeholders

### Notification Types

- Email notifications (future implementation)
- Push notifications (future implementation)
- In-app notifications (future implementation)
- Kafka events for async processing

## Bulk Operations

The system supports bulk workflow operations for efficiency:

- **Endpoint**: `POST /content/items/bulk-workflow`
- **Supported Actions**: `submit_for_review`, `approve`, `reject`, `publish`, `archive`
- **Response**: Detailed results showing successful and failed operations

## Version Management

### Content Rollback

- **Endpoint**: `POST /content/items/:id/rollback`
- **Role Required**: `ADMIN`
- **Function**: Reverts content to a previous version
- **Result**: Resets status to `DRAFT` for re-review

### Version History

- **Endpoint**: `GET /content/items/:id/versions`
- **Function**: Returns version history for an item
- **Note**: Full version history requires additional implementation

## Workflow History API

### Get Workflow History

- **Endpoint**: `GET /content/items/:id/workflow-history`
- **Role Required**: `CONTENT_AUTHOR`, `CONTENT_REVIEWER`, or `ADMIN`
- **Response**: Chronological list of all workflow actions

## Error Handling

The system provides comprehensive error handling:

- **Validation Errors**: Missing required fields, invalid state transitions
- **Authorization Errors**: Insufficient permissions, unauthorized reviewer
- **Business Logic Errors**: Invalid workflow state, missing dependencies
- **System Errors**: Database failures, external service errors

## Security Considerations

1. **Authentication**: All endpoints require valid JWT tokens
2. **Authorization**: Role-based access control enforced
3. **Audit Logging**: All actions logged with user identification
4. **Input Validation**: Comprehensive validation of all inputs
5. **SQL Injection Prevention**: Parameterized queries used throughout

## Future Enhancements

1. **Advanced Notifications**: Email and push notification integration
2. **Workflow Customization**: Configurable workflow states per jurisdiction
3. **Parallel Review**: Multiple reviewer approval requirements
4. **Scheduled Publishing**: Time-based publication scheduling
5. **Content Analytics**: Workflow performance metrics and reporting

## Database Migration

To set up the workflow system, run the migration:

```sql
-- See: src/database/migrations/001-create-workflow-history.sql
```

## Testing

Comprehensive test suite covers:

- Workflow state transitions
- Role-based access control
- Error conditions
- Notification integration
- Audit trail creation

Run tests with:

```bash
npm test -- --testPathPattern=workflow.service.spec.ts
```

## API Documentation

Full API documentation is available via Swagger UI when the service is running:

- Local: `http://localhost:3000/api`
- Swagger JSON: `http://localhost:3000/api-json`
