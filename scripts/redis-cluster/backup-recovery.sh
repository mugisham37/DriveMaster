#!/bin/bash

# Redis Cluster Backup and Recovery Script
# Handles backup creation, restoration, and disaster recovery

set -e

# Configuration
REDIS_PASSWORD="redis_cluster_password_2024!"
BACKUP_DIR="/var/lib/redis/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to create backup
create_backup() {
    local node=$1
    local backup_name="redis_backup_${node}_${TIMESTAMP}"
    
    echo -e "${YELLOW}Creating backup for $node...${NC}"
    
    # Create backup directory if it doesn't exist
    docker exec $node mkdir -p $BACKUP_DIR
    
    # Create RDB snapshot
    docker exec $node redis-cli -a $REDIS_PASSWORD BGSAVE
    
    # Wait for background save to complete
    while [ "$(docker exec $node redis-cli -a $REDIS_PASSWORD LASTSAVE)" = "$(docker exec $node redis-cli -a $REDIS_PASSWORD LASTSAVE)" ]; do
        sleep 1
    done
    
    # Copy RDB file to backup directory
    docker exec $node cp /data/dump.rdb "$BACKUP_DIR/${backup_name}.rdb"
    
    # Copy AOF file if it exists
    if docker exec $node test -f /data/appendonly.aof; then
        docker exec $node cp /data/appendonly.aof "$BACKUP_DIR/${backup_name}.aof"
    fi
    
    # Create metadata file
    docker exec $node sh -c "echo '{
        \"node\": \"$node\",
        \"timestamp\": \"$TIMESTAMP\",
        \"backup_type\": \"full\",
        \"rdb_file\": \"${backup_name}.rdb\",
        \"aof_file\": \"${backup_name}.aof\"
    }' > $BACKUP_DIR/${backup_name}.meta"
    
    echo -e "${GREEN}✓ Backup created for $node: ${backup_name}${NC}"
}

# Function to backup all cluster nodes
backup_cluster() {
    echo -e "${YELLOW}Starting cluster backup...${NC}"
    
    local nodes=("redis-node-1" "redis-node-2" "redis-node-3" "redis-node-4" "redis-node-5" "redis-node-6")
    
    for node in "${nodes[@]}"; do
        if docker ps | grep -q $node; then
            create_backup $node
        else
            echo -e "${RED}⚠ Node $node is not running, skipping backup${NC}"
        fi
    done
    
    echo -e "${GREEN}✓ Cluster backup completed${NC}"
}

# Function to restore from backup
restore_backup() {
    local node=$1
    local backup_name=$2
    
    echo -e "${YELLOW}Restoring $node from backup $backup_name...${NC}"
    
    # Stop Redis service
    docker exec $node redis-cli -a $REDIS_PASSWORD SHUTDOWN NOSAVE || true
    
    # Wait for shutdown
    sleep 2
    
    # Restore RDB file
    if docker exec $node test -f "$BACKUP_DIR/${backup_name}.rdb"; then
        docker exec $node cp "$BACKUP_DIR/${backup_name}.rdb" /data/dump.rdb
        echo -e "${GREEN}✓ RDB file restored${NC}"
    fi
    
    # Restore AOF file
    if docker exec $node test -f "$BACKUP_DIR/${backup_name}.aof"; then
        docker exec $node cp "$BACKUP_DIR/${backup_name}.aof" /data/appendonly.aof
        echo -e "${GREEN}✓ AOF file restored${NC}"
    fi
    
    # Restart Redis
    docker restart $node
    
    # Wait for Redis to start
    sleep 5
    
    # Verify restoration
    if docker exec $node redis-cli -a $REDIS_PASSWORD ping > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Node $node restored successfully${NC}"
    else
        echo -e "${RED}❌ Failed to restore node $node${NC}"
        exit 1
    fi
}

# Function to clean old backups
cleanup_backups() {
    echo -e "${YELLOW}Cleaning up old backups (older than $RETENTION_DAYS days)...${NC}"
    
    local nodes=("redis-node-1" "redis-node-2" "redis-node-3" "redis-node-4" "redis-node-5" "redis-node-6")
    
    for node in "${nodes[@]}"; do
        if docker ps | grep -q $node; then
            docker exec $node find $BACKUP_DIR -name "redis_backup_${node}_*" -mtime +$RETENTION_DAYS -delete
            echo -e "${GREEN}✓ Cleaned up old backups for $node${NC}"
        fi
    done
}

# Function to list available backups
list_backups() {
    echo -e "${YELLOW}Available backups:${NC}"
    
    local nodes=("redis-node-1" "redis-node-2" "redis-node-3" "redis-node-4" "redis-node-5" "redis-node-6")
    
    for node in "${nodes[@]}"; do
        if docker ps | grep -q $node; then
            echo -e "${YELLOW}$node:${NC}"
            docker exec $node ls -la $BACKUP_DIR/ | grep "redis_backup_${node}_" || echo "  No backups found"
        fi
    done
}

