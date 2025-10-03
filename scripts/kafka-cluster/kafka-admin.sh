#!/bin/bash

# Kafka Administration Script for Adaptive Learning Platform
# Provides common administrative tasks for Kafka cluster management

set -e

KAFKA_BROKERS="localhost:9092,localhost:9093,localhost:9094"
SCHEMA_REGISTRY_URL="http://localhost:8081"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Kafka is running
check_kafka_health() {
    print_status "Checking Kafka cluster health..."
    
    for broker in "localhost:9092" "localhost:9093" "localhost:9094"; do
        if kafka-broker-api-versions --bootstrap-server $broker > /dev/null 2>&1; then
            print_status "Broker $broker is healthy"
        else
            print_error "Broker $broker is not responding"
            return 1
        fi
    done
    
    print_status "All Kafka brokers are healthy"
}

# Function to list all topics
list_topics() {
    print_status "Listing all topics..."
    kafka-topics --list --bootstrap-server $KAFKA_BROKERS
}

# Function to describe a topic
describe_topic() {
    local topic_name=$1
    if [ -z "$topic_name" ]; then
        print_error "Topic name is required"
        return 1
    fi
    
    print_status "Describing topic: $topic_name"
    kafka-topics --describe --topic $topic_name --bootstrap-server $KAFKA_BROKERS
}

# Function to check consumer group lag
check_consumer_lag() {
    local group_name=$1
    if [ -z "$group_name" ]; then
        print_status "Listing all consumer groups..."
        kafka-consumer-groups --list --bootstrap-server $KAFKA_BROKERS
        return 0
    fi
    
    print_status "Checking consumer group lag for: $group_name"
    kafka-consumer-groups --describe --group $group_name --bootstrap-server $KAFKA_BROKERS
}

# Function to reset consumer group offset
reset_consumer_offset() {
    local group_name=$1
    local topic_name=$2
    local reset_type=${3:-earliest}
    
    if [ -z "$group_name" ] || [ -z "$topic_name" ]; then
        print_error "Group name and topic name are required"
        return 1
    fi
    
    print_warning "Resetting consumer group $group_name offset for topic $topic_name to $reset_type"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kafka-consumer-groups --bootstrap-server $KAFKA_BROKERS \
            --group $group_name \
            --topic $topic_name \
            --reset-offsets \
            --to-$reset_type \
            --execute
        print_status "Offset reset completed"
    else
        print_status "Operation cancelled"
    fi
}

# Function to produce test messages
produce_test_message() {
    local topic_name=$1
    local message=${2:-"Test message from kafka-admin script"}
    
    if [ -z "$topic_name" ]; then
        print_error "Topic name is required"
        return 1
    fi
    
    print_status "Producing test message to topic: $topic_name"
    echo "$message" | kafka-console-producer --bootstrap-server $KAFKA_BROKERS --topic $topic_name
    print_status "Message sent successfully"
}

# Function to consume messages
consume_messages() {
    local topic_name=$1
    local from_beginning=${2:-false}
    
    if [ -z "$topic_name" ]; then
        print_error "Topic name is required"
        return 1
    fi
    
    print_status "Consuming messages from topic: $topic_name"
    if [ "$from_beginning" = "true" ]; then
        kafka-console-consumer --bootstrap-server $KAFKA_BROKERS --topic $topic_name --from-beginning
    else
        kafka-console-consumer --bootstrap-server $KAFKA_BROKERS --topic $topic_name
    fi
}

# Function to check schema registry
check_schema_registry() {
    print_status "Checking Schema Registry health..."
    
    if curl -f $SCHEMA_REGISTRY_URL/subjects > /dev/null 2>&1; then
        print_status "Schema Registry is healthy"
        print_status "Available subjects:"
        curl -s $SCHEMA_REGISTRY_URL/subjects | jq -r '.[]'
    else
        print_error "Schema Registry is not responding"
        return 1
    fi
}

