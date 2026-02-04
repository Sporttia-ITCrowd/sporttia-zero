# Sporttia ZERO Deployment Guide

This document describes the deployment infrastructure and procedures for Sporttia ZERO.

## Deployment Flow

```
┌─────────────┐      ┌──────────────────┐      ┌──────────────────┐
│     DEV     │ ───▶ │       PRE        │ ───▶ │       PRO        │
│   (ulpius)  │      │(sporttia-hub-pre)│      │(sporttia-hub-pro)│
└─────────────┘      └──────────────────┘      └──────────────────┘
 /deploy_ulpius        /deploy_pre               /deploy_pro
```

| Environment | URL | Database | Banner |
|-------------|-----|----------|--------|
| **DEV** | zero-ulpius.sporttia.com | sporttia-db-hub-pre | Blue "DEVELOPMENT" |
| **PRE** | zero-pre.sporttia.com | sporttia-db-hub-pre | Amber "PRE-PRODUCTION" |
| **PRO** | zero.sporttia.com | sporttia-db-hub-pro | None |

### Workflow

1. **Develop on DEV**: Code and test on ulpius using `/deploy_ulpius`
2. **Deploy to PRE**: Test in pre-production using `/deploy_pre`
3. **Deploy to PRO**: Release to production using `/deploy_pro`

## Infrastructure Overview

### Google Cloud Platform

**Project:** `atlantean-app-120410` (Sporttia Web)

**Instances:**

| Instance | Type | Internal IP | Purpose |
|----------|------|-------------|---------|
| `sporttia-proxy` | e2-standard-2 | 10.132.0.19 | Reverse proxy (nginx + SSL) |
| `sporttia-hub-pre` | e2-standard-4 | 10.132.0.111 | Pre-production server |
| `sporttia-hub-pro` | e2-standard-4 | 10.132.0.112 | Production server |
| `ulpius` | e2-standard-2 | 10.132.0.123 | Development server |

**Zone:** europe-west1-b

### URL Structure

**Production (PRO):**
| URL | Service |
|-----|---------|
| `https://zero.sporttia.com` | Web frontend |
| `https://zero.sporttia.com/api` | REST API |
| `https://zero.sporttia.com/backoffice` | Admin dashboard |

**Pre-production (PRE):**
| URL | Service |
|-----|---------|
| `https://zero-pre.sporttia.com` | Web frontend |
| `https://zero-pre.sporttia.com/api` | REST API |
| `https://zero-pre.sporttia.com/backoffice` | Admin dashboard |

**Development (DEV):**
| URL | Service |
|-----|---------|
| `https://zero-ulpius.sporttia.com` | Web frontend |
| `https://zero-ulpius.sporttia.com/api` | REST API |
| `https://zero-ulpius.sporttia.com/backoffice` | Admin dashboard |

### Architecture

```
                         ┌─────────────────────────────────────┐
                         │     zero.sporttia.com (PRO)         │
                         │     zero-pre.sporttia.com (PRE)     │
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
│  │  zero.sporttia.com     → sporttia-hub-pro:80  (PRO)                     │  │
│  │  zero-pre.sporttia.com → sporttia-hub-pre:80  (PRE)                    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    sporttia-hub-pro (10.132.0.112)                            │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │                    Docker Compose (PRO - port 80)                   │     │
│  │                                                                     │     │
│  │  ┌───────────┐    ┌───────────┐  ┌───────────┐  ┌───────────┐      │     │
│  │  │   nginx   │───▶│    web    │  │    api    │  │   admin   │      │     │
│  │  │    :80    │───▶│    :80    │  │   :4500   │  │    :80    │      │     │
│  │  └───────────┘    └───────────┘  └───────────┘  └───────────┘      │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                    sporttia-hub-pre (10.132.0.111)                            │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │                    Docker Compose (PRE - port 80)                   │     │
│  │                                                                     │     │
│  │  ┌───────────┐    ┌───────────┐  ┌───────────┐  ┌───────────┐      │     │
│  │  │   nginx   │───▶│    web    │  │    api    │  │   admin   │      │     │
│  │  │    :80    │───▶│    :80    │  │   :4500   │  │    :80    │      │     │
│  │  └───────────┘    └───────────┘  └───────────┘  └───────────┘      │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

### sporttia-hub-pro instance

```
~/Projects/sporttia-zero/
├── docker-compose.pro.yml    # PRO environment
├── .env.pro                  # PRO environment variables
├── apps/
├── packages/
└── deploy/
    └── sporttia-hub/
        └── pro-nginx.conf    # Nginx config for PRO container
