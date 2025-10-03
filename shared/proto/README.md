# Protocol Buffer Schemas for Adaptive Learning Platform

This directory contains the Protocol Buffer schema definitions for all events in the Adaptive Learning Platform. These schemas ensure type safety, schema evolution, and efficient serialization across all services.

## Overview

The event schemas are designed to capture comprehensive data about user interactions, learning progress, and system behavior. Each schema includes:

- **Event metadata**: Unique identifiers, timestamps, and correlation IDs
- **Domain data**: Core business logic data specific to each event type
- **Context information**: Device, session, and environmental context
- **Algorithm states**: Snapshots of ML algorithm states for training
- **Behavioral metrics**: User behavior patterns and engagement data

## Schema Files

### Core Learning Events

#### `attempt_event.proto`

Captures individual question attempts with comprehensive context and algorithm state snapshots.

**Key Features:**

- Multiple response types (multiple choice, true/false, text, numeric)
- Device and network context
- SM-2, BKT, IRT, and bandit algorithm states
- Behavioral metrics (timing, hesitation, hints used)

**Usage:**

```protobuf
message AttemptEvent {
  string user_id = 2;
  string item_id = 3;
  AttemptResponse response = 7;
  bool correct = 8;
  AlgorithmStates state_before = 15;
  AlgorithmStates state_after = 16;
}
```

#### `session_event.proto`

Represents complete learning sessions with performance metrics and progress tracking.

**Key Features:**

- Session timing and performance metrics
- Topic-level progress tracking
- Mastery changes during session
- Engagement and interruption tracking
- Difficulty distribution analysis

**Usage:**

```protobuf
message SessionEvent {
  string session_id = 2;
  SessionType session_type = 17;
  SessionProgress progress = 28;
  repeated TopicProgress topic_progress = 29;
}
```

#### `placement_event.proto`

Captures placement test execution and results with detailed psychometric analysis.

**Key Features:**

- Adaptive test configuration and execution
- IRT-based ability estimation
- Comprehensive performance analysis
- Learning path recommendations
- Algorithm performance metrics

**Usage:**

```protobuf
message PlacementEvent {
  string placement_id = 2;
  PlacementResults results = 7;
  PlacementAlgorithm algorithm = 8;
}
```

### User Interaction Events

#### `user_activity_event.proto`

Tracks various user interactions and behaviors across the platform.

**Key Features:**

- Multiple activity types (navigation, content, learning, social)
- Behavioral metrics and patterns
- Engagement scoring
- Performance tracking

**Usage:**

```protobuf
message UserActivityEvent {
  ActivityType activity_type = 5;
  oneof activity_data {
    NavigationActivity navigation = 11;
    LearningActivity learning = 13;
    EngagementActivity engagement = 16;
  }
}
```

### System Events

#### `notification_event.proto`

Manages notification lifecycle from creation to user interaction.

**Key Features:**

- Multi-channel notification support
- Personalization and targeting
- Delivery tracking and metrics
- A/B testing integration
- User interaction analysis

**Usage:**

```protobuf
message NotificationEvent {
  NotificationDetails notification = 5;
  NotificationEventType event_type = 6;
  DeliveryInfo delivery = 8;
  UserInteraction interaction = 9;
}
```

## Code Generation

### Prerequisites

Install required tools:

```bash
# Protocol Buffers compiler
# Visit: https://grpc.io/docs/protoc-installation/

# Go plugins
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Python plugins
pip install grpcio-tools

# Optional: TypeScript plugin
npm install -g protoc-gen-ts

# Optional: Documentation plugin
# Visit: https://github.com/pseudomuto/protoc-gen-doc
```

### Generate Code

```bash
# Make script executable
chmod +x generate.sh

# Generate all language bindings
./generate.sh
```

This generates:

- **Go**: `generated/go/` - For Go services (User, Scheduler, Event)
- **Python**: `generated/python/` - For Python services (ML, Fraud)
- **TypeScript**: `generated/typescript/` - For Node.js services (Auth, Content, Notification)
- **Documentation**: `generated/docs/` - HTML documentation
- **JSON Schemas**: `generated/json-schemas/` - For validation

