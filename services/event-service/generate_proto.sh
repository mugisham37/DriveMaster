#!/bin/bash

# Generate Protocol Buffer Go files for event service
set -e

PROTO_DIR="../../shared/proto"
OUTPUT_DIR="./internal/proto"

# Create output directory
mkdir -p $OUTPUT_DIR

# Generate Go files from proto definitions
protoc \
  --proto_path=$PROTO_DIR \
  --go_out=$OUTPUT_DIR \
  --go_opt=paths=source_relative \
  $PROTO_DIR/events/*.proto

echo "Protocol Buffer Go files generated successfully in $OUTPUT_DIR"