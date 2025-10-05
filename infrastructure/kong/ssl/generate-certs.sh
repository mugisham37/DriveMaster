#!/bin/bash

# Generate self-signed SSL certificates for Kong development
# For production, replace with proper certificates from a CA

set -e

echo "🔐 Generating self-signed SSL certificates for Kong..."

# Create SSL directory if it doesn't exist
mkdir -p ssl

# Generate private key
openssl genrsa -out ssl/kong.key 2048

# Generate certificate signing request
openssl req -new -key ssl/kong.key -out ssl/kong.csr -subj "/C=US/ST=CA/L=San Francisco/O=Adaptive Learning Platform/OU=Development/CN=localhost"

# Generate self-signed certificate
openssl x509 -req -days 365 -in ssl/kong.csr -signkey ssl/kong.key -out ssl/kong.crt

# Set proper permissions
chmod 600 ssl/kong.key
chmod 644 ssl/kong.crt

# Clean up CSR
rm ssl/kong.csr

echo "✅ SSL certificates generated successfully!"
echo "📁 Certificate files:"
echo "  - Private Key: ssl/kong.key"
echo "  - Certificate: ssl/kong.crt"
echo ""
echo "⚠️  Note: These are self-signed certificates for development only."
echo "   For production, replace with certificates from a trusted CA."