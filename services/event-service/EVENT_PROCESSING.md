# Event Processing and Enrichment

This document describes the event processing and enrichment functionality implemented in the Event Service.

## Overview

The Event Service now includes comprehensive event processing capabilities that handle:

1. **Event Enrichment** - Adding contextual data from user and item services
2. **Event Aggregation** - Real-time analytics and metrics collection
3. **Event Filtering** - Intelligent routing and content filtering
4. **Event Deduplication** - Preventing duplicate event processing
5. **Event Ordering** - Ensuring chronological processing

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   HTTP Request  │───▶│  Event Handler   │───▶│  Event Processor│
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                       ┌─────────────────────────────────┼─────────────────────────────────┐
                       │                                 ▼                                 │
                       │                    ┌─────────────────────┐                       │
                       │                    │   Event Processor   │                       │
                       │                    │    (Coordinator)    │                       │
                       │                    └─────────────────────┘                       │
                       │                                 │                                 │
                       │    ┌────────────────────────────┼────────────────────────────┐   │
                       │    │                            ▼                            │   │
                       │    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │   │
                       │    │  │ Deduplicator│  │  Enricher   │  │ Aggregator  │    │   │
                       │    │  └─────────────┘  └─────────────┘  └─────────────┘    │   │
                       │    │                            │                            │   │
                       │    │                   ┌─────────────┐                     │   │
                       │    │                   │   Filter    │                     │   │
                       │    │                   └─────────────┘                     │   │
                       │    └─────────────────────────────────────────────────────┘   │
                       └─────────────────────────────────────────────────────────────┘
                                                         │
                                                         ▼
                                              ┌─────────────────┐
                                              │ Kafka Publisher │
                                              └─────────────────┘
