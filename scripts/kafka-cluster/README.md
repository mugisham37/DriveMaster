# Kafka Cluster Setup for Adaptive Learning Platform

This directory contains the complete Kafka infrastructure setup for the Adaptive Learning Platform, including cluster configuration, monitoring, and administration tools.

## Overview

The Kafka setup provides:

- 3-broker Kafka cluster with high availability
- Schema Registry for Protocol Buffer schema management
- Kafka Connect for data integration
- Comprehensive monitoring with Prometheus and Grafana
- Administrative tools for cluster management

## Quick Start

### 1. Start the Kafka Cluster

```bash
# Start the full Kafka cluster with monitoring
docker-compose -f docker-compose.kafka-cluster.yml up -d

# Wait for all services to be healthy
docker-compose -f docker-compose.kafka-cluster.yml ps
```

### 2. Create Topics

```bash
# Make the script executable (Linux/Mac)
chmod +x create-topics.sh

# Create all required topics
./create-topics.sh
```

### 3. Verify Setup

```bash
# Check cluster health
./kafka-admin.sh health

# List all topics
./kafka-admin.sh topics

# Check Schema Registry
./kafka-admin.sh schema-registry
```

## Architecture

### Kafka Cluster Configuration

- **3 Kafka Brokers**: `kafka-1:9092`, `kafka-2:9093`, `kafka-3:9094`
- **Replication Factor**: 3 (for high availability)
- **Min In-Sync Replicas**: 2 (for consistency)
- **Auto Topic Creation**: Disabled (topics must be explicitly created)

### Topic Configuration

| Topic                | Partitions | Retention | Purpose             |
| -------------------- | ---------- | --------- | ------------------- |
| `user.attempts`      | 12         | 30 days   | User attempt events |
| `user.sessions`      | 6          | 90 days   | User session events |
| `ml.training_events` | 8          | 1 year    | ML training data    |
| `notifications.push` | 4          | 1 day     | Push notifications  |
| `system.audit`       | 2          | 3 years   | Audit logs          |
| `fraud.alerts`       | 4          | 30 days   | Fraud detection     |

### Schema Registry

- **URL**: `http://localhost:8081`
- **Compatibility**: BACKWARD (allows schema evolution)
- **Storage**: Kafka topic `_schemas`

## Monitoring

### Prometheus Metrics

Access Prometheus at `http://localhost:9090`

Key metrics monitored:

- Broker health and availability
- Consumer lag per topic/group
- Disk usage and I/O
- Request rates and latencies
- Under-replicated partitions

### Grafana Dashboards

Access Grafana at `http://localhost:3000` (admin/admin)

Pre-configured dashboards:

- Kafka Cluster Overview
- Consumer Lag Monitoring
- Broker Performance
- Topic Metrics

### Kafka UI

Access Kafka UI at `http://localhost:8080`

Features:

- Topic management
- Consumer group monitoring
- Message browsing
- Schema Registry integration

## Administration

### Using kafka-admin.sh

```bash
# Check cluster health
./kafka-admin.sh health

# List all topics
./kafka-admin.sh topics

# Describe a specific topic
./kafka-admin.sh describe user.attempts

# Check consumer group lag
./kafka-admin.sh consumer-lag user-service-group

# Produce test message
./kafka-admin.sh produce user.attempts "test message"

# Consume messages
./kafka-admin.sh consume user.attempts true

# Reset consumer offset
./kafka-admin.sh reset-offset user-service-group user.attempts earliest

# Get topic metrics
./kafka-admin.sh metrics user.attempts

# Show cluster information
./kafka-admin.sh cluster-info
```

### Common Operations

#### Adding a New Topic

```bash
kafka-topics --create \
    --bootstrap-server localhost:9092,localhost:9093,localhost:9094 \
    --topic new-topic \
    --partitions 6 \
    --replication-factor 3 \
    --config min.insync.replicas=2 \
    --config retention.ms=2592000000
```

#### Scaling Topic Partitions

```bash
kafka-topics --alter \
    --bootstrap-server localhost:9092,localhost:9093,localhost:9094 \
    --topic user.attempts \
    --partitions 16
```

#### Updating Topic Configuration

