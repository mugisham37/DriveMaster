# Redis Cluster and Caching Infrastructure

This directory contains the Redis cluster setup and caching layer abstractions for the Adaptive Learning Platform. The implementation provides high-availability Redis clustering with comprehensive caching patterns, connection management, and monitoring.

## Architecture Overview

### Redis Cluster Configuration

- **6-node cluster**: 3 masters + 3 replicas for high availability
- **Automatic failover**: Redis Sentinel for monitoring and failover
- **Data persistence**: Both RDB snapshots and AOF logging
- **Security**: Password authentication and TLS support
- **Monitoring**: Prometheus metrics via Redis Exporter

### Caching Layer Features

- **Circuit breaker pattern**: Prevents cascade failures
- **Connection pooling**: Efficient connection management
- **Metrics collection**: Hit ratios, latency, error rates
- **Cache warming**: Proactive data loading
- **Pattern-based invalidation**: Efficient cache cleanup
- **Multi-language support**: Go, TypeScript/Node.js, Python

## Quick Start

### 1. Start Redis Cluster (Development)

```bash
# Start single Redis instance for development
make docker-up

# Or start full Redis cluster for production
make redis-cluster-up
```

### 2. Initialize Cluster (Production)

```bash
# Initialize Redis cluster
make redis-cluster-init

# Check cluster status
docker exec redis-node-1 redis-cli -c -a redis_cluster_password_2024! cluster info
```

### 3. Use in Your Service

#### Go Service

```go
package main

import (
    "context"
    "log"
    "time"

    "your-project/shared/cache/go"
)

func main() {
    config := &cache.RedisConfig{
        Addresses:   []string{"localhost:7001", "localhost:7002", "localhost:7003"},
        Password:    "redis_cluster_password_2024!",
        ClusterMode: true,
    }

    client, err := cache.NewRedisClient(config, "myservice")
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    patterns := cache.NewCachePatterns(client)

    // Cache user data
    user := map[string]interface{}{
        "id": "user123",
        "name": "John Doe",
    }

    ctx := context.Background()
    err = patterns.SetUser(ctx, "user123", user)
    if err != nil {
        log.Printf("Failed to cache user: %v", err)
    }

    // Retrieve user data
    cachedUser, err := patterns.GetUser(ctx, "user123")
    if err != nil {
        log.Printf("Failed to get user: %v", err)
    }
}
```

#### TypeScript/NestJS Service

```typescript
import { Injectable } from "@nestjs/common";
import {
  RedisClient,
  CacheManager,
  CachePatterns,
} from "../shared/cache/typescript";

@Injectable()
export class UserService {
  private cacheManager: CacheManager;
  private patterns: CachePatterns;

  constructor() {
    const config = {
      addresses: ["localhost:7001", "localhost:7002", "localhost:7003"],
      password: "redis_cluster_password_2024!",
      clusterMode: true,
    };

    const client = new RedisClient(config);
    this.cacheManager = new CacheManager(client);
    this.patterns = this.cacheManager.getPatterns();
  }

  async getUser(userId: string) {
    return this.cacheManager.getWithFallback(
      `user:${userId}`,
      3600, // 1 hour TTL
      async () => {
        // Fallback to database
        return await this.userRepository.findById(userId);
      }
    );
  }

  async updateUser(userId: string, userData: any) {
    // Update database
    const user = await this.userRepository.update(userId, userData);

    // Invalidate cache
    await this.patterns.invalidateUser(userId);

    return user;
  }
}
```

#### Python Service

```python
import asyncio
from shared.cache.python import RedisClient, CachePatterns, RedisConfig

async def main():
    config = RedisConfig(
        addresses=["localhost:7001", "localhost:7002", "localhost:7003"],
        password="redis_cluster_password_2024!",
        cluster_mode=True,
    )

    client = RedisClient(config)
    patterns = CachePatterns(client)

    try:
        # Cache prediction
        await patterns.set_prediction("user123", "item456", 0.85)

        # Get prediction
        prediction = await patterns.get_prediction("user123", "item456")
        print(f"Prediction: {prediction}")

        # Batch predictions
        predictions = {
            "item1": 0.75,
            "item2": 0.82,
            "item3": 0.91,
        }
        await patterns.set_batch_predictions("user123", "hash123", predictions)

    finally:
        await client.close()

if __name__ == "__main__":
    asyncio.run(main())
```

