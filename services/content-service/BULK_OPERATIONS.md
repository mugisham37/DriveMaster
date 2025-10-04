# Bulk Operations Documentation

This document describes the bulk content operations functionality implemented in the Content Service.

## Overview

The bulk operations feature provides comprehensive tools for managing large volumes of content items efficiently. It includes import/export capabilities, batch operations, content migration, and analytics reporting.

## Features

### 1. Bulk Import

Import content items from CSV or JSON format with validation and duplicate handling.

**Endpoint:** `POST /content/bulk/import`

**Features:**

- CSV and JSON format support
- Validation modes (strict/lenient)
- Duplicate handling (skip/auto-generate slugs)
- Comprehensive error reporting
- Import statistics and summaries

**CSV Format Example:**

```csv
slug,questionText,choiceA,choiceB,choiceC,choiceD,correctAnswer,explanation,topics,jurisdictions
speed-limit-residential,What is the speed limit in residential areas?,25 mph,35 mph,45 mph,55 mph,A,Residential areas typically have a 25 mph speed limit,speed-limits,CA
```

### 2. Bulk Export

Export content items in multiple formats with advanced filtering.

**Endpoint:** `POST /content/bulk/export`

**Features:**

- Multiple formats (CSV, JSON, Excel)
- Advanced filtering by status, jurisdiction, topics, etc.
- Asynchronous processing for large datasets
- Signed URL download links
- Export job status tracking

**Supported Filters:**

- Status (draft, published, etc.)
- Jurisdictions
- Topics
- Item types
- Cognitive levels
- Difficulty ranges
- Date ranges

### 3. Batch Operations

Perform operations on multiple items simultaneously.

**Endpoint:** `POST /content/bulk/batch-operation`

**Supported Operations:**

- Approve multiple items
- Publish multiple items
- Archive multiple items
- Delete multiple items
- Duplicate multiple items

### 4. Content Migration

Migrate content between environments with validation.

**Endpoint:** `POST /content/migration/start`

**Features:**

- Environment-to-environment migration
- Dry run validation
- Media asset migration
- Progress tracking
- Rollback capabilities

### 5. Content Analytics

Generate comprehensive analytics and usage reports.

**Endpoint:** `GET /content/analytics`

**Analytics Include:**

- Content distribution by status, type, jurisdiction
- Creation and publication trends
- Average difficulty by topic
- Usage statistics (when integrated)
- Performance metrics (when integrated)

## API Examples

### Bulk Import Example

```typescript
const importRequest = {
  format: "csv",
  items: [
    {
      slug: "test-item-1",
      questionText: "What is the speed limit?",
      choiceA: "25 mph",
      choiceB: "35 mph",
      correctAnswer: "A",
      topics: "speed-limits",
      jurisdictions: "CA,NY",
    },
  ],
  validationMode: "strict",
  skipDuplicates: true,
};

const result = await fetch("/content/bulk/import", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(importRequest),
});
```

### Bulk Export Example

```typescript
const exportRequest = {
  format: "csv",
  status: ["published"],
  jurisdictions: ["CA"],
  includeMedia: true,
};

const exportJob = await fetch("/content/bulk/export", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(exportRequest),
});

// Check status
const status = await fetch(`/content/bulk/export/${exportJob.jobId}`);
```

### Batch Operation Example

```typescript
const batchRequest = {
  itemIds: ["uuid1", "uuid2", "uuid3"],
  operation: "publish",
  parameters: {
    notes: "Batch publication for Q4 release",
  },
};

const result = await fetch("/content/bulk/batch-operation", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(batchRequest),
});
```

## Error Handling

The bulk operations service provides comprehensive error handling:

- **Validation Errors:** Detailed field-level validation messages
- **Duplicate Handling:** Configurable skip or auto-generation
- **Partial Failures:** Continue processing with detailed failure reports
- **Job Tracking:** Asynchronous operation status and progress

## Performance Considerations

- **Batch Size:** Recommended maximum of 1000 items per import
- **Export Limits:** Maximum 10,000 items per export job
- **Async Processing:** Large operations are processed asynchronously
- **Memory Management:** Streaming processing for large files

## Security

- **Role-Based Access:** Different operations require appropriate roles
- **Input Validation:** Comprehensive validation of all inputs
- **Audit Logging:** All operations are logged for audit trails
- **Rate Limiting:** API endpoints are rate-limited

## Integration Points

The bulk operations service integrates with:

- **Content Service:** Core CRUD operations
- **Validation Service:** Content validation
- **S3 Service:** File storage and signed URLs
- **Notification Service:** Status notifications
- **Analytics Service:** Usage statistics (future)

## Future Enhancements

Planned improvements include:

- **Real-time Progress Updates:** WebSocket-based progress notifications
- **Advanced Analytics:** Integration with ML service for performance metrics
- **Template System:** Predefined import/export templates
- **Scheduling:** Automated bulk operations on schedules
- **Version Control:** Bulk operations on specific content versions
