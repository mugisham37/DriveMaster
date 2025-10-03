#!/bin/bash

# Schema Registry Management Script
# Manages Protocol Buffer schemas in Confluent Schema Registry

set -e

SCHEMA_REGISTRY_URL=${SCHEMA_REGISTRY_URL:-"http://localhost:8081"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Schema Registry is available
check_schema_registry() {
    print_status "Checking Schema Registry at $SCHEMA_REGISTRY_URL..."
    
    if curl -f "$SCHEMA_REGISTRY_URL/subjects" > /dev/null 2>&1; then
        print_status "Schema Registry is available"
    else
        print_error "Schema Registry is not available at $SCHEMA_REGISTRY_URL"
        exit 1
    fi
}

# Convert proto to JSON schema for Schema Registry
proto_to_json_schema() {
    local proto_file=$1
    local subject_name=$2
    
    print_status "Converting $proto_file to JSON schema for subject $subject_name"
    
    # This is a simplified conversion - in practice, you might use protoc-gen-jsonschema
    # or a custom converter that properly handles protobuf to JSON schema conversion
    
    cat << EOF
{
  "schemaType": "PROTOBUF",
  "schema": "$(cat $proto_file | sed 's/"/\\"/g' | tr '\n' ' ')"
}
EOF
}

# Register a schema
register_schema() {
    local proto_file=$1
    local subject_name=$2
    
    if [ ! -f "$proto_file" ]; then
        print_error "Proto file $proto_file not found"
        return 1
    fi
    
    print_status "Registering schema for subject: $subject_name"
    
    # Create the schema JSON
    local schema_json=$(proto_to_json_schema "$proto_file" "$subject_name")
    
    # Register the schema
    local response=$(curl -s -X POST \
        -H "Content-Type: application/vnd.schemaregistry.v1+json" \
        -d "$schema_json" \
        "$SCHEMA_REGISTRY_URL/subjects/$subject_name/versions")
    
    if echo "$response" | grep -q '"id"'; then
        local schema_id=$(echo "$response" | grep -o '"id":[0-9]*' | cut -d':' -f2)
        print_status "Schema registered successfully with ID: $schema_id"
    else
        print_error "Failed to register schema: $response"
        return 1
    fi
}

# List all subjects
list_subjects() {
    print_status "Listing all subjects in Schema Registry..."
    
    local subjects=$(curl -s "$SCHEMA_REGISTRY_URL/subjects")
    echo "$subjects" | jq -r '.[]' | while read subject; do
        echo "  - $subject"
    done
}

# Get schema by subject and version
get_schema() {
    local subject_name=$1
    local version=${2:-"latest"}
    
    print_status "Getting schema for subject: $subject_name, version: $version"
    
    local response=$(curl -s "$SCHEMA_REGISTRY_URL/subjects/$subject_name/versions/$version")
    echo "$response" | jq '.'
}

# Delete a subject
delete_subject() {
    local subject_name=$1
    
    print_warning "Deleting subject: $subject_name"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        local response=$(curl -s -X DELETE "$SCHEMA_REGISTRY_URL/subjects/$subject_name")
        print_status "Subject deleted: $response"
    else
        print_status "Operation cancelled"
    fi
}

# Check schema compatibility
check_compatibility() {
    local proto_file=$1
    local subject_name=$2
    
    if [ ! -f "$proto_file" ]; then
        print_error "Proto file $proto_file not found"
        return 1
    fi
    
    print_status "Checking compatibility for subject: $subject_name"
    
    local schema_json=$(proto_to_json_schema "$proto_file" "$subject_name")
    
    local response=$(curl -s -X POST \
        -H "Content-Type: application/vnd.schemaregistry.v1+json" \
        -d "$schema_json" \
        "$SCHEMA_REGISTRY_URL/compatibility/subjects/$subject_name/versions/latest")
    
    local is_compatible=$(echo "$response" | jq -r '.is_compatible')
    
    if [ "$is_compatible" = "true" ]; then
        print_status "Schema is compatible"
    else
        print_error "Schema is not compatible"
        echo "$response" | jq '.'
        return 1
    fi
}

# Register all event schemas
register_all_schemas() {
    print_status "Registering all event schemas..."
    
    # Define schema mappings
    declare -A schema_mappings=(
        ["events/attempt_event.proto"]="adaptive-learning.events.AttemptEvent"
        ["events/session_event.proto"]="adaptive-learning.events.SessionEvent"
        ["events/placement_event.proto"]="adaptive-learning.events.PlacementEvent"
        ["events/user_activity_event.proto"]="adaptive-learning.events.UserActivityEvent"
        ["events/notification_event.proto"]="adaptive-learning.events.NotificationEvent"
    )
    
    local success_count=0
    local total_count=${#schema_mappings[@]}
    
    for proto_file in "${!schema_mappings[@]}"; do
        local subject_name="${schema_mappings[$proto_file]}"
        
        if register_schema "$proto_file" "$subject_name"; then
            ((success_count++))
        fi
    done
    
    print_status "Registered $success_count out of $total_count schemas"
    
    if [ $success_count -eq $total_count ]; then
        print_status "All schemas registered successfully!"
    else
        print_warning "Some schemas failed to register"
        return 1
    fi
}

# Validate all schemas
validate_all_schemas() {
    print_status "Validating all schemas..."
    
    declare -A schema_mappings=(
        ["events/attempt_event.proto"]="adaptive-learning.events.AttemptEvent"
        ["events/session_event.proto"]="adaptive-learning.events.SessionEvent"
        ["events/placement_event.proto"]="adaptive-learning.events.PlacementEvent"
        ["events/user_activity_event.proto"]="adaptive-learning.events.UserActivityEvent"
        ["events/notification_event.proto"]="adaptive-learning.events.NotificationEvent"
    )
    
    local success_count=0
    local total_count=${#schema_mappings[@]}
    
    for proto_file in "${!schema_mappings[@]}"; do
        local subject_name="${schema_mappings[$proto_file]}"
        
        if check_compatibility "$proto_file" "$subject_name"; then
            ((success_count++))
        fi
    done
    
    print_status "Validated $success_count out of $total_count schemas"
    
    if [ $success_count -eq $total_count ]; then
        print_status "All schemas are valid!"
    else
        print_warning "Some schemas failed validation"
        return 1
    fi
}

# Show schema evolution
show_schema_evolution() {
    local subject_name=$1
    
    print_status "Showing schema evolution for subject: $subject_name"
    
    local versions=$(curl -s "$SCHEMA_REGISTRY_URL/subjects/$subject_name/versions")
    
    echo "$versions" | jq -r '.[]' | while read version; do
        echo "Version $version:"
        local schema_info=$(curl -s "$SCHEMA_REGISTRY_URL/subjects/$subject_name/versions/$version")
        echo "  ID: $(echo "$schema_info" | jq -r '.id')"
        echo "  Subject: $(echo "$schema_info" | jq -r '.subject')"
        echo "  Version: $(echo "$schema_info" | jq -r '.version')"
        echo ""
    done
}

# Main script logic
case "$1" in
    "check")
        check_schema_registry
        ;;
    "list")
        list_subjects
        ;;
    "register")
        if [ -z "$2" ] || [ -z "$3" ]; then
            print_error "Usage: $0 register <proto_file> <subject_name>"
            exit 1
        fi
        register_schema "$2" "$3"
        ;;
    "register-all")
        register_all_schemas
        ;;
    "get")
        if [ -z "$2" ]; then
            print_error "Usage: $0 get <subject_name> [version]"
            exit 1
        fi
        get_schema "$2" "$3"
        ;;
    "delete")
        if [ -z "$2" ]; then
            print_error "Usage: $0 delete <subject_name>"
            exit 1
        fi
        delete_subject "$2"
        ;;
    "compatibility")
        if [ -z "$2" ] || [ -z "$3" ]; then
            print_error "Usage: $0 compatibility <proto_file> <subject_name>"
            exit 1
        fi
        check_compatibility "$2" "$3"
        ;;
    "validate-all")
        validate_all_schemas
        ;;
    "evolution")
        if [ -z "$2" ]; then
            print_error "Usage: $0 evolution <subject_name>"
            exit 1
        fi
        show_schema_evolution "$2"
        ;;
    *)
        echo "Schema Registry Management Script"
        echo "Usage: $0 {command} [options]"
        echo ""
        echo "Commands:"
        echo "  check                           - Check Schema Registry availability"
        echo "  list                            - List all subjects"
        echo "  register <proto_file> <subject> - Register a schema"
        echo "  register-all                    - Register all event schemas"
        echo "  get <subject> [version]         - Get schema by subject and version"
        echo "  delete <subject>                - Delete a subject"
        echo "  compatibility <proto_file> <subject> - Check schema compatibility"
        echo "  validate-all                    - Validate all schemas"
        echo "  evolution <subject>             - Show schema evolution"
        echo ""
        echo "Environment Variables:"
        echo "  SCHEMA_REGISTRY_URL            - Schema Registry URL (default: http://localhost:8081)"
        echo ""
        echo "Examples:"
        echo "  $0 check"
        echo "  $0 register events/attempt_event.proto adaptive-learning.events.AttemptEvent"
        echo "  $0 register-all"
        echo "  $0 get adaptive-learning.events.AttemptEvent"
        echo "  $0 compatibility events/attempt_event.proto adaptive-learning.events.AttemptEvent"
        exit 1
        ;;
esac