## Configuration

### Redis Cluster Configuration

The cluster is configured in `scripts/redis-cluster/redis-cluster.conf`:

```conf
# Network
bind 0.0.0.0
port 7000
protected-mode no

# Cluster
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 15000

# Persistence
appendonly yes
save 900 1
save 300 10
save 60 10000

# Memory Management
maxmemory-policy allkeys-lru

# Security
requirepass redis_cluster_password_2024!
```

### Cache Key Patterns

Standardized key patterns ensure consistency across services:

```
# User-related keys
user:{user_id}                    # User profile data
user:preferences:{user_id}        # User preferences
user:session:{session_id}         # Session data

# Scheduler-related keys
scheduler:{user_id}               # Scheduler state
scheduler:hot:{user_id}           # Hot scheduler data
sm2:{user_id}:{item_id}          # SM-2 algorithm state
bkt:{user_id}:{topic}            # Bayesian Knowledge Tracing

# Content-related keys
item:{item_id}                    # Content items
items:jurisdiction:{country}      # Items by jurisdiction
items:topic:{topic}              # Items by topic

# ML prediction keys
prediction:{user_id}:{item_id}    # Individual predictions
prediction:batch:{user_id}:{hash} # Batch predictions

# Rate limiting keys
rate_limit:user:{user_id}:{endpoint}    # User rate limits
rate_limit:ip:{ip}:{endpoint}           # IP rate limits
```

### TTL Strategy

Different data types have appropriate TTL values:

```
Prediction data:     15 minutes
Session data:        30 minutes
Scheduler state:     30 minutes
User data:           1 hour
Item data:           4 hours
Content lists:       6 hours
Feature flags:       5 minutes
Analytics:           24 hours
```

## Monitoring and Alerting

### Prometheus Metrics

Redis Exporter provides comprehensive metrics:

- `redis_up`: Instance availability
- `redis_memory_used_bytes`: Memory usage
- `redis_connected_clients`: Active connections
- `redis_keyspace_hits_total`: Cache hits
- `redis_keyspace_misses_total`: Cache misses
- `redis_commands_processed_total`: Commands per second

### Grafana Dashboard

Import the dashboard from `scripts/redis-cluster/monitoring/grafana-dashboard.json`:

- Cluster overview and health
- Memory usage and trends
- Command throughput
- Hit ratio analysis
- Network I/O metrics
- Slow query monitoring

### Alerting Rules

Key alerts configured in `scripts/redis-cluster/monitoring/redis_alerts.yml`:

- **RedisInstanceDown**: Instance unavailable > 1 minute
- **RedisHighMemoryUsage**: Memory usage > 90%
- **RedisClusterStateNotOK**: Cluster not in OK state
- **RedisLowHitRatio**: Hit ratio < 80%
- **RedisReplicationLag**: Replica lag > 1000 bytes

## Backup and Recovery

### Automated Backups

```bash
# Create backup of all cluster nodes
make redis-backup

# Or use the script directly
cd scripts/redis-cluster
./backup-recovery.sh backup
```

### Restore from Backup

```bash
# List available backups
./backup-recovery.sh list

# Restore specific node
./backup-recovery.sh restore redis-node-1 redis_backup_redis-node-1_20241203_140000

# Verify backup integrity
./backup-recovery.sh verify redis-node-1 redis_backup_redis-node-1_20241203_140000
```

### Disaster Recovery

Complete disaster recovery procedures are documented in the auto-generated `disaster_recovery_plan.md`.

## Performance Optimization

### Connection Pooling