# Function to verify backup integrity
verify_backup() {
    local node=$1
    local backup_name=$2
    
    echo -e "${YELLOW}Verifying backup integrity for $backup_name...${NC}"
    
    # Check if backup files exist
    if ! docker exec $node test -f "$BACKUP_DIR/${backup_name}.rdb"; then
        echo -e "${RED}❌ RDB backup file not found${NC}"
        return 1
    fi
    
    # Verify RDB file integrity
    if docker exec $node redis-check-rdb "$BACKUP_DIR/${backup_name}.rdb" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ RDB backup file is valid${NC}"
    else
        echo -e "${RED}❌ RDB backup file is corrupted${NC}"
        return 1
    fi
    
    # Verify AOF file if it exists
    if docker exec $node test -f "$BACKUP_DIR/${backup_name}.aof"; then
        if docker exec $node redis-check-aof "$BACKUP_DIR/${backup_name}.aof" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ AOF backup file is valid${NC}"
        else
            echo -e "${RED}❌ AOF backup file is corrupted${NC}"
            return 1
        fi
    fi
    
    echo -e "${GREEN}✓ Backup verification completed successfully${NC}"
}

# Function to create disaster recovery plan
create_dr_plan() {
    echo -e "${YELLOW}Creating disaster recovery documentation...${NC}"
    
    cat > disaster_recovery_plan.md << 'EOF'
# Redis Cluster Disaster Recovery Plan

## Overview
This document outlines the disaster recovery procedures for the Redis cluster.

## Backup Strategy
- **Frequency**: Daily automated backups at 2 AM UTC
- **Retention**: 30 days
- **Storage**: Local Docker volumes with option for remote storage
- **Types**: Both RDB snapshots and AOF logs

## Recovery Procedures

### 1. Single Node Failure
```bash
# Identify failed node
docker ps | grep redis-node

# Restore from latest backup
./backup-recovery.sh restore <node-name> <backup-name>

# Verify cluster health
docker exec redis-node-1 redis-cli -c -a $REDIS_PASSWORD cluster nodes
```

### 2. Multiple Node Failure
```bash
# Stop all Redis services
docker-compose -f docker-compose.redis-cluster.yml down

# Restore each node from backup
for node in redis-node-{1..6}; do
    ./backup-recovery.sh restore $node <backup-name>
done

# Restart cluster
docker-compose -f docker-compose.redis-cluster.yml up -d

# Reinitialize cluster if needed
./setup-cluster.sh
```

### 3. Complete Cluster Loss
```bash
# Deploy new cluster infrastructure
docker-compose -f docker-compose.redis-cluster.yml up -d

# Wait for nodes to be ready
sleep 30

# Restore data from backups
./backup-recovery.sh restore-cluster <backup-date>

# Verify cluster integrity
./backup-recovery.sh verify-cluster
```

## Monitoring and Alerting
- Monitor cluster health via Redis Exporter metrics
- Set up alerts for node failures, memory usage, and replication lag
- Regular backup verification (weekly)

## Testing
- Monthly disaster recovery drills
- Backup restoration testing
- Failover scenario testing

## Contact Information
- Primary: DevOps Team
- Secondary: Platform Engineering Team
- Emergency: On-call rotation
EOF

    echo -e "${GREEN}✓ Disaster recovery plan created: disaster_recovery_plan.md${NC}"
}

# Main function
main() {
    case "${1:-help}" in
        "backup")
            backup_cluster
            ;;
        "restore")
            if [ -z "$2" ] || [ -z "$3" ]; then
                echo -e "${RED}Usage: $0 restore <node-name> <backup-name>${NC}"
                exit 1
            fi
            restore_backup "$2" "$3"
            ;;
        "cleanup")
            cleanup_backups
            ;;
        "list")
            list_backups
            ;;
        "verify")
            if [ -z "$2" ] || [ -z "$3" ]; then
                echo -e "${RED}Usage: $0 verify <node-name> <backup-name>${NC}"
                exit 1
            fi
            verify_backup "$2" "$3"
            ;;
        "dr-plan")
            create_dr_plan
            ;;
        "help"|*)
            echo -e "${YELLOW}Redis Cluster Backup and Recovery Tool${NC}"
            echo ""
            echo "Usage: $0 <command> [options]"
            echo ""
            echo "Commands:"
            echo "  backup              Create backup of all cluster nodes"
            echo "  restore <node> <backup>  Restore specific node from backup"
            echo "  cleanup             Remove old backups (older than $RETENTION_DAYS days)"
            echo "  list                List available backups"
            echo "  verify <node> <backup>   Verify backup integrity"
            echo "  dr-plan             Create disaster recovery documentation"
            echo "  help                Show this help message"
            ;;
    esac
}

# Run main function
main "$@"