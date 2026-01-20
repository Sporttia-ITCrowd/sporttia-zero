#!/bin/bash
# Sporttia ZERO - Server-side deployment script
# Pulls from GitHub and deploys
# Run on sporttia-zero instance (34.22.147.236)

set -e

REPO_DIR="/opt/sporttia-zero/repo"
API_DIR="/opt/sporttia-zero/api"
WEB_DIR="/var/www/sporttia-zero/web"
ADMIN_DIR="/var/www/sporttia-zero/admin"
REPO_URL="https://github.com/sporttia/sporttia-zero.git"
BRANCH="${1:-master}"

echo "=== Sporttia ZERO Deployment ==="
echo "Branch: $BRANCH"
echo ""

# Clone or pull repository
if [ -d "$REPO_DIR/.git" ]; then
    echo "=== Pulling latest changes ==="
    cd "$REPO_DIR"
    git fetch origin
    git checkout "$BRANCH"
    git reset --hard "origin/$BRANCH"
else
    echo "=== Cloning repository ==="
    sudo mkdir -p "$REPO_DIR"
    sudo chown $(whoami):$(whoami) "$REPO_DIR"
    git clone "$REPO_URL" "$REPO_DIR"
    cd "$REPO_DIR"
    git checkout "$BRANCH"
fi

# Install dependencies
echo ""
echo "=== Installing dependencies ==="
npm ci

# Build all apps
echo ""
echo "=== Building applications ==="

echo "Building shared package..."
npm run build --workspace=packages/shared

echo "Building API..."
npm run build --workspace=apps/api

echo "Building Web frontend..."
npm run build --workspace=apps/web

echo "Building Admin dashboard..."
npm run build --workspace=apps/admin

# Deploy API
echo ""
echo "=== Deploying API ==="
sudo mkdir -p "$API_DIR/dist"
sudo rsync -av --delete "$REPO_DIR/apps/api/dist/" "$API_DIR/dist/"
sudo cp "$REPO_DIR/apps/api/package.json" "$API_DIR/"

# Install production dependencies for API (from the monorepo)
echo "Installing API production dependencies..."
cd "$REPO_DIR"
npm ci --omit=dev --workspace=apps/api

# Copy the installed node_modules to API dir
echo "Copying node_modules..."
sudo rsync -av "$REPO_DIR/apps/api/node_modules/" "$API_DIR/node_modules/" 2>/dev/null || true
# Also copy shared package
sudo mkdir -p "$API_DIR/node_modules/@sporttia-zero/shared"
sudo rsync -av "$REPO_DIR/packages/shared/dist/" "$API_DIR/node_modules/@sporttia-zero/shared/dist/"
sudo cp "$REPO_DIR/packages/shared/package.json" "$API_DIR/node_modules/@sporttia-zero/shared/"
sudo chown -R sporttia:sporttia "$API_DIR"

# Deploy Web frontend
echo ""
echo "=== Deploying Web frontend ==="
sudo rsync -av --delete "$REPO_DIR/apps/web/dist/" "$WEB_DIR/"
sudo chown -R www-data:www-data "$WEB_DIR"

# Deploy Admin dashboard
echo ""
echo "=== Deploying Admin dashboard ==="
sudo rsync -av --delete "$REPO_DIR/apps/admin/dist/" "$ADMIN_DIR/"
sudo chown -R www-data:www-data "$ADMIN_DIR"

# Restart API service
echo ""
echo "=== Restarting services ==="
sudo systemctl restart sporttia-zero-api

echo ""
echo "=== Deployment complete ==="
echo ""
echo "URLs:"
echo "  Frontend: https://zero.sporttia.com"
echo "  API:      https://zero.sporttia.com/api"
echo "  Admin:    https://zero.sporttia.com/manager"