- **Pool size**: 10 connections per service
- **Min idle**: 5 connections
- **Connection timeout**: 5 seconds
- **Command timeout**: 3 seconds

### Circuit Breaker

- **Failure threshold**: 5 consecutive failures
- **Reset timeout**: 30 seconds
- **States**: closed, open, half-open

### Cache Warming

Proactive loading of frequently accessed data:

- Feature flags
- Global configuration
- Popular content items
- User session data

### Memory Management

- **Eviction policy**: allkeys-lru
- **Memory monitoring**: Alerts at 90% usage
- **Key expiration**: Automatic cleanup of expired keys

## Security

### Authentication

- **Password protection**: All Redis instances require authentication
- **Network isolation**: Redis cluster runs on isolated network
- **TLS encryption**: Available for production deployments

### Access Control

- **Service-specific prefixes**: Logical separation of data
- **Rate limiting**: Per-user and per-IP limits
- **Input validation**: All cache operations validate input

## Troubleshooting

### Common Issues

#### Cluster Formation Failed

```bash
# Check node status
docker exec redis-node-1 redis-cli -a redis_cluster_password_2024! cluster nodes

# Reset cluster if needed
docker exec redis-node-1 redis-cli -a redis_cluster_password_2024! cluster reset

# Reinitialize
make redis-cluster-init
```

#### High Memory Usage

```bash
# Check memory usage
docker exec redis-node-1 redis-cli -a redis_cluster_password_2024! info memory

# Analyze key distribution
docker exec redis-node-1 redis-cli -a redis_cluster_password_2024! --bigkeys

# Force eviction if needed
docker exec redis-node-1 redis-cli -a redis_cluster_password_2024! config set maxmemory-policy allkeys-lru
```

#### Connection Issues

```bash
# Test connectivity
docker exec redis-node-1 redis-cli -a redis_cluster_password_2024! ping

# Check connection limits
docker exec redis-node-1 redis-cli -a redis_cluster_password_2024! config get maxclients

# Monitor connections
docker exec redis-node-1 redis-cli -a redis_cluster_password_2024! client list
```

### Debugging Cache Issues

#### Enable Debug Logging

```go
// Go
client.SetLogLevel("debug")

// TypeScript
const client = new RedisClient(config);
client.enableDebugLogging();

// Python
import logging
logging.getLogger("redis_client").setLevel(logging.DEBUG)
```

#### Monitor Cache Metrics

```bash
# Get cache statistics
curl http://localhost:9121/metrics | grep redis_

# Check hit ratios by service
grep "hit_ratio" /var/log/services/*.log
```

## Development vs Production

### Development Setup

- Single Redis instance
- No authentication required
- Simplified configuration
- Local storage only

### Production Setup

- 6-node Redis cluster
- Password authentication
- TLS encryption
- Persistent storage
- Monitoring and alerting
- Automated backups

## Migration Guide

### From Single Redis to Cluster

1. **Backup existing data**
2. **Deploy cluster infrastructure**
3. **Update service configurations**
4. **Migrate data using Redis migration tools**
5. **Update connection strings**
6. **Test thoroughly**

### Configuration Changes

```diff
# Before (single instance)
- addresses: ["localhost:6379"]
- cluster_mode: false

# After (cluster)
+ addresses: ["localhost:7001", "localhost:7002", "localhost:7003"]
+ cluster_mode: true
+ password: "redis_cluster_password_2024!"
```

## Contributing

### Adding New Cache Patterns

1. **Define key pattern constants**
2. **Add TTL configuration**
3. **Implement get/set methods**
4. **Add invalidation logic**
5. **Write tests**
6. **Update documentation**

### Performance Testing

```bash
# Redis benchmark
redis-benchmark -h localhost -p 7001 -a redis_cluster_password_2024! -c 50 -n 10000

# Custom load testing
cd scripts/redis-cluster
./load-test.sh
```

For more detailed information, see the individual service documentation and the Redis Cluster official documentation.
