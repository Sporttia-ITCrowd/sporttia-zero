# /deploy_pro Command

When this command is used, deploy Sporttia ZERO to the PRODUCTION environment.

## Purpose

Deploy the current code to the PRODUCTION environment on sporttia-hub. This is the final deployment step after testing in PRE.

## Prerequisites

- Code must be committed and pushed to GitHub
- Code should have been tested in PRE environment first
- If there are uncommitted changes, STOP and warn the user

## Workflow Steps

### Step 1: Safety Checks

```bash
git status
git log -1 --oneline
```

**IMPORTANT**: If there are uncommitted changes, STOP immediately:
- "ABORT: You have uncommitted changes. Never deploy uncommitted code to PRODUCTION."
- "Run `/ulpius_deploy` to commit and test on DEV first."

### Step 2: Confirm with User

Before deploying to production, ask the user to confirm:
- "You are about to deploy to PRODUCTION (zero.sporttia.com)."
- "Current version: vX.X.X"
- "Last commit: <commit message>"
- "Has this been tested in PRE? Type 'yes' to continue."

### Step 3: Deploy to PRO

SSH to sporttia-hub and run the Docker deployment:

```bash
# SSH to sporttia-hub and deploy PRO
gcloud compute ssh sporttia-hub --zone=europe-west1-b --project=atlantean-app-120410 --tunnel-through-iap --command="cd ~/sporttia-zero && git fetch origin && git checkout master && git reset --hard origin/master && docker compose -f docker-compose.pro.yml build && docker compose -f docker-compose.pro.yml up -d"
```

Alternative if IAP fails (use VPN):
```bash
ssh sporttia-hub "cd ~/sporttia-zero && git pull origin master && docker compose -f docker-compose.pro.yml build && docker compose -f docker-compose.pro.yml up -d"
```

### Step 4: Verify Deployment

```bash
gcloud compute ssh sporttia-hub --zone=europe-west1-b --project=atlantean-app-120410 --tunnel-through-iap --command="docker compose -f ~/sporttia-zero/docker-compose.pro.yml ps"
```

Report the status and provide the URLs:
- Web: https://zero.sporttia.com/
- API: https://zero.sporttia.com/api
- Backoffice: https://zero.sporttia.com/backoffice

## Environment

- **Target**: sporttia-hub (10.132.0.11) - Docker port 80
- **Database**: sporttia-hub (10.63.50.5) - PRODUCTION
- **Sporttia API**: api.sporttia.com
- **UI Banner**: None (clean production UI)

## Architecture

```
sporttia-proxy:443 (zero.sporttia.com)
        │
        ▼
sporttia-hub:80 (nginx-pro container)
        │
        ├── /api/*      → api-pro:4500
        ├── /backoffice → admin-pro:80
        └── /*          → web-pro:80
```

## Notes

- PRO runs in Docker containers alongside PRE (different ports)
- PRO uses port 80, PRE uses port 81
- The .env.pro file must be configured with PRO credentials
- Always test in PRE before deploying to PRO
- No environment banner is shown in production (VITE_APP_ENV=pro)
