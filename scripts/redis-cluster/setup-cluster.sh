#!/bin/bash

# Redis Cluster Setup Script
# This script sets up a Redis cluster with proper configuration

set -e

echo "🚀 Setting up Redis Cluster..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
REDIS_PASSWORD="redis_cluster_password_2024!"
CLUSTER_NODES=(
    "redis-node-1:7000"
    "redis-node-2:7000"
    "redis-node-3:7000"
    "redis-node-4:7000"
    "redis-node-5:7000"
    "redis-node-6:7000"
)

# Function to check if Redis node is ready
check_redis_node() {
    local node=$1
    local host=$(echo $node | cut -d':' -f1)
    local port=$(echo $node | cut -d':' -f2)
    
    echo "Checking Redis node: $node"
    docker exec -it $host redis-cli -h $host -p $port -a $REDIS_PASSWORD ping > /dev/null 2>&1
}

# Function to wait for all nodes to be ready
wait_for_nodes() {
    echo -e "${YELLOW}Waiting for Redis nodes to be ready...${NC}"
    
    for node in "${CLUSTER_NODES[@]}"; do
        local host=$(echo $node | cut -d':' -f1)
        local max_attempts=30
        local attempt=1
        
        while [ $attempt -le $max_attempts ]; do
            if check_redis_node $node; then
                echo -e "${GREEN}✓ $node is ready${NC}"
                break
            else
                echo -e "${YELLOW}⏳ Waiting for $node (attempt $attempt/$max_attempts)${NC}"
                sleep 2
                ((attempt++))
            fi
        done
        
        if [ $attempt -gt $max_attempts ]; then
            echo -e "${RED}❌ Failed to connect to $node after $max_attempts attempts${NC}"
            exit 1
        fi
    done
}

# Function to create Redis cluster
create_cluster() {
    echo -e "${YELLOW}Creating Redis cluster...${NC}"
    
    local nodes_string=""
    for node in "${CLUSTER_NODES[@]}"; do
        nodes_string="$nodes_string $node"
    done
    
    # Create cluster with 1 replica per master (3 masters, 3 replicas)
    docker exec -it redis-node-1 redis-cli -a $REDIS_PASSWORD --cluster create $nodes_string --cluster-replicas 1 --cluster-yes
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Redis cluster created successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to create Redis cluster${NC}"
        exit 1
    fi
}

# Function to verify cluster status
verify_cluster() {
    echo -e "${YELLOW}Verifying cluster status...${NC}"
    
    echo "Cluster Info:"
    docker exec -it redis-node-1 redis-cli -c -a $REDIS_PASSWORD cluster info
    
    echo -e "\nCluster Nodes:"
    docker exec -it redis-node-1 redis-cli -c -a $REDIS_PASSWORD cluster nodes
    
    echo -e "\n${GREEN}✓ Cluster verification complete${NC}"
}

# Function to test cluster functionality
test_cluster() {
    echo -e "${YELLOW}Testing cluster functionality...${NC}"
    
    # Test setting and getting values across different nodes
    echo "Setting test values..."
    docker exec -it redis-node-1 redis-cli -c -a $REDIS_PASSWORD set test:key1 "value1"
    docker exec -it redis-node-2 redis-cli -c -a $REDIS_PASSWORD set test:key2 "value2"
    docker exec -it redis-node-3 redis-cli -c -a $REDIS_PASSWORD set test:key3 "value3"
    
    echo "Getting test values..."
    val1=$(docker exec -it redis-node-1 redis-cli -c -a $REDIS_PASSWORD get test:key1 | tr -d '\r')
    val2=$(docker exec -it redis-node-2 redis-cli -c -a $REDIS_PASSWORD get test:key2 | tr -d '\r')
    val3=$(docker exec -it redis-node-3 redis-cli -c -a $REDIS_PASSWORD get test:key3 | tr -d '\r')
    
    if [[ "$val1" == "value1" && "$val2" == "value2" && "$val3" == "value3" ]]; then
        echo -e "${GREEN}✓ Cluster functionality test passed${NC}"
    else
        echo -e "${RED}❌ Cluster functionality test failed${NC}"
        echo "Expected: value1, value2, value3"
        echo "Got: $val1, $val2, $val3"
        exit 1
    fi
    
    # Clean up test keys
    docker exec -it redis-node-1 redis-cli -c -a $REDIS_PASSWORD del test:key1 test:key2 test:key3
}

# Function to setup monitoring
setup_monitoring() {
    echo -e "${YELLOW}Setting up monitoring...${NC}"
    
    # Check if Redis Exporter is running
    if docker ps | grep -q redis-exporter; then
        echo -e "${GREEN}✓ Redis Exporter is running on port 9121${NC}"
        echo "Metrics available at: http://localhost:9121/metrics"
    else
        echo -e "${YELLOW}⚠ Redis Exporter not found. Make sure to start it for monitoring.${NC}"
    fi
    
    # Check Sentinel status
    if docker ps | grep -q redis-sentinel; then
        echo -e "${GREEN}✓ Redis Sentinel is running${NC}"
        docker exec -it redis-sentinel-1 redis-cli -p 26379 -a sentinel_password_2024! sentinel masters
    else
        echo -e "${YELLOW}⚠ Redis Sentinel not found. Consider starting it for high availability.${NC}"
    fi
}

# Main execution
main() {
    echo -e "${GREEN}Redis Cluster Setup Starting...${NC}"
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
        exit 1
    fi
    
    # Wait for nodes to be ready
    wait_for_nodes
    
    # Create cluster
    create_cluster
    
    # Verify cluster
    verify_cluster
    
    # Test cluster
    test_cluster
    
    # Setup monitoring
    setup_monitoring
    
    echo -e "${GREEN}🎉 Redis Cluster setup completed successfully!${NC}"
    echo -e "${YELLOW}Cluster endpoints:${NC}"
    for i in {1..6}; do
        echo "  - redis-node-$i: localhost:700$i"
    done
    echo -e "${YELLOW}Sentinel endpoints:${NC}"
    for i in {1..3}; do
        echo "  - redis-sentinel-$i: localhost:2637$((8+i))"
    done
    echo -e "${YELLOW}Monitoring:${NC}"
    echo "  - Redis Exporter: http://localhost:9121/metrics"
}

# Run main function
main "$@"