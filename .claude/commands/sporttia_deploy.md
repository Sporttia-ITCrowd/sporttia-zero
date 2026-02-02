# /deploy Command

When this command is used, execute the following deployment workflow for Sporttia ZERO.

## Purpose

Bump version, commit all changes, push to GitHub, and deploy the project to sporttia-hub using Docker.

## Workflow Steps

### Step 1: Check Git Status

```bash
cd /Users/bau/Projects/sporttia-zero && git status
```

Review the changes that will be committed. If there are sensitive files (.env, credentials, etc.), warn the user and exclude them.

### Step 2: Bump Version

Before committing, bump the version in all package.json files:

1. Read the current version from the root `package.json`
2. Increment the patch version (e.g., 0.1.0 → 0.1.1)
   - Use `--minor` argument for minor bump (0.1.0 → 0.2.0)
   - Use `--major` argument for major bump (0.1.0 → 1.0.0)
3. Update version in all package.json files:
   - `/Users/bau/Projects/sporttia-zero/package.json`
   - `/Users/bau/Projects/sporttia-zero/apps/api/package.json`
   - `/Users/bau/Projects/sporttia-zero/apps/web/package.json`
   - `/Users/bau/Projects/sporttia-zero/apps/admin/package.json`

```bash
# Example: Read current version and bump patch
current_version=$(node -p "require('./package.json').version")
# Calculate new version (implement logic based on semver)
```

Use the Edit tool to update each package.json with the new version.

### Step 3: Stage and Commit Changes

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

### Step 4: Push to GitHub

```bash
git push origin master
```

If push fails, report the error and stop.

### Step 5: Deploy to sporttia-hub

```bash
cd /Users/bau/Projects/sporttia-zero && ./deploy/deploy-docker.sh
```

This script will:
1. Prepare files for transfer (excluding node_modules, dist)
2. Sync files to sporttia-hub via gcloud SCP
3. Build Docker containers on the server
4. Start the services

### Step 6: Verify Deployment

After deployment completes, report the status and provide the URLs:
- Web: http://34.38.217.54 (or https://zero.sporttia.com if configured)
- API: http://34.38.217.54/api
- Admin: http://34.38.217.54/backoffice

## Arguments

The command accepts optional arguments:
- `/deploy` - Bump patch version, auto-generate commit message
- `/deploy "Fixed login bug"` - Bump patch version, use provided commit message
- `/deploy --minor` - Bump minor version (0.1.0 → 0.2.0)
- `/deploy --major` - Bump major version (0.1.0 → 1.0.0)
- `/deploy --minor "New feature"` - Bump minor version with custom message

## Error Handling

- If `git status` shows no changes, skip commit and push, proceed directly to deploy
- If `git push` fails, stop and report the error (don't deploy uncommitted changes)
- If deployment fails, show the error logs and suggest checking `docker compose logs` on the server

## Notes

- If gcloud IAP tunnel fails, use direct SSH via VPN:
  ```bash
  ssh sporttia-hub "mkdir -p /opt/sporttia-zero"
  rsync -avz --exclude='node_modules' --exclude='dist' --exclude='.git' --exclude='.env*' /Users/bau/Projects/sporttia-zero/ sporttia-hub:/opt/sporttia-zero/
  ssh sporttia-hub "cd /opt/sporttia-zero && docker-compose build && docker-compose up -d"
  ```
- The .env file must exist on the server at /opt/sporttia-zero/.env
- Version is displayed in the web app footer (v0.1.0 format)
