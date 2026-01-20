# Sporttia ZERO Deployment Guide

This document describes the deployment infrastructure and procedures for Sporttia ZERO.

## Infrastructure Overview

### Google Cloud Platform

**Project:** `atlantean-app-120410` (Sporttia Web)

**Instances:**

| Instance | Type | IP | Purpose |
|----------|------|-----|---------|
| `sporttia-proxy` | e2-standard-2 | 35.241.200.190 | Reverse proxy (nginx + SSL) |
| `sporttia-zero` | e2-small | 34.22.147.236 | Application server |

**Zone:** europe-west1-b

### URL Structure

| URL | Description | Service |
|-----|-------------|---------|
| `https://zero.sporttia.com` | Public chat interface | Web frontend |
| `https://zero.sporttia.com/api` | REST API | Node.js API |
| `https://zero.sporttia.com/manager` | Admin dashboard | Admin frontend |

### Architecture

```
                         ┌─────────────────────────────────────┐
                         │         zero.sporttia.com           │
                         │              (DNS)                  │
                         └─────────────────┬───────────────────┘
                                           │
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    sporttia-proxy (35.241.200.190)                           │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                         Nginx + SSL (Certbot)                          │  │
│  │                                                                        │  │
│  │  zero.sporttia.com/        → sporttia-zero:4000 (Web)                  │  │
│  │  zero.sporttia.com/api/*   → sporttia-zero:3000 (API)                  │  │
│  │  zero.sporttia.com/manager → sporttia-zero:5000 (Admin)                │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                     sporttia-zero (34.22.147.236)                            │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐               │
│  │   Nginx :4000   │  │   Nginx :5000   │  │  Node.js :3000  │               │
│  │   Web Static    │  │  Admin Static   │  │   API Server    │               │
│  │  /var/www/web   │  │ /var/www/admin  │  │ /opt/.../api    │               │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘               │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

### sporttia-zero instance

```
/opt/sporttia-zero/
└── api/
    ├── dist/           # Compiled API code
    ├── node_modules/   # Production dependencies
    ├── package.json
    └── .env            # Environment variables

/var/www/sporttia-zero/
├── web/                # Public chat frontend (port 4000)
│   ├── index.html
│   └── assets/
└── admin/              # Admin dashboard (port 5000)
    ├── index.html
    └── assets/
```

### sporttia-proxy instance

```
/etc/nginx/sites-available/
└── zero.sporttia.com   # Proxy config for zero.sporttia.com

/etc/letsencrypt/live/zero.sporttia.com/
├── fullchain.pem       # SSL certificate
└── privkey.pem         # SSL private key
```

## Deployment Files

All deployment configuration files are in the `/deploy` directory:

```
deploy/
├── sporttia-proxy/
│   └── zero.sporttia.com.conf    # Nginx proxy config for sporttia-proxy
├── sporttia-zero/
│   ├── nginx-local.conf          # Nginx config for static files
│   ├── sporttia-zero-api.service # Systemd service for API
│   ├── setup.sh                  # Server setup script
│   ├── deploy-from-git.sh        # Server-side deploy (pulls from GitHub)
│   └── .env.production           # Environment template
├── deploy.sh                     # Local rsync deploy script (alternative)
└── nginx.conf                    # (legacy, use sporttia-proxy config)
```

## GitHub Repository

**Repository:** https://github.com/sporttia/sporttia-zero (private)

## Initial Setup

### 1. Setup sporttia-zero instance

```bash
# SSH to sporttia-zero
gcloud compute ssh sporttia-zero --zone=europe-west1-b --project=atlantean-app-120410

# Copy deploy files to server (from local machine)
scp -r deploy/sporttia-zero/* user@34.22.147.236:~/

# On the server, run setup
chmod +x setup.sh
./setup.sh

# Configure environment
sudo cp .env.production /opt/sporttia-zero/api/.env
sudo nano /opt/sporttia-zero/api/.env  # Edit with real credentials
```

### 2. Setup sporttia-proxy (nginx + SSL)

```bash
# SSH to sporttia-proxy
gcloud compute ssh sporttia-proxy --zone=europe-west1-b --project=atlantean-app-120410

# Copy nginx config (from local machine)
scp deploy/sporttia-proxy/zero.sporttia.com.conf user@35.241.200.190:~/

# On sporttia-proxy, install the config
sudo cp zero.sporttia.com.conf /etc/nginx/sites-available/zero.sporttia.com
sudo ln -s /etc/nginx/sites-available/zero.sporttia.com /etc/nginx/sites-enabled/

# Get SSL certificate
sudo certbot --nginx -d zero.sporttia.com

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Firewall Rules

A firewall rule `allow-sporttia-zero-internal` has been created to allow sporttia-proxy (35.241.200.190) to access ports 3000, 4000, 5000 on sporttia-zero.

## Deploying Updates

### Option 1: GitHub Pull (Recommended)

SSH to the server and run:

```bash
ssh jperez@34.22.147.236
sporttia-deploy
```

Or deploy a specific branch:

```bash
sporttia-deploy feature-branch
```

The script will:
1. Pull latest code from GitHub
2. Build all applications (API, Web, Admin)
3. Deploy compiled files
4. Install production dependencies
5. Restart the API service

### Option 2: Local rsync (Alternative)

From your local machine:

```bash
cd /path/to/sporttia-zero-agent-2
./deploy/deploy.sh
```

The script will:
1. Build all applications locally
2. Deploy compiled files via rsync
3. Install production dependencies
4. Restart the API service

## DNS Configuration

Configure DNS in Cloudflare (or your DNS provider) to point to **sporttia-proxy**:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | zero | 35.241.200.190 | Proxied |

> **Note:** DNS points to sporttia-proxy which handles SSL termination and routes to sporttia-zero.

## Service Management

```bash
# Check API status
sudo systemctl status sporttia-zero-api

# View API logs
sudo journalctl -u sporttia-zero-api -f

# Restart API
sudo systemctl restart sporttia-zero-api

# Reload nginx
sudo systemctl reload nginx
```

## Monitoring

### Health Checks

- API Health: `https://zero.sporttia.com/api/health`
- Nginx Health: `https://zero.sporttia.com/health`

### Log Locations

- API logs: `journalctl -u sporttia-zero-api`
- Nginx access: `/var/log/nginx/access.log`
- Nginx errors: `/var/log/nginx/error.log`

## Security Considerations

1. **Environment Variables:** Never commit `.env` files with real credentials
2. **SSL:** All traffic is encrypted via Let's Encrypt certificates
3. **Firewall:** Only ports 80 and 443 are exposed
4. **API Security:** All admin endpoints require authentication

## Rollback Procedure

1. Keep the previous `dist/` directory backed up
2. To rollback:
   ```bash
   ssh jperez@34.22.147.236
   cd /opt/sporttia-zero/api
   mv dist dist.new
   mv dist.backup dist
   sudo systemctl restart sporttia-zero-api
   ```

## Cost Estimation

| Resource | Monthly Cost (approx) |
|----------|----------------------|
| e2-small instance | ~$15 |
| 20GB pd-balanced | ~$2 |
| Egress (estimated) | ~$5 |
| **Total** | **~$22/month** |