```

### sporttia-hub-pre instance

```
~/Projects/sporttia-zero/
├── docker-compose.pre.yml    # PRE environment
├── .env.pre                  # PRE environment variables
├── apps/
├── packages/
└── deploy/
    └── sporttia-hub/
        └── pre-nginx.conf    # Nginx config for PRE container
```

### sporttia-proxy instance

```
/etc/nginx/sites-available/
├── zero.sporttia.com         # Proxy config for PRO
└── zero-pre.sporttia.com     # Proxy config for PRE

/etc/letsencrypt/live/
├── zero.sporttia.com/        # SSL certificate for PRO
└── zero-pre.sporttia.com/    # SSL certificate for PRE
```

## Deployment Files

All deployment configuration files are in the `/deploy` directory:

```
deploy/
├── sporttia-proxy/
│   ├── zero.sporttia.com.conf        # Nginx proxy for PRO
│   └── zero-pre.sporttia.com.conf    # Nginx proxy for PRE
├── sporttia-hub/
│   ├── pre-nginx.conf                # Docker nginx for PRE
│   └── pro-nginx.conf                # Docker nginx for PRO
├── .env.pre                          # PRE environment template
├── .env.pro                          # PRO environment template
└── .env.ulpius                       # DEV environment template

docker-compose.pre.yml    # PRE Docker Compose
docker-compose.pro.yml    # PRO Docker Compose
docker-compose.cloud.yml  # DEV Docker Compose (ulpius)
```

## GitHub Repository

**Repository:** https://github.com/sporttia/sporttia-zero (private)

## Initial Setup

### 1. Setup sporttia-hub-pro instance

```bash
# SSH to sporttia-hub-pro
gcloud compute ssh sporttia-hub-pro --zone=europe-west1-b

# Clone repo
cd ~/Projects
git clone git@github.com:sporttia/sporttia-zero.git
cd sporttia-zero

# Copy environment file
cp deploy/.env.pro .env.pro

# Edit with real credentials
nano .env.pro  # Set: OPENAI_API_KEY, ADMIN_PASSWORD, GOOGLE_PLACES_API_KEY

# Start PRO environment
sudo docker compose -f docker-compose.pro.yml up -d
```

### 1b. Setup sporttia-hub-pre instance

```bash
# SSH to sporttia-hub-pre
gcloud compute ssh sporttia-hub-pre --zone=europe-west1-b

# Clone repo
cd ~/Projects
git clone git@github.com:sporttia/sporttia-zero.git
cd sporttia-zero

# Copy environment file
cp deploy/.env.pre .env.pre

# Edit with real credentials
nano .env.pre  # Set: OPENAI_API_KEY, ADMIN_PASSWORD, GOOGLE_PLACES_API_KEY

# Start PRE environment
sudo docker compose -f docker-compose.pre.yml up -d
```

### 2. Setup sporttia-proxy (nginx + SSL)

```bash
# SSH to sporttia-proxy
gcloud compute ssh sporttia-proxy --zone=europe-west1-b --project=atlantean-app-120410

# Copy nginx configs (from local machine)
scp deploy/sporttia-proxy/zero.sporttia.com.conf user@sporttia-proxy:~/
scp deploy/sporttia-proxy/zero-pre.sporttia.com.conf user@sporttia-proxy:~/

