#!/bin/bash

# Generate Go code from Protocol Buffer definitions

# Create output directory
mkdir -p proto

# Generate gRPC code
protoc --go_out=. --go_opt=paths=source_relative \
       --go-grpc_out=. --go-grpc_opt=paths=source_relative \
       proto/user_service.proto

echo "Protocol Buffer code generated successfully"