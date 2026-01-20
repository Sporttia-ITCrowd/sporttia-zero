#!/bin/bash
# Sporttia ZERO Server Setup Script
# Run this script on the GCP instance to configure the server

set -e

echo "=== Sporttia ZERO Server Setup ==="

# Update system
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
echo "Installing required packages..."
sudo apt install -y nginx certbot python3-certbot-nginx nodejs npm

# Install Node.js 20 LTS
echo "Installing Node.js 20 LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Create sporttia user
echo "Creating sporttia user..."
sudo useradd -r -s /bin/false sporttia || true

# Create directories
echo "Creating directories..."
sudo mkdir -p /opt/sporttia-zero/api
sudo mkdir -p /var/www/sporttia-zero/web
sudo mkdir -p /var/www/sporttia-zero/admin

# Set permissions
sudo chown -R sporttia:sporttia /opt/sporttia-zero
sudo chown -R www-data:www-data /var/www/sporttia-zero

echo "=== Base setup complete ==="
echo ""
echo "Next steps:"
echo "1. Deploy the application files"
echo "2. Configure SSL with: sudo certbot --nginx -d zero.sporttia.com"
echo "3. Copy nginx config: sudo cp nginx.conf /etc/nginx/sites-available/sporttia-zero"
echo "4. Enable site: sudo ln -s /etc/nginx/sites-available/sporttia-zero /etc/nginx/sites-enabled/"
echo "5. Remove default: sudo rm /etc/nginx/sites-enabled/default"
echo "6. Copy systemd service: sudo cp sporttia-zero-api.service /etc/systemd/system/"
echo "7. Enable service: sudo systemctl enable sporttia-zero-api"
echo "8. Start service: sudo systemctl start sporttia-zero-api"
echo "9. Reload nginx: sudo systemctl reload nginx"
