# Project Sporttia ZERO

## Deployment Commands

| Command | Environment | Target | URL |
|---------|-------------|--------|-----|
| `/deploy_ulpius` | DEV | ulpius (10.132.0.123) | https://zero-ulpius.sporttia.com |
| `/deploy_pre` | PRE | sporttia-hub-pre (10.132.0.111) | https://zero-pre.sporttia.com |
| `/deploy_pro` | PRO | sporttia-hub-pro (10.132.0.112) | https://zero.sporttia.com |

**Flow**: DEV → PRE → PRO

**SSH Access:**
```bash
gcloud compute ssh sporttia-hub-pre --zone=europe-west1-b  # PRE
gcloud compute ssh sporttia-hub-pro --zone=europe-west1-b  # PRO
```

## Running Locally
When the project is running in local, use these ports:
- API server: 4500
- Web: 4501
- Admin: 4502

## Documentation
Before making changes, read:
- /docs/prd.md - Product requirements
- /docs/architecture.md - System architecture
- /docs/frontend-architecture.md - Frontend architecture
- /docs/stories/ - User stories

Everytime a change is made, think about the possibility to modify any of the docs in /doc.

## Conventions
- Framework: React + TypeScript
- Styles: Tailwind
- Tests: Vitest
