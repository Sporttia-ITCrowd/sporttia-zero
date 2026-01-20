#!/bin/bash
# Sporttia ZERO Instance Setup Script
# Run on sporttia-zero instance (34.22.147.236)

set -e

echo "=== Sporttia ZERO Instance Setup ==="

# Update system
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
echo "Installing required packages..."
sudo apt install -y nginx git rsync

# Install Node.js 20 LTS
echo "Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Create sporttia user
echo "Creating sporttia user..."
sudo useradd -r -s /bin/false sporttia 2>/dev/null || true

# Create directories
echo "Creating directories..."
sudo mkdir -p /opt/sporttia-zero/api
sudo mkdir -p /var/www/sporttia-zero/web
sudo mkdir -p /var/www/sporttia-zero/admin

# Set permissions
sudo chown -R sporttia:sporttia /opt/sporttia-zero
sudo chown -R www-data:www-data /var/www/sporttia-zero

# Install nginx config
echo "Installing nginx configuration..."
sudo cp nginx-local.conf /etc/nginx/sites-available/sporttia-zero
sudo ln -sf /etc/nginx/sites-available/sporttia-zero /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Install systemd service
echo "Installing systemd service..."
sudo cp sporttia-zero-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable sporttia-zero-api

# Test nginx config
echo "Testing nginx configuration..."
sudo nginx -t

# Reload nginx
echo "Reloading nginx..."
sudo systemctl reload nginx

# Install deploy script
echo "Installing deploy script..."
sudo cp deploy-from-git.sh /usr/local/bin/sporttia-deploy
sudo chmod +x /usr/local/bin/sporttia-deploy

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "1. Copy .env file: sudo cp .env.production /opt/sporttia-zero/api/.env"
echo "2. Edit .env with real credentials: sudo nano /opt/sporttia-zero/api/.env"
echo "3. Deploy: sporttia-deploy"
echo "4. (Optional) Deploy specific branch: sporttia-deploy feature-branch"