```bash
kafka-configs --bootstrap-server localhost:9092,localhost:9093,localhost:9094 \
    --entity-type topics \
    --entity-name user.attempts \
    --alter \
    --add-config retention.ms=3600000
```

## Security Considerations

### Current Setup (Development)

- No authentication/authorization
- Plain text communication
- No encryption at rest

### Production Recommendations

- Enable SASL/SCRAM authentication
- Use SSL/TLS for encryption in transit
- Implement ACLs for authorization
- Enable encryption at rest
- Network segmentation

## Performance Tuning

### Broker Configuration

- `num.network.threads=8`: Network thread pool size
- `num.io.threads=8`: I/O thread pool size
- `socket.send.buffer.bytes=102400`: Socket send buffer
- `socket.receive.buffer.bytes=102400`: Socket receive buffer
- `num.replica.fetchers=4`: Replica fetcher threads

### Producer Configuration

- `compression.type=snappy`: Message compression
- `batch.size=16384`: Batch size for sending
- `linger.ms=5`: Wait time for batching
- `acks=all`: Wait for all replicas

### Consumer Configuration

- `fetch.min.bytes=1`: Minimum fetch size
- `fetch.max.wait.ms=500`: Maximum wait time
- `max.partition.fetch.bytes=1048576`: Max partition fetch size

## Troubleshooting

### Common Issues

#### Broker Not Starting

```bash
# Check logs
docker logs kafka-1

# Common causes:
# - Port conflicts
# - Insufficient memory
# - Zookeeper not available
```

#### Consumer Lag Issues

```bash
# Check consumer group status
./kafka-admin.sh consumer-lag your-consumer-group

# Possible solutions:
# - Scale consumer instances
# - Increase partition count
# - Optimize consumer processing
```

#### Schema Registry Issues

```bash
# Check Schema Registry health
curl http://localhost:8081/subjects

# Common causes:
# - Kafka not available
# - Schema compatibility issues
# - Network connectivity
```

### Log Locations

- Kafka logs: `/var/lib/kafka/data`
- Zookeeper logs: `/var/lib/zookeeper/log`
- Application logs: `docker logs <container-name>`

## Backup and Recovery

### Topic Data Backup

```bash
# Export topic data
kafka-console-consumer --bootstrap-server localhost:9092 \
    --topic user.attempts \
    --from-beginning \
    --max-messages 1000000 > backup.json
```

### Schema Backup

```bash
# Export all schemas
curl http://localhost:8081/subjects | jq -r '.[]' | \
    xargs -I {} curl http://localhost:8081/subjects/{}/versions/latest
```

## Development vs Production

### Development Setup

- Single Zookeeper instance
- Relaxed replication requirements
- Auto topic creation enabled
- No security

### Production Setup

- Zookeeper ensemble (3+ nodes)
- Strict replication (RF=3, min.insync.replicas=2)
- Auto topic creation disabled
- Full security enabled
- Monitoring and alerting
- Backup and disaster recovery

## Integration with Services

### Go Services (User, Scheduler, Event)

```go
import "github.com/segmentio/kafka-go"

config := kafka.ReaderConfig{
    Brokers: []string{"kafka-1:29092", "kafka-2:29093", "kafka-3:29094"},
    Topic:   "user.attempts",
    GroupID: "user-service-group",
}
```

### Python Services (ML, Fraud)

```python
from kafka import KafkaConsumer, KafkaProducer

consumer = KafkaConsumer(
    'ml.training_events',
    bootstrap_servers=['kafka-1:29092', 'kafka-2:29093', 'kafka-3:29094'],
    group_id='ml-service-group'
)
```

### NestJS Services (Auth, Content, Notification)

```typescript
import { KafkaModule } from "@nestjs/microservices";

KafkaModule.register({
  client: {
    brokers: ["kafka-1:29092", "kafka-2:29093", "kafka-3:29094"],
  },
});
```

## Maintenance

### Regular Tasks

- Monitor disk usage
- Check consumer lag
- Review error logs
- Update retention policies
- Clean up unused topics

### Weekly Tasks

- Review performance metrics
- Check replication status
- Validate backup procedures
- Update monitoring dashboards

### Monthly Tasks

- Review capacity planning
- Update security configurations
- Performance tuning
- Disaster recovery testing