# On sporttia-proxy, install the configs
sudo cp zero.sporttia.com.conf /etc/nginx/sites-available/zero.sporttia.com
sudo cp zero-pre.sporttia.com.conf /etc/nginx/sites-available/zero-pre.sporttia.com
sudo ln -sf /etc/nginx/sites-available/zero.sporttia.com /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/zero-pre.sporttia.com /etc/nginx/sites-enabled/

# Get SSL certificates
sudo certbot --nginx -d zero.sporttia.com
sudo certbot --nginx -d zero-pre.sporttia.com

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Firewall Rules

A firewall rule is needed to allow sporttia-proxy to access port 80 on sporttia-hub-pre and sporttia-hub-pro.

## Deploying Updates

### Deploy to PRE

```bash
# From local machine with Claude Code
/deploy_pre
```

Or manually:
```bash
gcloud compute ssh sporttia-hub-pre --zone=europe-west1-b --command="cd ~/Projects/sporttia-zero && git pull && sudo docker-compose -f docker-compose.pre.yml build && sudo docker-compose -f docker-compose.pre.yml up -d"
```

### Deploy to PRO

```bash
# From local machine with Claude Code
/deploy_pro
```

Or manually:
```bash
gcloud compute ssh sporttia-hub-pro --zone=europe-west1-b --command="cd ~/Projects/sporttia-zero && git pull && sudo docker compose -f docker-compose.pro.yml build && sudo docker compose -f docker-compose.pro.yml up -d"
```

## DNS Configuration

Configure DNS in OVH to point to **sporttia-proxy**:

| Type | Name | Content |
|------|------|---------|
| A | zero | 35.241.200.190 |
| A | zero-pre | 35.241.200.190 |

> **Note:** DNS points to sporttia-proxy which handles SSL termination and routes to sporttia-hub-pre/sporttia-hub-pro.

## Service Management

### sporttia-hub-pro (Docker)

```bash
# On sporttia-hub-pro
sudo docker compose -f docker-compose.pro.yml ps
sudo docker compose -f docker-compose.pro.yml logs -f
sudo docker compose -f docker-compose.pro.yml restart
```

### sporttia-hub-pre (Docker)

```bash
# On sporttia-hub-pre
sudo docker-compose -f docker-compose.pre.yml ps
sudo docker-compose -f docker-compose.pre.yml logs -f
sudo docker-compose -f docker-compose.pre.yml restart
```

### sporttia-proxy (nginx)

```bash
sudo systemctl status nginx
sudo nginx -t
sudo systemctl reload nginx
```

## Monitoring

### Health Checks

- PRO API Health: `https://zero.sporttia.com/api/health`
- PRE API Health: `https://zero-pre.sporttia.com/api/health`

### Log Locations

- PRO logs (on sporttia-hub-pro): `sudo docker compose -f docker-compose.pro.yml logs`
- PRE logs (on sporttia-hub-pre): `sudo docker-compose -f docker-compose.pre.yml logs`
- Nginx (proxy): `/var/log/nginx/access.log`

## Security Considerations

1. **Environment Variables:** Never commit `.env` files with real credentials
2. **SSL:** All traffic is encrypted via Let's Encrypt certificates
3. **Firewall:** Only ports 80 and 443 are exposed on sporttia-proxy
4. **API Security:** All admin endpoints require authentication

## Rollback Procedure

Docker images are tagged. To rollback:

```bash
# On sporttia-hub-pro (for PRO rollback)
cd ~/Projects/sporttia-zero
git checkout <previous-commit>
sudo docker compose -f docker-compose.pro.yml build
sudo docker compose -f docker-compose.pro.yml up -d

# On sporttia-hub-pre (for PRE rollback)
cd ~/Projects/sporttia-zero
git checkout <previous-commit>
sudo docker-compose -f docker-compose.pre.yml build
sudo docker-compose -f docker-compose.pre.yml up -d
```

---

## Ulpius Deployment (Docker)