### Generated Structure

```
generated/
├── go/
│   ├── events/
│   │   ├── attempt_event.pb.go
│   │   ├── session_event.pb.go
│   │   └── ...
│   └── go.mod
├── python/
│   ├── events/
│   │   ├── attempt_event_pb2.py
│   │   ├── session_event_pb2.py
│   │   └── ...
│   └── setup.py
├── typescript/
│   ├── events/
│   │   ├── attempt_event_pb.ts
│   │   ├── session_event_pb.ts
│   │   └── ...
│   └── package.json
├── docs/
│   └── index.html
└── json-schemas/
    ├── AttemptEvent.json
    ├── SessionEvent.json
    └── ...
```

## Schema Registry Integration

### Setup

The schemas are registered in Confluent Schema Registry for runtime validation and evolution management.

```bash
# Check Schema Registry availability
./schema-registry.sh check

# Register all schemas
./schema-registry.sh register-all

# List registered subjects
./schema-registry.sh list
```

### Schema Evolution

The schemas support backward-compatible evolution:

```bash
# Check compatibility before deploying changes
./schema-registry.sh compatibility events/attempt_event.proto adaptive-learning.events.AttemptEvent

# View schema evolution history
./schema-registry.sh evolution adaptive-learning.events.AttemptEvent
```

### Compatibility Rules

- **BACKWARD**: New schema can read data written with previous schema
- **FORWARD**: Previous schema can read data written with new schema
- **FULL**: Both backward and forward compatible

## Usage in Services

### Go Services

```go
import (
    "github.com/adaptive-learning/shared/proto/events"
    "google.golang.org/protobuf/proto"
)

// Create an attempt event
attemptEvent := &events.AttemptEvent{
    EventId:         uuid.New().String(),
    UserId:          userID,
    ItemId:          itemID,
    SessionId:       sessionID,
    ClientAttemptId: clientAttemptID,
    Timestamp:       timestamppb.Now(),
    Response: &events.AttemptResponse{
        ResponseType: &events.AttemptResponse_MultipleChoice{
            MultipleChoice: &events.MultipleChoiceResponse{
                SelectedOptions: []string{"A", "C"},
                SelectionTimeMs: 2500,
            },
        },
    },
    Correct: true,
    Quality: 4,
}

// Serialize for Kafka
data, err := proto.Marshal(attemptEvent)
```

### Python Services

```python
from events import attempt_event_pb2
from google.protobuf.timestamp_pb2 import Timestamp
import time

# Create an attempt event
attempt_event = attempt_event_pb2.AttemptEvent()
attempt_event.event_id = str(uuid.uuid4())
attempt_event.user_id = user_id
attempt_event.item_id = item_id
attempt_event.session_id = session_id
attempt_event.timestamp.GetCurrentTime()

# Set response
attempt_event.response.multiple_choice.selected_options.extend(["A", "C"])
attempt_event.response.multiple_choice.selection_time_ms = 2500
attempt_event.correct = True
attempt_event.quality = 4

# Serialize for Kafka
data = attempt_event.SerializeToString()
```

### TypeScript Services

```typescript
import { AttemptEvent, AttemptResponse } from "./events/attempt_event_pb";
import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";

// Create an attempt event
const attemptEvent = new AttemptEvent();
attemptEvent.setEventId(uuidv4());
attemptEvent.setUserId(userId);
attemptEvent.setItemId(itemId);
attemptEvent.setSessionId(sessionId);

const timestamp = new Timestamp();
timestamp.fromDate(new Date());
attemptEvent.setTimestamp(timestamp);

// Set response
const response = new AttemptResponse();
const multipleChoice = new AttemptResponse.MultipleChoiceResponse();
multipleChoice.setSelectedOptionsList(["A", "C"]);
multipleChoice.setSelectionTimeMs(2500);
response.setMultipleChoice(multipleChoice);
attemptEvent.setResponse(response);

attemptEvent.setCorrect(true);
attemptEvent.setQuality(4);

// Serialize for Kafka
const data = attemptEvent.serializeBinary();
```

## Event Patterns

### Event Sourcing

Events are immutable and represent facts that have occurred:

