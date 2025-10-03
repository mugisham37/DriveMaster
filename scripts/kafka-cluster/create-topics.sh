#!/bin/bash

# Kafka Topic Creation Script for Adaptive Learning Platform
# This script creates all required topics with proper configuration

set -e

KAFKA_BROKERS="localhost:9092,localhost:9093,localhost:9094"
REPLICATION_FACTOR=3
MIN_IN_SYNC_REPLICAS=2

echo "Creating Kafka topics for Adaptive Learning Platform..."

# Function to create topic with retry logic
create_topic() {
    local topic_name=$1
    local partitions=$2
    local retention_ms=$3
    local cleanup_policy=${4:-delete}
    local compression_type=${5:-snappy}
    
    echo "Creating topic: $topic_name"
    
    kafka-topics --create \
        --bootstrap-server $KAFKA_BROKERS \
        --topic $topic_name \
        --partitions $partitions \
        --replication-factor $REPLICATION_FACTOR \
        --config min.insync.replicas=$MIN_IN_SYNC_REPLICAS \
        --config retention.ms=$retention_ms \
        --config cleanup.policy=$cleanup_policy \
        --config compression.type=$compression_type \
        --config segment.ms=604800000 \
        --config max.message.bytes=1000000 \
        --if-not-exists
    
    echo "Topic $topic_name created successfully"
}

# High-volume user events (30 days retention)
create_topic "user.attempts" 12 2592000000 "delete" "snappy"
create_topic "user.sessions" 6 7776000000 "delete" "snappy"
create_topic "user.placements" 4 7776000000 "delete" "snappy"
create_topic "user.activities" 8 2592000000 "delete" "snappy"

# ML training data (1 year retention)
create_topic "ml.training_events" 8 31536000000 "delete" "gzip"
create_topic "ml.model_updates" 2 31536000000 "delete" "gzip"
create_topic "ml.predictions" 4 604800000 "delete" "snappy"

# Real-time notifications (1 day retention)
create_topic "notifications.push" 4 86400000 "delete" "snappy"
create_topic "notifications.email" 2 604800000 "delete" "snappy"
create_topic "notifications.sms" 2 604800000 "delete" "snappy"

# System events (3 years retention for compliance)
create_topic "system.audit" 2 94608000000 "delete" "gzip"
create_topic "system.security" 2 94608000000 "delete" "gzip"
create_topic "system.errors" 4 2592000000 "delete" "snappy"

# Content management events (90 days retention)
create_topic "content.updates" 2 7776000000 "delete" "snappy"
create_topic "content.approvals" 2 7776000000 "delete" "snappy"

# Fraud detection events (30 days retention)
create_topic "fraud.alerts" 4 2592000000 "delete" "snappy"
create_topic "fraud.analysis" 2 7776000000 "delete" "gzip"

# Dead letter queues (7 days retention)
create_topic "dlq.attempts" 2 604800000 "delete" "snappy"
create_topic "dlq.sessions" 2 604800000 "delete" "snappy"
create_topic "dlq.notifications" 2 604800000 "delete" "snappy"
create_topic "dlq.general" 2 604800000 "delete" "snappy"

# Analytics and reporting (6 months retention)
create_topic "analytics.user_behavior" 6 15552000000 "delete" "gzip"
create_topic "analytics.content_performance" 4 15552000000 "delete" "gzip"
create_topic "analytics.system_metrics" 4 15552000000 "delete" "gzip"

echo "All topics created successfully!"

# List all topics to verify
echo "Listing all topics:"
kafka-topics --list --bootstrap-server $KAFKA_BROKERS

echo "Topic creation completed!"