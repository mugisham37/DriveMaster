#!/bin/bash

# ArgoCD Installation Script for Adaptive Learning Platform
# This script installs and configures ArgoCD for GitOps deployment

set -e

# Configuration
ARGOCD_NAMESPACE=${ARGOCD_NAMESPACE:-argocd}
ARGOCD_VERSION=${ARGOCD_VERSION:-v2.8.4}
KUBECTL_CONTEXT=${KUBECTL_CONTEXT:-}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if kubectl is installed
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed. Please install kubectl first."
        exit 1
    fi
    
    # Check if we can connect to the cluster
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
        exit 1
    fi
    
    # Set kubectl context if provided
    if [ -n "$KUBECTL_CONTEXT" ]; then
        kubectl config use-context "$KUBECTL_CONTEXT"
        log_info "Using kubectl context: $KUBECTL_CONTEXT"
    fi
    
    log_success "Prerequisites check passed"
}

# Create ArgoCD namespace
create_namespace() {
    log_info "Creating ArgoCD namespace..."
    kubectl create namespace $ARGOCD_NAMESPACE --dry-run=client -o yaml | kubectl apply -f -
    log_success "ArgoCD namespace created/updated"
}

# Install ArgoCD
install_argocd() {
    log_info "Installing ArgoCD $ARGOCD_VERSION..."
    
    # Install ArgoCD
    kubectl apply -n $ARGOCD_NAMESPACE -f https://raw.githubusercontent.com/argoproj/argo-cd/$ARGOCD_VERSION/manifests/install.yaml
    
    log_success "ArgoCD installed"
}

# Wait for ArgoCD to be ready
wait_for_argocd() {
    log_info "Waiting for ArgoCD to be ready..."
    
    # Wait for ArgoCD server
    kubectl wait --for=condition=available deployment/argocd-server -n $ARGOCD_NAMESPACE --timeout=600s
    
    # Wait for ArgoCD application controller
    kubectl wait --for=condition=available deployment/argocd-application-controller -n $ARGOCD_NAMESPACE --timeout=600s
    
    # Wait for ArgoCD repo server
    kubectl wait --for=condition=available deployment/argocd-repo-server -n $ARGOCD_NAMESPACE --timeout=600s
    
    log_success "ArgoCD is ready"
}

# Configure ArgoCD
configure_argocd() {
    log_info "Configuring ArgoCD..."
    
    # Create ArgoCD configuration
    kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: $ARGOCD_NAMESPACE
  labels:
    app.kubernetes.io/name: argocd-cm
    app.kubernetes.io/part-of: argocd
data:
  # Enable insecure mode for easier setup (disable in production)
  server.insecure: "true"
  
  # Repository credentials
  repositories: |
    - url: https://github.com/your-org/adaptive-learning-platform
      type: git
    - url: https://charts.bitnami.com/bitnami
      type: helm
      name: bitnami
  
  # Resource customizations
  resource.customizations: |
    argoproj.io/Application:
      health.lua: |
        hs = {}
        hs.status = "Progressing"
        hs.message = ""
        if obj.status ~= nil then
          if obj.status.health ~= nil then
            hs.status = obj.status.health.status
            if obj.status.health.message ~= nil then
              hs.message = obj.status.health.message
            end
          end
        end
        return hs
  
  # Application instance label key
  application.instanceLabelKey: argocd.argoproj.io/instance
  
  # Server configuration
  server.rbac.log.enforce.enable: "true"
  server.enable.proxy.extension: "true"
  
  # Notification configuration
  service.notifications.enabled: "true"
EOF

    log_success "ArgoCD configured"
}