```protobuf
message AttemptEvent {
  string event_id = 1;           // Unique event identifier
  google.protobuf.Timestamp timestamp = 6;  // When it happened
  string user_id = 2;            // Who did it
  // ... event data
}
```

### State Snapshots

Algorithm states are captured before and after each event for ML training:

```protobuf
message AlgorithmStates {
  SM2State sm2_state = 1;
  map<string, BKTState> bkt_states = 2;
  map<string, IRTAbility> irt_abilities = 3;
  BanditState bandit_state = 4;
}
```

### Context Enrichment

Events include rich context for analysis:

```protobuf
message DeviceContext {
  string device_type = 1;
  string platform = 2;
  string app_version = 3;
  NetworkInfo network_info = 9;
}
```

## Best Practices

### Schema Design

1. **Use semantic versioning** for schema evolution
2. **Include comprehensive context** for future analysis
3. **Design for backward compatibility** from the start
4. **Use oneof for polymorphic data** to maintain type safety
5. **Include metadata fields** for debugging and correlation

### Field Naming

1. **Use snake_case** for field names
2. **Be descriptive** but concise
3. **Include units** in field names (e.g., `time_taken_ms`)
4. **Use consistent naming** across schemas

### Evolution Guidelines

1. **Never remove required fields**
2. **Never change field types**
3. **Never reuse field numbers**
4. **Add new fields as optional**
5. **Use default values appropriately**

### Performance Considerations

1. **Use appropriate field types** (int32 vs int64)
2. **Consider message size** for high-volume events
3. **Use repeated fields judiciously**
4. **Optimize for common access patterns**

## Validation

### Schema Validation

```bash
# Validate all proto files
protoc --proto_path=. --descriptor_set_out=/dev/null events/*.proto

# Check for breaking changes
buf breaking --against '.git#branch=main'
```

### Runtime Validation

```go
// Validate required fields
if attemptEvent.GetUserId() == "" {
    return errors.New("user_id is required")
}

// Validate business rules
if attemptEvent.GetQuality() < 0 || attemptEvent.GetQuality() > 5 {
    return errors.New("quality must be between 0 and 5")
}
```

## Monitoring

### Schema Registry Metrics

- Schema registration success/failure rates
- Schema evolution frequency
- Compatibility check results
- Schema usage by service

### Event Metrics

- Event production rates by type
- Serialization/deserialization performance
- Schema validation errors
- Event size distribution

## Troubleshooting

### Common Issues

#### Schema Registration Failures

```bash
# Check Schema Registry connectivity
curl http://localhost:8081/subjects

# Validate schema syntax
protoc --proto_path=. --descriptor_set_out=/dev/null events/attempt_event.proto
```

#### Compatibility Issues

```bash
# Check what changed
./schema-registry.sh compatibility events/attempt_event.proto adaptive-learning.events.AttemptEvent

# View evolution history
./schema-registry.sh evolution adaptive-learning.events.AttemptEvent
```

#### Code Generation Issues

```bash
# Check protoc installation
protoc --version

# Check plugin availability
which protoc-gen-go
which protoc-gen-go-grpc
```

### Debug Tips

1. **Use schema validation** in development
2. **Log serialization errors** with context
3. **Monitor schema registry** for issues
4. **Test schema evolution** in staging
5. **Use descriptive error messages**

## Contributing

### Adding New Events

1. Create new `.proto` file in `events/` directory
2. Follow naming conventions and best practices
3. Add to `generate.sh` and `schema-registry.sh`
4. Update documentation
5. Test schema evolution compatibility

### Modifying Existing Events

1. Ensure backward compatibility
2. Test with existing data
3. Update version numbers
4. Document breaking changes
5. Coordinate with consuming services

## References

- [Protocol Buffers Language Guide](https://developers.google.com/protocol-buffers/docs/proto3)
- [gRPC Documentation](https://grpc.io/docs/)
- [Confluent Schema Registry](https://docs.confluent.io/platform/current/schema-registry/index.html)
- [Schema Evolution Best Practices](https://docs.confluent.io/platform/current/schema-registry/avro.html#schema-evolution-and-compatibility)
