#!/bin/bash
# Sporttia ZERO Docker Deployment Script
# Deploys all services using Docker Compose to sporttia-hub

set -e

# Configuration
GCP_PROJECT="atlantean-app-120410"
GCP_ZONE="europe-west1-b"
INSTANCE_NAME="sporttia-hub"
SPORTTIA_HUB_IP="34.38.217.54"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_DIR="/opt/sporttia-zero"

# Helper functions for gcloud SSH (using IAP tunnel)
gcloud_ssh() {
    gcloud compute ssh "$INSTANCE_NAME" --zone="$GCP_ZONE" --project="$GCP_PROJECT" --tunnel-through-iap --command="$1"
}

gcloud_scp() {
    gcloud compute scp --recurse "$1" "$INSTANCE_NAME:$2" --zone="$GCP_ZONE" --project="$GCP_PROJECT" --tunnel-through-iap
}

echo "=== Sporttia ZERO Docker Deployment ==="
echo "Project directory: $PROJECT_DIR"
echo "Target: $INSTANCE_NAME ($GCP_ZONE):$REMOTE_DIR"
echo ""

# Create remote directory structure
echo "=== Setting up remote directories ==="
gcloud_ssh "sudo mkdir -p $REMOTE_DIR && sudo chown \$(whoami):\$(whoami) $REMOTE_DIR"

# Create a temporary directory with only needed files
echo ""
echo "=== Preparing files for transfer ==="
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Copy necessary files to temp directory
cp -r "$PROJECT_DIR/apps" "$TEMP_DIR/"
cp -r "$PROJECT_DIR/packages" "$TEMP_DIR/"
cp -r "$PROJECT_DIR/deploy" "$TEMP_DIR/"
cp "$PROJECT_DIR/docker-compose.yml" "$TEMP_DIR/"
cp "$PROJECT_DIR/.dockerignore" "$TEMP_DIR/"
cp "$PROJECT_DIR/package.json" "$TEMP_DIR/"
cp "$PROJECT_DIR/package-lock.json" "$TEMP_DIR/"

# Remove node_modules and dist from temp
find "$TEMP_DIR" -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
find "$TEMP_DIR" -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true

# Sync project files
echo ""
echo "=== Syncing project files ==="
gcloud_scp "$TEMP_DIR/*" "$REMOTE_DIR/"

# Copy .env file if it exists locally
if [ -f "$PROJECT_DIR/.env" ]; then
    echo ""
    echo "=== Copying .env file ==="
    gcloud compute scp "$PROJECT_DIR/.env" "$INSTANCE_NAME:$REMOTE_DIR/.env" --zone="$GCP_ZONE" --project="$GCP_PROJECT" --tunnel-through-iap
else
    echo ""
    echo "WARNING: No .env file found locally."
    echo "Make sure $REMOTE_DIR/.env exists on the server with required variables."
    echo "See .env.example for reference."
fi

# Build and start containers on remote
echo ""
echo "=== Building and starting Docker containers ==="
gcloud_ssh "cd $REMOTE_DIR && docker compose down --remove-orphans 2>/dev/null || true"
gcloud_ssh "cd $REMOTE_DIR && docker compose build"
gcloud_ssh "cd $REMOTE_DIR && docker compose up -d"

# Show container status
echo ""
echo "=== Container Status ==="
gcloud_ssh "cd $REMOTE_DIR && docker compose ps"

echo ""
echo "=== Deployment complete ==="
echo ""
echo "Services running on sporttia-hub ($SPORTTIA_HUB_IP):"
echo "  Web:    http://$SPORTTIA_HUB_IP (port 80)"
echo "  API:    http://$SPORTTIA_HUB_IP/api"
echo "  Admin:  http://$SPORTTIA_HUB_IP/manager"
echo ""
echo "Direct access ports:"
echo "  API:    http://$SPORTTIA_HUB_IP:3000"
echo "  Web:    http://$SPORTTIA_HUB_IP:4000"
echo "  Admin:  http://$SPORTTIA_HUB_IP:5000"
echo ""
echo "To view logs: gcloud compute ssh $INSTANCE_NAME --zone=$GCP_ZONE --project=$GCP_PROJECT --command='cd $REMOTE_DIR && docker compose logs -f'"
