# Sporttia ZERO

AI-powered conversational assistant for onboarding sports centers onto the Sporttia platform.

## Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0
- PostgreSQL 15.x (for production)

## Project Structure

```
sporttia-zero/
├── apps/
│   ├── api/          # Express.js backend API
│   ├── web/          # React chat interface
│   └── admin/        # React admin dashboard
├── packages/
│   └── shared/       # Shared TypeScript types
├── docs/             # Project documentation
└── package.json      # Monorepo root
```

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy the example environment files:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/admin/.env.example apps/admin/.env
```

Edit `apps/api/.env` with your actual values:
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key
- `RESEND_API_KEY` - Resend API key for emails

### 3. Build shared package

```bash
npm run build -w @sporttia-zero/shared
```

### 4. Set up PostgreSQL database

Create a PostgreSQL database and run migrations:

```bash
# Create database (adjust for your setup)
createdb sporttia_zero

# Run migrations
npm run db:migrate -w @sporttia-zero/api
```

### 5. Start development servers

Start all apps simultaneously:

```bash
npm run dev
```

Or start individual apps:

```bash
npm run dev:api    # API server on http://localhost:3000
npm run dev:web    # Chat UI on http://localhost:5173
npm run dev:admin  # Admin UI on http://localhost:5174
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all apps in development mode |
| `npm run build` | Build all apps for production |
| `npm run test` | Run tests across all workspaces |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run clean` | Remove all node_modules and dist folders |
| `npm run db:migrate -w @sporttia-zero/api` | Run database migrations |

## Database Schema

The API uses PostgreSQL with the following tables:

- `conversations` - Chat sessions with status tracking
- `messages` - Individual messages within conversations
- `sports_centers` - Sports centers created via ZERO
- `analytics_events` - Event tracking for funnel analysis

## Architecture

- **Frontend**: React 18 with Vite, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with TypeScript, Pino logging
- **Database**: PostgreSQL with Kysely query builder
- **AI**: OpenAI GPT-4 with function calling
- **Email**: Resend for transactional emails

## Documentation

- [Project Brief](docs/brief.md)
- [Product Requirements](docs/prd.md)
- [Architecture](docs/architecture.md)
- [Frontend Spec](docs/front-end-spec.md)

## License

Proprietary - Sporttia
