#!/bin/bash

# Protocol Buffer Code Generation Script
# Generates Go, Python, TypeScript, and other language bindings from .proto files

set -e

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

# Check if protoc is installed
check_protoc() {
    if ! command -v protoc &> /dev/null; then
        print_error "protoc is not installed. Please install Protocol Buffers compiler."
        print_error "Visit: https://grpc.io/docs/protoc-installation/"
        exit 1
    fi
    
    print_status "Found protoc version: $(protoc --version)"
}

# Check if required plugins are installed
check_plugins() {
    local missing_plugins=()
    
    # Check Go plugin
    if ! command -v protoc-gen-go &> /dev/null; then
        missing_plugins+=("protoc-gen-go")
    fi
    
    # Check Go gRPC plugin
    if ! command -v protoc-gen-go-grpc &> /dev/null; then
        missing_plugins+=("protoc-gen-go-grpc")
    fi
    
    # Check Python gRPC plugin
    if ! command -v grpc_tools.protoc &> /dev/null && ! python -c "import grpc_tools.protoc" 2>/dev/null; then
        missing_plugins+=("grpcio-tools (Python)")
    fi
    
    if [ ${#missing_plugins[@]} -ne 0 ]; then
        print_error "Missing required plugins:"
        for plugin in "${missing_plugins[@]}"; do
            print_error "  - $plugin"
        done
        print_error ""
        print_error "Install missing plugins:"
        print_error "  Go: go install google.golang.org/protobuf/cmd/protoc-gen-go@latest"
        print_error "  Go gRPC: go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest"
        print_error "  Python: pip install grpcio-tools"
        exit 1
    fi
    
    print_status "All required plugins are available"
}

# Create output directories
create_directories() {
    print_status "Creating output directories..."
    
    # Go output directories
    mkdir -p generated/go/events
    
    # Python output directories
    mkdir -p generated/python/events
    
    # TypeScript output directories
    mkdir -p generated/typescript/events
    
    # Documentation output
    mkdir -p generated/docs
    
    print_status "Output directories created"
}

# Generate Go code
generate_go() {
    print_status "Generating Go code..."
    
    protoc \
        --go_out=generated/go \
        --go_opt=paths=source_relative \
        --go-grpc_out=generated/go \
        --go-grpc_opt=paths=source_relative \
        --proto_path=. \
        events/*.proto
    
    print_status "Go code generation completed"
}

# Generate Python code
generate_python() {
    print_status "Generating Python code..."
    
    python -m grpc_tools.protoc \
        --python_out=generated/python \
        --grpc_python_out=generated/python \
        --proto_path=. \
        events/*.proto
    
    # Create __init__.py files
    touch generated/python/__init__.py
    touch generated/python/events/__init__.py
    
    print_status "Python code generation completed"
}

# Generate TypeScript code (requires protoc-gen-ts)
generate_typescript() {
    if command -v protoc-gen-ts &> /dev/null; then
        print_status "Generating TypeScript code..."
        
        protoc \
            --ts_out=generated/typescript \
            --proto_path=. \
            events/*.proto
        
        print_status "TypeScript code generation completed"
    else
        print_warning "protoc-gen-ts not found, skipping TypeScript generation"
        print_warning "Install with: npm install -g protoc-gen-ts"
    fi
}

# Generate documentation
generate_docs() {
    if command -v protoc-gen-doc &> /dev/null; then
        print_status "Generating documentation..."
        
        protoc \
            --doc_out=generated/docs \
            --doc_opt=html,index.html \
            --proto_path=. \
            events/*.proto
        
        print_status "Documentation generation completed"
    else
        print_warning "protoc-gen-doc not found, skipping documentation generation"
        print_warning "Install from: https://github.com/pseudomuto/protoc-gen-doc"
    fi
}

# Generate JSON schemas
generate_json_schemas() {
    if command -v protoc-gen-jsonschema &> /dev/null; then
        print_status "Generating JSON schemas..."
        
        mkdir -p generated/json-schemas
        
        protoc \
            --jsonschema_out=generated/json-schemas \
            --proto_path=. \
            events/*.proto
        
        print_status "JSON schema generation completed"
    else
        print_warning "protoc-gen-jsonschema not found, skipping JSON schema generation"
    fi
}

# Validate generated code
validate_generated_code() {
    print_status "Validating generated code..."
    
    # Check Go code compiles
    if [ -d "generated/go" ]; then
        cd generated/go
        if go mod init temp-validation 2>/dev/null && go mod tidy 2>/dev/null; then
            print_status "Go code validation passed"
        else
            print_warning "Go code validation failed"
        fi
        cd ../..
    fi
    
    # Check Python code imports
    if [ -d "generated/python" ]; then
        if python -c "import sys; sys.path.append('generated/python'); import events.attempt_event_pb2" 2>/dev/null; then
            print_status "Python code validation passed"
        else
            print_warning "Python code validation failed"
        fi
    fi
}

# Create package files
create_package_files() {
    print_status "Creating package files..."
    
    # Go mod file
    if [ -d "generated/go" ]; then
        cat > generated/go/go.mod << EOF
module github.com/adaptive-learning/shared/proto

go 1.21

require (
    google.golang.org/protobuf v1.31.0
    google.golang.org/grpc v1.58.0
)
EOF
    fi
    
    # Python setup.py
    if [ -d "generated/python" ]; then
        cat > generated/python/setup.py << EOF
from setuptools import setup, find_packages

setup(
    name="adaptive-learning-proto",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "protobuf>=4.21.0",
        "grpcio>=1.50.0",
    ],
    author="Adaptive Learning Platform",
    description="Protocol Buffer definitions for Adaptive Learning Platform events",
)
EOF
    fi
    
    # TypeScript package.json
    if [ -d "generated/typescript" ]; then
        cat > generated/typescript/package.json << EOF
{
  "name": "@adaptive-learning/proto",
  "version": "1.0.0",
  "description": "Protocol Buffer definitions for Adaptive Learning Platform events",
  "main": "index.js",
  "types": "index.d.ts",
  "dependencies": {
    "google-protobuf": "^3.21.0",
    "@types/google-protobuf": "^3.15.0"
  }
}
EOF
    fi
    
    print_status "Package files created"
}

# Main execution
main() {
    print_status "Starting Protocol Buffer code generation..."
    
    check_protoc
    check_plugins
    create_directories
    
    generate_go
    generate_python
    generate_typescript
    generate_docs
    generate_json_schemas
    
    create_package_files
    validate_generated_code
    
    print_status "Protocol Buffer code generation completed successfully!"
    print_status ""
    print_status "Generated files:"
    print_status "  - Go: generated/go/"
    print_status "  - Python: generated/python/"
    print_status "  - TypeScript: generated/typescript/"
    print_status "  - Documentation: generated/docs/"
    print_status "  - JSON Schemas: generated/json-schemas/"
}

# Run main function
main "$@"