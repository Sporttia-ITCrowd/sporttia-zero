#!/bin/bash
# Sporttia ZERO Deployment Script
# Builds and deploys all apps to the sporttia-zero GCP instance
# Proxy is handled by sporttia-proxy (35.241.200.190)

set -e

# Configuration
SPORTTIA_ZERO_IP="34.22.147.236"
SERVER_USER="${DEPLOY_USER:-jperez}"  # Override with DEPLOY_USER env var
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_API_DIR="/opt/sporttia-zero/api"
REMOTE_WEB_DIR="/var/www/sporttia-zero/web"
REMOTE_ADMIN_DIR="/var/www/sporttia-zero/admin"

echo "=== Sporttia ZERO Deployment ==="
echo "Project directory: $PROJECT_DIR"
echo "Target: $SERVER_USER@$SPORTTIA_ZERO_IP"
echo ""

# Build all apps
echo "=== Building applications ==="

echo "Building API..."
cd "$PROJECT_DIR/apps/api"
npm run build

echo "Building Web frontend..."
cd "$PROJECT_DIR/apps/web"
npm run build

echo "Building Admin dashboard..."
cd "$PROJECT_DIR/apps/admin"
npm run build

cd "$PROJECT_DIR"

# Deploy API
echo ""
echo "=== Deploying API ==="
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.env' \
    --exclude '*.log' \
    "$PROJECT_DIR/apps/api/dist/" \
    "$SERVER_USER@$SPORTTIA_ZERO_IP:$REMOTE_API_DIR/dist/"

rsync -avz \
    "$PROJECT_DIR/apps/api/package.json" \
    "$PROJECT_DIR/apps/api/package-lock.json" \
    "$SERVER_USER@$SPORTTIA_ZERO_IP:$REMOTE_API_DIR/"

# Install production dependencies on server
echo "Installing API dependencies..."
ssh "$SERVER_USER@$SPORTTIA_ZERO_IP" "cd $REMOTE_API_DIR && npm ci --omit=dev"

# Deploy Web frontend
echo ""
echo "=== Deploying Web frontend ==="
rsync -avz --delete \
    "$PROJECT_DIR/apps/web/dist/" \
    "$SERVER_USER@$SPORTTIA_ZERO_IP:$REMOTE_WEB_DIR/"

# Deploy Admin dashboard
echo ""
echo "=== Deploying Admin dashboard ==="
rsync -avz --delete \
    "$PROJECT_DIR/apps/admin/dist/" \
    "$SERVER_USER@$SPORTTIA_ZERO_IP:$REMOTE_ADMIN_DIR/"

# Restart API service
echo ""
echo "=== Restarting services ==="
ssh "$SERVER_USER@$SPORTTIA_ZERO_IP" "sudo systemctl restart sporttia-zero-api"

echo ""
echo "=== Deployment complete ==="
echo ""
echo "URLs (via sporttia-proxy):"
echo "  Frontend: https://zero.sporttia.com"
echo "  API:      https://zero.sporttia.com/api"
echo "  Admin:    https://zero.sporttia.com/manager"