```

## Components

### 1. Event Processor

The main coordinator that orchestrates all processing steps:

- **Asynchronous Processing**: Uses worker goroutines for high throughput
- **Configurable Workers**: Number of workers can be configured via environment variables
- **Metrics Collection**: Tracks processing performance and errors
- **Error Handling**: Graceful degradation when components fail

**Configuration:**

```bash
EVENT_PROCESSOR_ENABLED=true
EVENT_PROCESSOR_WORKERS=4
EVENT_PROCESSOR_BUFFER_SIZE=1000
```

### 2. Event Enricher

Adds contextual information to events by fetching data from external services:

**User Context Enrichment:**

- User type (free, premium)
- Country/jurisdiction
- Study streak and performance history
- Device preferences and timezone
- Total sessions and attempts

**Item Context Enrichment:**

- Item difficulty and topics
- Average performance metrics
- Popularity scores
- Cognitive level classification

**Derived Enrichments:**

- Response time categorization
- Difficulty matching analysis
- Time-of-day patterns
- Performance vs. expected calculations

**Caching Strategy:**

- Local in-memory cache (5-minute TTL)
- Redis cache (15-minute TTL)
- Database fallback for cache misses

### 3. Event Aggregator

Performs real-time aggregation for analytics:

**Default Aggregations:**

- User hourly attempts (accuracy, response times)
- User daily sessions (items attempted, session duration)
- Item hourly performance (difficulty calibration)
- System 5-minute metrics (global throughput)
- Jurisdiction daily statistics

**Aggregation Functions:**

- Sum, Average, Min, Max
- Distinct counts
- Custom business logic aggregations

**Storage:**

- Redis with configurable TTL
- Partitioned by time windows
- Efficient retrieval for dashboards

### 4. Event Filter

Intelligent filtering and routing based on configurable rules:

**Default Filters:**

- **Rapid Fire Detection**: Flags suspiciously fast attempts (<1s)
- **High-Value Users**: Routes premium user events to special analytics
- **Bot Detection**: Identifies automated traffic via user-agent patterns
- **Perfect Score Detection**: Flags potentially suspicious perfect sessions
- **New User Events**: Routes first-time user events for onboarding analytics

**Filter Actions:**

- `allow`: Pass through with special marking
- `block`: Reject the event entirely
- `route`: Add routing hints for downstream processing
- `transform`: Apply data transformations

**Filter Conditions:**

- Equality, inequality, numeric comparisons
- String contains, regex matching
- Array membership, range checks
- Field existence checks

### 5. Event Deduplicator

Prevents duplicate event processing:

**Deduplication Strategies:**

- **Attempt Events**: Uses `client_attempt_id` for idempotency
- **Session Events**: Uses `session_id` as unique identifier
- **Placement Events**: Uses `placement_id` as unique identifier

**Storage:**

- Redis with event-type specific TTL
- Local cache for frequently accessed keys
- Automatic cleanup of expired entries

**TTL Configuration:**

- Attempts: 24 hours
- Sessions: 12 hours
- Placements: 7 days

## API Endpoints

### Processing Metrics

```
GET /metrics/processor
```

Returns detailed processor performance metrics.

### Processor Status

```
GET /processor/status
```

Returns current processor health and status.

### Enrichment Statistics

```
GET /processor/enrichment
```

Returns enrichment success rates and statistics.

### Filter Statistics

```
GET /processor/filters
```

Returns filter usage and effectiveness metrics.

### Aggregation Data

```
GET /processor/aggregation?aggregator=user_hourly_attempts&key=user:123
```

Retrieves aggregated data for specific keys and time ranges.

## Configuration

### Redis Configuration

```bash
REDIS_ADDRESS=localhost:6379
REDIS_PASSWORD=
REDIS_POOL_SIZE=10
REDIS_ENRICHMENT_DB=1
REDIS_AGGREGATION_DB=2
REDIS_DEDUPLICATION_DB=3
```

### Event Processor Configuration

```bash
EVENT_PROCESSOR_ENABLED=true
EVENT_PROCESSOR_WORKERS=4
EVENT_PROCESSOR_BUFFER_SIZE=1000
```

## Performance Characteristics

### Throughput

- **Target**: 10,000+ events/second
- **Latency**: <300ms p95 for processing pipeline
- **Memory**: ~100MB baseline + ~1KB per queued event

### Scalability

- Horizontal scaling via multiple service instances
- Redis cluster support for high availability
- Configurable worker pools for CPU-bound operations

### Reliability

- Graceful degradation when enrichment services fail
- Circuit breaker protection for external dependencies
- Comprehensive error logging and metrics

## Monitoring and Alerting

### Key Metrics

- `events_processed_total`: Total events processed
- `events_enriched_total`: Events successfully enriched
- `events_filtered_total`: Events filtered out
- `events_deduplicated_total`: Duplicate events detected
- `processing_duration_seconds`: Processing time distribution
- `enrichment_cache_hit_ratio`: Cache effectiveness
- `worker_utilization_percent`: Worker pool utilization

### Health Checks

- Processor status endpoint
- Redis connectivity checks
- Worker pool health monitoring
- Queue depth monitoring

## Error Handling

### Enrichment Failures

- Continue processing with empty enrichment data
- Log errors for monitoring and debugging
- Maintain service availability

### Aggregation Failures

- Skip failed aggregations
- Continue with other aggregation types
- Alert on persistent failures

### Filter Failures

- Default to allowing events through
- Log filter evaluation errors
- Maintain event flow integrity

## Testing

The implementation includes comprehensive tests for:

- Event processing pipeline
- Deduplication key generation
- Filter condition evaluation
- Aggregation value updates

Run tests with:

```bash
go test ./internal/processor -v
```

## Future Enhancements

1. **Machine Learning Integration**: Real-time feature extraction for ML models
2. **Advanced Analytics**: Complex event processing (CEP) capabilities
3. **Schema Evolution**: Support for event schema versioning
4. **Stream Processing**: Integration with Apache Kafka Streams
5. **Custom Enrichers**: Plugin system for domain-specific enrichments

## Troubleshooting

### High Memory Usage

- Check queue depth and worker utilization
- Verify Redis connection health
- Monitor cache hit ratios

### Processing Delays

- Increase worker count
- Check external service latency
- Verify Redis performance

### Missing Enrichments

- Check Redis connectivity
- Verify external service availability
- Review cache TTL settings

### Duplicate Events

- Verify client-side UUID generation
- Check deduplication TTL settings
- Monitor Redis storage usage
