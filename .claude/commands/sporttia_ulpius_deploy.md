# /ulpius_deploy Command

When this command is used, execute the following deployment workflow for Sporttia ZERO on ulpius.

## Purpose

Bump version, commit all changes, push to GitHub, and deploy the project locally on ulpius using Docker.

## Workflow Steps

### Step 1: Check Git Status

```bash
cd /home/bauty/Projects/sporttia-zero && git status
```

Review the changes that will be committed. If there are sensitive files (.env, credentials, etc.), warn the user and exclude them.

### Step 2: Bump Version

Before committing, bump the version in all package.json files:

1. Read the current version from the root `package.json`
2. Increment the patch version (e.g., 0.1.0 → 0.1.1)
   - Use `--minor` argument for minor bump (0.1.0 → 0.2.0)
   - Use `--major` argument for major bump (0.1.0 → 1.0.0)
3. Update version in all package.json files:
   - `/home/bauty/Projects/sporttia-zero/package.json`
   - `/home/bauty/Projects/sporttia-zero/apps/api/package.json`
   - `/home/bauty/Projects/sporttia-zero/apps/web/package.json`
   - `/home/bauty/Projects/sporttia-zero/apps/admin/package.json`

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

### Step 5: Deploy on ulpius

Deploy locally using docker-compose.cloud.yml:

```bash
cd /home/bauty/Projects/sporttia-zero

# Stop existing containers
docker compose -f docker-compose.cloud.yml down --remove-orphans 2>/dev/null || true

# Build containers
docker compose -f docker-compose.cloud.yml build

# Start containers
docker compose -f docker-compose.cloud.yml up -d
```

### Step 6: Verify Deployment

After deployment completes, check container status:

```bash
docker compose -f docker-compose.cloud.yml ps
```

Report the status and provide the URLs:
- Web: https://zero-ulpius.sporttia.com/
- API: https://zero-ulpius.sporttia.com/api
- Backoffice: https://zero-ulpius.sporttia.com/backoffice

## Environment

- **Target**: ulpius (10.132.0.123)
- **Database**: sporttia-hub-pre (10.63.50.7)
- **Sporttia API**: preapi.sporttia.com
- **UI Banner**: Blue "DEVELOPMENT ENVIRONMENT"

## Next Steps

After testing on DEV, deploy to PRE with `/deploy_pre`

## Arguments

The command accepts optional arguments:
- `/ulpius_deploy` - Bump patch version, auto-generate commit message
- `/ulpius_deploy "Fixed login bug"` - Bump patch version, use provided commit message
- `/ulpius_deploy --minor` - Bump minor version (0.1.0 → 0.2.0)
- `/ulpius_deploy --major` - Bump major version (0.1.0 → 1.0.0)
- `/ulpius_deploy --minor "New feature"` - Bump minor version with custom message

## Error Handling

- If `git status` shows no changes, skip commit and push, proceed directly to deploy
- If `git push` fails, stop and report the error (don't deploy uncommitted changes)
- If deployment fails, show the error logs:
  ```bash
  docker compose -f docker-compose.cloud.yml logs
  ```

## Notes

- The .env file must exist at /home/bauty/Projects/sporttia-zero/.env
- Version is displayed in the web app footer (v0.1.0 format)
- Ulpius machine: 10.132.0.123 (internal) / 104.155.115.229 (external)
- All services run behind the nginx proxy at zero.ulpius.sporttia.com
