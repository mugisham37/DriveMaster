# Scheduler State Management Implementation

## Overview

This document describes the implementation of task 6.4 "Implement scheduler state management" for the adaptive learning platform. The implementation provides comprehensive scheduler state management with versioning, caching, backup/recovery, and support for multiple adaptive learning algorithms.

## Components Implemented

### 1. Models (`internal/models/scheduler_state.go`)

**Core Data Structures:**

- `UserSchedulerState`: Main scheduler state containing all algorithm states
- `SM2State`: Spaced Repetition System (SM-2) state per item
- `BKTState`: Bayesian Knowledge Tracing state per topic
- `BanditState`: Contextual bandit state for strategy selection
- `SchedulerStateUpdate`: Update structure with optimistic locking
- `SchedulerStateBackup`: Backup structure for recovery

**Key Features:**

- **SM-2 Algorithm**: Implements spaced repetition with easiness factor, intervals, and quality scoring
- **Bayesian Knowledge Tracing**: Tracks knowledge probability, guess/slip rates, and learning probability
- **Contextual Bandit**: Strategy selection with exploration/exploitation balance
- **IRT Ability Tracking**: Per-topic ability estimation with confidence intervals
- **State Validation**: Comprehensive validation for all probability bounds and constraints
- **Deep Cloning**: Safe state copying for concurrent operations

### 2. Repository (`internal/repository/scheduler_state_repository.go`)

**Database Operations:**

- Full CRUD operations with optimistic locking
- Atomic updates with retry logic for concurrent access
- Backup creation and restoration
- Batch operations for multiple users
- Maintenance operations (cleanup, stale state detection)

**Key Features:**

- **Optimistic Locking**: Version-based concurrency control
- **JSON Storage**: Efficient storage of complex nested state structures
- **Backup System**: Automatic and manual backup creation with recovery
- **Batch Processing**: Efficient multi-user operations
- **Error Handling**: Comprehensive error types and recovery mechanisms

### 3. Service (`internal/service/scheduler_state_service.go`)

**Business Logic:**

- State lifecycle management (create, read, update, delete)
- Algorithm-specific update methods
- Session management with consecutive day tracking
- Caching integration with Redis
- Event publishing for state changes

**Key Features:**

- **Atomic Updates**: Thread-safe state modifications using repository locks
- **Cache Integration**: Write-through caching with TTL management
- **Event Publishing**: Kafka events for state changes and audit trails
- **Session Tracking**: Start/end session with study time accumulation
- **Algorithm Updates**: Dedicated methods for SM-2, BKT, IRT, and bandit updates

### 4. Handlers (`internal/handlers/scheduler_state_handler.go`)

**gRPC Interface:**

- Protocol buffer-based API for scheduler state operations
- Input validation and error handling
- State conversion between internal models and protobuf messages

**API Methods:**

- `GetSchedulerState`: Retrieve user's scheduler state
- `CreateSchedulerState`: Initialize new scheduler state
- `UpdateSM2State`: Update SM-2 state for specific item
- `UpdateBKTState`: Update BKT state for specific topic
- `UpdateAbility`: Update IRT ability for topic
- `StartSession`/`EndSession`: Session lifecycle management
- `CreateBackup`/`RestoreFromBackup`: Backup operations

### 5. Configuration Updates

**Cache Configuration:**

- Added `SchedulerState` TTL configuration (30 minutes default)
- Cache key patterns for scheduler state storage

**Event System:**

- New event types for scheduler state lifecycle
- Event publishing for audit trails and downstream processing

## Algorithm Implementations

### SM-2 Spaced Repetition

```go
func (s *SM2State) UpdateSM2(quality int) {
    // Update easiness factor based on quality (0-5)
    s.EasinessFactor = s.EasinessFactor + 0.1 - (5-quality)*(0.08+(5-quality)*0.02)

    if quality < 3 {
        // Reset for poor performance
        s.Interval = 1
        s.Repetition = 0
    } else {
        // Progress through intervals: 1, 6, then EF * previous
        s.Repetition++
        // ... interval calculation
    }

    s.NextDue = time.Now().AddDate(0, 0, s.Interval)
}
```

### Bayesian Knowledge Tracing

```go
func (b *BKTState) UpdateBKT(correct bool) {
    if correct {
        // P(L|correct) using Bayes rule
        probCorrect := b.ProbKnowledge*(1-b.ProbSlip) + (1-b.ProbKnowledge)*b.ProbGuess
        b.ProbKnowledge = (b.ProbKnowledge * (1 - b.ProbSlip)) / probCorrect
    } else {
        // P(L|incorrect) using Bayes rule
        probIncorrect := b.ProbKnowledge*b.ProbSlip + (1-b.ProbKnowledge)*(1-b.ProbGuess)
        b.ProbKnowledge = (b.ProbKnowledge * b.ProbSlip) / probIncorrect
    }

    // Apply learning: P(L) = P(L) + (1-P(L)) * P(T)
    b.ProbKnowledge = b.ProbKnowledge + (1-b.ProbKnowledge)*b.ProbLearn
}
```

### Contextual Bandit