A **DEVELOPMENT** deployment using Docker on the `ulpius` instance. This environment connects to `sporttia-db-hub-pre` database and uses pre-production Sporttia APIs. The UI shows a blue "DEVELOPMENT ENVIRONMENT" banner.

### Infrastructure

**Instance:** `ulpius` (e2-standard-2)
- **Internal IP:** 10.132.0.123
- **External IP:** 104.155.115.229
- **Project directory:** `~/Projects/sporttia-zero`

**Database:** `sporttia-db-hub-pre` (PostgreSQL 17)
- **Private IP:** 10.63.50.7
- **Database:** sporttia_zero

**Sporttia APIs:** PRE-PRODUCTION
- **API:** https://preapi.sporttia.com/v7
- **MySQL:** sporttia-sql-pre (10.63.48.3)

### URL Structure

| URL | Description | Service |
|-----|-------------|---------|
| `https://zero-ulpius.sporttia.com/` | Public chat interface | Web frontend |
| `https://zero-ulpius.sporttia.com/api` | REST API | Node.js API |
| `https://zero-ulpius.sporttia.com/backoffice` | Admin dashboard | Admin frontend |

### Architecture

```
                     ┌───────────────────────────────────────┐
                     │      zero-ulpius.sporttia.com         │
                     │              (DNS)                    │
                     └───────────────────┬───────────────────┘
                                         │
                                         ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                   sporttia-proxy (35.241.200.190)                          │
│                         Nginx + SSL (Certbot)                              │
│                                                                            │
│     zero-ulpius.sporttia.com → ulpius:80 (internal network)                │
└────────────────────────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                      ulpius (10.132.0.123)                                 │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Docker Compose                                    │  │
│  │                                                                      │  │
│  │  ┌───────────┐    ┌───────────┐  ┌───────────┐  ┌───────────┐       │  │
│  │  │   nginx   │───▶│    web    │  │    api    │  │   admin   │       │  │
│  │  │   :80     │───▶│    :80    │  │   :4500   │  │    :80    │       │  │
│  │  │           │───▶│           │  │           │  │           │       │  │
│  │  └───────────┘    └───────────┘  └───────────┘  └───────────┘       │  │
│  │       │                                                              │  │
│  │       └── /           → web                                          │  │
│  │       └── /api/*      → api (strips /api prefix)                     │  │
│  │       └── /backoffice → admin (strips /backoffice prefix)            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

### Deployment Files

```
deploy/
├── ulpius-nginx.conf       # Nginx reverse proxy config for Docker
└── .env.ulpius             # Environment configuration (PRE)

docker-compose.cloud.yml    # Docker Compose for ulpius deployment
```

### Initial Setup

```bash
cd ~/Projects/sporttia-zero

# Copy environment file
cp deploy/.env.ulpius .env

# Edit with real credentials
nano .env
# Set: OPENAI_API_KEY, ADMIN_PASSWORD, GOOGLE_PLACES_API_KEY
```

### Commands

```bash
# Navigate to project directory
cd ~/Projects/sporttia-zero

# Stop system nginx (if running)
sudo systemctl stop nginx
sudo systemctl disable nginx

# Build and start services
docker compose -f docker-compose.cloud.yml build
docker compose -f docker-compose.cloud.yml up -d

# View logs
docker compose -f docker-compose.cloud.yml logs -f

# View status
docker compose -f docker-compose.cloud.yml ps

# Stop services
docker compose -f docker-compose.cloud.yml down

# Rebuild and restart a specific service
docker compose -f docker-compose.cloud.yml up -d --build api
```

### Updating Deployment

```bash
cd ~/Projects/sporttia-zero
git pull
docker compose -f docker-compose.cloud.yml build
docker compose -f docker-compose.cloud.yml up -d
```

### DNS Configuration

Configure DNS in OVH to point to **sporttia-proxy**:

| Type | Name | Content |
|------|------|---------|
| A | zero-ulpius | 35.241.200.190 |

> **Note:** The `-ulpius` suffix in subdomain allows individual SSL certificates via HTTP challenge without needing OVH API access.
