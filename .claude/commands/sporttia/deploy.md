# /deploy Command

When this command is used, execute the following deployment workflow for Sporttia ZERO.

## Purpose

Commit all changes, push to GitHub, and deploy the project to sporttia-hub using Docker.

## Workflow Steps

### Step 1: Check Git Status

```bash
cd /Users/bau/Projects/sporttia-zero && git status
```

Review the changes that will be committed. If there are sensitive files (.env, credentials, etc.), warn the user and exclude them.

### Step 2: Stage and Commit Changes

```bash
# Stage all changes (excluding sensitive files)
git add -A

# If there are staged changes, commit them
git commit -m "Deploy: <brief description of changes>"
```

**Commit Message Guidelines:**
- If the user provided a commit message, use that
- Otherwise, analyze the changes and create a brief, descriptive message
- Always include "Co-Authored-By: Claude <noreply@anthropic.com>" at the end

### Step 3: Push to GitHub

```bash
git push origin master
```

If push fails, report the error and stop.

### Step 4: Deploy to sporttia-hub

```bash
cd /Users/bau/Projects/sporttia-zero && ./deploy/deploy-docker.sh
```

This script will:
1. Prepare files for transfer (excluding node_modules, dist)
2. Sync files to sporttia-hub via gcloud SCP
3. Build Docker containers on the server
4. Start the services

### Step 5: Verify Deployment

After deployment completes, report the status and provide the URLs:
- Web: http://34.38.217.54 (or https://zero.sporttia.com if configured)
- API: http://34.38.217.54/api
- Admin: http://34.38.217.54/backoffice

## Arguments

The command accepts an optional commit message argument:
- `/deploy` - Auto-generate commit message from changes
- `/deploy "Fixed login bug"` - Use the provided commit message

## Error Handling

- If `git status` shows no changes, skip commit and push, proceed directly to deploy
- If `git push` fails, stop and report the error (don't deploy uncommitted changes)
- If deployment fails, show the error logs and suggest checking `docker compose logs` on the server

## Notes

- The deployment uses gcloud IAP tunnel for SSH access
- Make sure gcloud CLI is authenticated before running
- The .env file must exist on the server at /opt/sporttia-zero/.env
