# /deploy_pre Command

When this command is used, deploy Sporttia ZERO to the PRE-PRODUCTION environment.

## Purpose

Deploy the current code to the PRE-PRODUCTION environment on sporttia-hub. This does NOT bump version or commit - it deploys the current committed code.

## Prerequisites

- Code must be committed and pushed to GitHub
- If there are uncommitted changes, warn the user and ask if they want to commit first

## Workflow Steps

### Step 1: Check Git Status

```bash
git status
git log -1 --oneline
```

If there are uncommitted changes, warn the user:
- "You have uncommitted changes. Run `/ulpius_deploy` first to commit and test on DEV, then run `/deploy_pre` again."

### Step 2: Deploy to PRE

SSH to sporttia-hub and run the Docker deployment:

```bash
# SSH to sporttia-hub and deploy PRE
gcloud compute ssh sporttia-hub --zone=europe-west1-b --project=atlantean-app-120410 --tunnel-through-iap --command="cd ~/sporttia-zero && git fetch origin && git checkout master && git reset --hard origin/master && docker compose -f docker-compose.pre.yml build && docker compose -f docker-compose.pre.yml up -d"
```

Alternative if IAP fails (use VPN):
```bash
ssh sporttia-hub "cd ~/sporttia-zero && git pull origin master && docker compose -f docker-compose.pre.yml build && docker compose -f docker-compose.pre.yml up -d"
```

### Step 3: Verify Deployment

```bash
gcloud compute ssh sporttia-hub --zone=europe-west1-b --project=atlantean-app-120410 --tunnel-through-iap --command="docker compose -f ~/sporttia-zero/docker-compose.pre.yml ps"
```

Report the status and provide the URLs:
- Web: https://zero-pre.sporttia.com/
- API: https://zero-pre.sporttia.com/api
- Backoffice: https://zero-pre.sporttia.com/backoffice

## Environment

- **Target**: sporttia-hub (10.132.0.11) - Docker port 81
- **Database**: sporttia-hub-pre (10.63.50.7)
- **Sporttia API**: preapi.sporttia.com
- **UI Banner**: Amber "PRE-PRODUCTION ENVIRONMENT"

## Architecture

```
sporttia-proxy:443 (zero-pre.sporttia.com)
        │
        ▼
sporttia-hub:81 (nginx-pre container)
        │
        ├── /api/*      → api-pre:4500
        ├── /backoffice → admin-pre:80
        └── /*          → web-pre:80
```

## Notes

- PRE runs in Docker containers alongside PRO (different ports)
- PRO uses port 80, PRE uses port 81
- The .env.pre file must be configured with PRE credentials
- After testing in PRE, use `/deploy_pro` to promote to production
