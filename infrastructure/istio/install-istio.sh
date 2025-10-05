#!/bin/bash

# Istio Service Mesh Installation Script for Adaptive Learning Platform
# This script installs and configures Istio with production-ready settings

set -e

ISTIO_VERSION="1.19.3"
NAMESPACE="istio-system"

echo "🚀 Installing Istio Service Mesh for Adaptive Learning Platform..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed. Please install kubectl first."
    exit 1
fi

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    echo "❌ Cannot access Kubernetes cluster. Please check your kubeconfig."
    exit 1
fi

# Download Istio if not present
if [ ! -d "istio-${ISTIO_VERSION}" ]; then
    echo "📥 Downloading Istio ${ISTIO_VERSION}..."
    curl -L https://istio.io/downloadIstio | ISTIO_VERSION=${ISTIO_VERSION} sh -
fi

# Add istioctl to PATH
export PATH=$PWD/istio-${ISTIO_VERSION}/bin:$PATH

# Verify istioctl
echo "🔍 Verifying Istio installation..."
istioctl version --remote=false

# Pre-installation check
echo "🔍 Running pre-installation checks..."
istioctl x precheck

# Install Istio with production configuration
echo "📦 Installing Istio control plane..."
istioctl install --set values.defaultRevision=default -y

# Verify installation
echo "✅ Verifying Istio installation..."
kubectl get pods -n istio-system

# Enable automatic sidecar injection for adaptive-learning namespace
echo "🔧 Configuring automatic sidecar injection..."
kubectl create namespace adaptive-learning --dry-run=client -o yaml | kubectl apply -f -
kubectl label namespace adaptive-learning istio-injection=enabled --overwrite

# Install Istio addons for observability
echo "📊 Installing Istio observability addons..."

# Prometheus
kubectl apply -f istio-${ISTIO_VERSION}/samples/addons/prometheus.yaml

# Grafana
kubectl apply -f istio-${ISTIO_VERSION}/samples/addons/grafana.yaml

# Jaeger
kubectl apply -f istio-${ISTIO_VERSION}/samples/addons/jaeger.yaml

# Kiali
kubectl apply -f istio-${ISTIO_VERSION}/samples/addons/kiali.yaml

# Wait for addons to be ready
echo "⏳ Waiting for addons to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/prometheus -n istio-system
kubectl wait --for=condition=available --timeout=300s deployment/grafana -n istio-system
kubectl wait --for=condition=available --timeout=300s deployment/jaeger -n istio-system
kubectl wait --for=condition=available --timeout=300s deployment/kiali -n istio-system

echo "✅ Istio Service Mesh installation completed successfully!"
echo ""
echo "📋 Summary:"
echo "  - Istio Version: ${ISTIO_VERSION}"
echo "  - Control Plane Namespace: ${NAMESPACE}"
echo "  - Application Namespace: adaptive-learning (sidecar injection enabled)"
echo ""
echo "🔗 Access Points:"
echo "  - Kiali Dashboard: kubectl port-forward -n istio-system svc/kiali 20001:20001"
echo "  - Grafana Dashboard: kubectl port-forward -n istio-system svc/grafana 3000:3000"
echo "  - Jaeger UI: kubectl port-forward -n istio-system svc/jaeger 16686:16686"
echo "  - Prometheus: kubectl port-forward -n istio-system svc/prometheus 9090:9090"
echo ""
echo "🔧 Next Steps:"
echo "  1. Deploy your applications to the 'adaptive-learning' namespace"
echo "  2. Apply Istio configuration (VirtualServices, DestinationRules, etc.)"
echo "  3. Configure security policies (PeerAuthentication, AuthorizationPolicy)"