```go
func (b *BanditState) UpdateBandit(strategy string, reward float64) {
    // Exponential moving average for strategy weights
    alpha := 0.1
    if currentWeight, exists := b.StrategyWeights[strategy]; exists {
        b.StrategyWeights[strategy] = (1-alpha)*currentWeight + alpha*reward
    } else {
        b.StrategyWeights[strategy] = reward
    }

    // Decay exploration rate over time
    b.ExplorationRate = b.ExplorationRate * 0.999
    if b.ExplorationRate < 0.01 {
        b.ExplorationRate = 0.01 // Minimum exploration
    }
}
```

## Database Schema

### Main State Table

```sql
CREATE TABLE user_scheduler_state (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    ability_vector JSONB NOT NULL DEFAULT '{}',
    ability_confidence JSONB DEFAULT '{}',
    sm2_states JSONB NOT NULL DEFAULT '{}',
    bkt_states JSONB NOT NULL DEFAULT '{}',
    bandit_state JSONB DEFAULT '{}',
    current_session_id UUID,
    last_session_end TIMESTAMPTZ,
    consecutive_days INTEGER DEFAULT 0,
    total_study_time_ms BIGINT DEFAULT 0,
    version INTEGER DEFAULT 1,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Backup Table

```sql
CREATE TABLE scheduler_state_backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    state_data JSONB NOT NULL,
    backup_type VARCHAR(50) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Caching Strategy

### Redis Key Patterns

- `scheduler:state:{user_id}`: Complete scheduler state
- TTL: 30 minutes (configurable)
- Write-through caching with automatic invalidation

### Cache Operations

- **Read**: Try cache first, fallback to database
- **Write**: Update database first, then cache
- **Delete**: Remove from both database and cache
- **Sync**: Manual cache refresh for stale data

## Event Publishing

### Event Types

- `scheduler.state.created`: New scheduler state created
- `scheduler.state.updated`: State updated with version info
- `scheduler.state.deleted`: State deleted
- `scheduler.state.restored`: State restored from backup

### Event Data

- User ID and state metadata
- Version information for optimistic locking
- Timestamp and source service information

## Testing

### Unit Tests (`internal/models/scheduler_state_test.go`)

- Algorithm correctness (SM-2, BKT, Bandit)
- State validation and bounds checking
- Deep cloning and immutability
- Edge cases and error conditions

### Service Tests (`internal/service/scheduler_state_service_test.go`)

- Service method functionality
- Cache integration
- Event publishing
- Error handling and recovery

### Integration Tests (`internal/integration_scheduler_test.go`)

- End-to-end workflow testing
- Multi-user scenarios
- Concurrent update simulation
- Algorithm integration verification

## Performance Characteristics

### Latency Targets

- State retrieval: < 50ms (cached), < 200ms (database)
- State updates: < 300ms (with optimistic locking)
- Batch operations: < 1s for 100 users

### Scalability Features

- Optimistic locking for high concurrency
- Efficient JSON storage and indexing
- Redis caching for hot data
- Batch operations for bulk processing

## Error Handling

### Error Types

- `ErrSchedulerStateNotFound`: State doesn't exist
- `ErrOptimisticLock`: Concurrent modification detected
- `ErrInvalidSchedulerState`: Validation failure
- `ErrBackupFailed`: Backup operation failure

### Recovery Mechanisms

- Automatic retry for optimistic lock conflicts
- Backup creation before destructive operations
- State validation before persistence
- Graceful degradation for cache failures

## Integration Points

### Main Service Integration

- Repository and service initialization in `main.go`
- gRPC handler registration
- Configuration loading and validation

### Dependencies

- PostgreSQL for persistent storage
- Redis for caching layer
- Kafka for event publishing
- Protocol Buffers for API definitions

## Usage Examples

### Creating and Managing Scheduler State

```go
// Create new scheduler state
state, err := schedulerService.CreateSchedulerState(ctx, userID)

// Update SM-2 state for an item
state, err = schedulerService.UpdateSM2State(ctx, userID, itemID, quality)

// Update BKT state for a topic
state, err = schedulerService.UpdateBKTState(ctx, userID, topic, correct)

// Start a learning session
state, err = schedulerService.StartSession(ctx, userID, sessionID)

// End session with study time
state, err = schedulerService.EndSession(ctx, userID, studyTimeMs)
```

### Backup and Recovery

```go
// Create manual backup
backup, err := schedulerService.CreateBackup(ctx, userID, "Before algorithm update")

// Restore from backup
state, err := schedulerService.RestoreFromBackup(ctx, backupID)
```

## Future Enhancements

### Planned Improvements

1. **Advanced Algorithms**: Deep Knowledge Tracing (DKT) integration
2. **Performance Optimization**: Connection pooling and query optimization
3. **Monitoring**: Detailed metrics and alerting
4. **A/B Testing**: Algorithm parameter experimentation
5. **Data Analytics**: Learning effectiveness measurement

### Extensibility Points

- Algorithm interface for pluggable implementations
- Event-driven architecture for loose coupling
- Configuration-driven parameter tuning
- Modular backup/recovery strategies

## Conclusion

The scheduler state management implementation provides a robust, scalable foundation for adaptive learning algorithms. It supports multiple learning theories (spaced repetition, knowledge tracing, contextual bandits) with proper state management, caching, and recovery mechanisms. The implementation is thoroughly tested and ready for production deployment.