# Function to get topic metrics
get_topic_metrics() {
    local topic_name=$1
    
    if [ -z "$topic_name" ]; then
        print_error "Topic name is required"
        return 1
    fi
    
    print_status "Getting metrics for topic: $topic_name"
    kafka-log-dirs --bootstrap-server $KAFKA_BROKERS --topic-list $topic_name --describe
}

# Function to alter topic configuration
alter_topic_config() {
    local topic_name=$1
    local config_key=$2
    local config_value=$3
    
    if [ -z "$topic_name" ] || [ -z "$config_key" ] || [ -z "$config_value" ]; then
        print_error "Topic name, config key, and config value are required"
        return 1
    fi
    
    print_warning "Altering topic $topic_name configuration: $config_key=$config_value"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        kafka-configs --bootstrap-server $KAFKA_BROKERS \
            --entity-type topics \
            --entity-name $topic_name \
            --alter \
            --add-config $config_key=$config_value
        print_status "Configuration updated successfully"
    else
        print_status "Operation cancelled"
    fi
}

# Function to delete topic
delete_topic() {
    local topic_name=$1
    
    if [ -z "$topic_name" ]; then
        print_error "Topic name is required"
        return 1
    fi
    
    print_warning "Deleting topic: $topic_name"
    print_error "This action cannot be undone!"
    read -p "Are you sure? Type 'DELETE' to confirm: " -r
    echo
    if [[ $REPLY == "DELETE" ]]; then
        kafka-topics --delete --topic $topic_name --bootstrap-server $KAFKA_BROKERS
        print_status "Topic deleted successfully"
    else
        print_status "Operation cancelled"
    fi
}

# Function to show cluster info
show_cluster_info() {
    print_status "Kafka Cluster Information:"
    echo "=========================="
    
    print_status "Broker Information:"
    kafka-broker-api-versions --bootstrap-server $KAFKA_BROKERS | head -10
    
    print_status "Topic Count:"
    kafka-topics --list --bootstrap-server $KAFKA_BROKERS | wc -l
    
    print_status "Consumer Groups:"
    kafka-consumer-groups --list --bootstrap-server $KAFKA_BROKERS | wc -l
}

# Main script logic
case "$1" in
    "health")
        check_kafka_health
        ;;
    "topics")
        list_topics
        ;;
    "describe")
        describe_topic "$2"
        ;;
    "consumer-lag")
        check_consumer_lag "$2"
        ;;
    "reset-offset")
        reset_consumer_offset "$2" "$3" "$4"
        ;;
    "produce")
        produce_test_message "$2" "$3"
        ;;
    "consume")
        consume_messages "$2" "$3"
        ;;
    "schema-registry")
        check_schema_registry
        ;;
    "metrics")
        get_topic_metrics "$2"
        ;;
    "alter-config")
        alter_topic_config "$2" "$3" "$4"
        ;;
    "delete-topic")
        delete_topic "$2"
        ;;
    "cluster-info")
        show_cluster_info
        ;;
    *)
        echo "Kafka Administration Script"
        echo "Usage: $0 {command} [options]"
        echo ""
        echo "Commands:"
        echo "  health                          - Check Kafka cluster health"
        echo "  topics                          - List all topics"
        echo "  describe <topic>                - Describe a specific topic"
        echo "  consumer-lag [group]            - Check consumer group lag"
        echo "  reset-offset <group> <topic> [earliest|latest] - Reset consumer offset"
        echo "  produce <topic> [message]       - Produce a test message"
        echo "  consume <topic> [from-beginning] - Consume messages from topic"
        echo "  schema-registry                 - Check Schema Registry health"
        echo "  metrics <topic>                 - Get topic metrics"
        echo "  alter-config <topic> <key> <value> - Alter topic configuration"
        echo "  delete-topic <topic>            - Delete a topic (DANGEROUS)"
        echo "  cluster-info                    - Show cluster information"
        echo ""
        echo "Examples:"
        echo "  $0 health"
        echo "  $0 describe user.attempts"
        echo "  $0 consumer-lag user-service-group"
        echo "  $0 produce user.attempts 'test message'"
        echo "  $0 consume user.attempts true"
        exit 1
        ;;
esac