# Set up RBAC
setup_rbac() {
    log_info "Setting up ArgoCD RBAC..."
    
    kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: $ARGOCD_NAMESPACE
  labels:
    app.kubernetes.io/name: argocd-rbac-cm
    app.kubernetes.io/part-of: argocd
data:
  policy.default: role:readonly
  policy.csv: |
    # Admin policy
    p, role:admin, applications, *, */*, allow
    p, role:admin, clusters, *, *, allow
    p, role:admin, repositories, *, *, allow
    p, role:admin, certificates, *, *, allow
    p, role:admin, projects, *, *, allow
    p, role:admin, accounts, *, *, allow
    p, role:admin, gpgkeys, *, *, allow
    
    # Developer policy
    p, role:developer, applications, get, */*, allow
    p, role:developer, applications, sync, */*, allow
    p, role:developer, applications, action/*, */*, allow
    p, role:developer, repositories, get, *, allow
    p, role:developer, clusters, get, *, allow
    p, role:developer, projects, get, *, allow
    
    # Readonly policy
    p, role:readonly, applications, get, */*, allow
    p, role:readonly, repositories, get, *, allow
    p, role:readonly, clusters, get, *, allow
    p, role:readonly, projects, get, *, allow
    
    # Group mappings (adjust based on your identity provider)
    g, adaptive-learning:admins, role:admin
    g, adaptive-learning:developers, role:developer
    g, adaptive-learning:viewers, role:readonly
EOF

    log_success "ArgoCD RBAC configured"
}

# Create ingress for ArgoCD
create_ingress() {
    log_info "Creating ArgoCD ingress..."
    
    kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-ingress
  namespace: $ARGOCD_NAMESPACE
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - argocd.adaptivelearning.com
    secretName: argocd-server-tls
  rules:
  - host: argocd.adaptivelearning.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: argocd-server
            port:
              number: 80
EOF

    log_success "ArgoCD ingress created"
}

# Get ArgoCD admin password
get_admin_password() {
    log_info "Retrieving ArgoCD admin password..."
    
    # Wait for the secret to be created
    kubectl wait --for=condition=complete job/argocd-server -n $ARGOCD_NAMESPACE --timeout=300s 2>/dev/null || true
    
    # Get the initial admin password
    local admin_password=$(kubectl -n $ARGOCD_NAMESPACE get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
    
    if [ -n "$admin_password" ]; then
        log_success "ArgoCD admin password retrieved"
        echo ""
        echo "🔐 ArgoCD Admin Credentials:"
        echo "   Username: admin"
        echo "   Password: $admin_password"
        echo ""
        log_warning "Please change the admin password after first login!"
    else
        log_warning "Could not retrieve admin password. You may need to reset it manually."
    fi
}

# Install ArgoCD applications
install_applications() {
    log_info "Installing ArgoCD applications..."
    
    # Apply the application manifests
    kubectl apply -f application.yaml
    
    log_success "ArgoCD applications installed"
}

# Verify installation
verify_installation() {
    log_info "Verifying ArgoCD installation..."
    
    # Check pod status
    log_info "Pod status:"
    kubectl get pods -n $ARGOCD_NAMESPACE
    
    # Check service status
    log_info "Service status:"
    kubectl get services -n $ARGOCD_NAMESPACE
    
    # Check ingress status
    log_info "Ingress status:"
    kubectl get ingress -n $ARGOCD_NAMESPACE
    
    # Check applications
    log_info "Application status:"
    kubectl get applications -n $ARGOCD_NAMESPACE
    
    log_success "ArgoCD installation verification completed"
}

# Display access information
display_access_info() {
    log_info "ArgoCD Access Information:"
    echo ""
    echo "🌐 ArgoCD UI:"
    echo "   URL: https://argocd.adaptivelearning.com"
    echo "   Port-forward: kubectl port-forward svc/argocd-server 8080:80 -n $ARGOCD_NAMESPACE"
    echo ""
    echo "🔧 ArgoCD CLI:"
    echo "   Install: curl -sSL -o argocd-linux-amd64 https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64"
    echo "   Login: argocd login argocd.adaptivelearning.com"
    echo ""
    echo "📚 Useful Commands:"
    echo "   List apps: kubectl get applications -n $ARGOCD_NAMESPACE"
    echo "   Sync app: argocd app sync <app-name>"
    echo "   Get app status: argocd app get <app-name>"
    echo ""
}

# Main installation function
main() {
    log_info "Starting ArgoCD installation for Adaptive Learning Platform"
    log_info "ArgoCD Version: $ARGOCD_VERSION"
    log_info "Namespace: $ARGOCD_NAMESPACE"
    
    # Parse command line arguments
    SKIP_APPS=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-apps)
                SKIP_APPS=true
                shift
                ;;
            --version)
                ARGOCD_VERSION="$2"
                shift 2
                ;;
            --namespace)
                ARGOCD_NAMESPACE="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --skip-apps           Skip installing ArgoCD applications"
                echo "  --version VERSION     ArgoCD version to install (default: $ARGOCD_VERSION)"
                echo "  --namespace NAMESPACE ArgoCD namespace (default: $ARGOCD_NAMESPACE)"
                echo "  --help                Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Execute installation steps
    check_prerequisites
    create_namespace
    install_argocd
    wait_for_argocd
    configure_argocd
    setup_rbac
    create_ingress
    get_admin_password
    
    if [ "$SKIP_APPS" = false ]; then
        install_applications
    fi
    
    verify_installation
    display_access_info
    
    log_success "ArgoCD installation completed successfully!"
    log_info "You can now access ArgoCD at https://argocd.adaptivelearning.com"
}

# Run main function
main "$@"