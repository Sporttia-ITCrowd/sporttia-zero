# Project Sporttia ZERO

## Deployment Commands

| Command | Environment | Target | Description |
|---------|-------------|--------|-------------|
| `/deploy_ulpius` | DEV | ulpius | Commit, push, and deploy to development |
| `/deploy_pre` | PRE | sporttia-zero | Deploy to pre-production |
| `/deploy_pro` | PRO | sporttia-zero | Deploy to production |

**Flow**: DEV → PRE → PRO

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
