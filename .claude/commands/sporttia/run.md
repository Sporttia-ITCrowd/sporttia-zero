# /run Command

When this command is used, start the Sporttia ZERO development environment using Docker.

## Purpose

Start all services (PostgreSQL, API, Web, Admin) in Docker containers for local development.

## Prerequisites

Before running, ensure:
1. Docker Desktop is running
2. `.env.local` file exists with required API keys (copy from `.env.local.example`)
3. MySQL tunnel is running for Sporttia DB access (optional, only needed for creating sports centers)

## Workflow Steps

### Step 1: Check Prerequisites

```bash
# Check if Docker is running
docker info > /dev/null 2>&1 || echo "Docker is not running!"

# Check if .env.local exists
test -f /Users/bau/Projects/sporttia-zero/.env.local || echo ".env.local not found!"
```

If Docker is not running, tell the user to start Docker Desktop.
If `.env.local` doesn't exist, tell the user to copy it from `.env.local.example` and fill in the API keys.

### Step 2: Start MySQL Tunnel (Optional)

If the user needs to create sports centers (requires Sporttia MySQL access):

```bash
# Check if tunnel is already running
pgrep -f "ssh.*3311.*sporttia-sql-pre" > /dev/null || echo "MySQL tunnel not running"
```

If not running, suggest starting it in a separate terminal:
```bash
ssh -L 3311:sporttia-sql-pre:3306 sporttia-hub
```

### Step 3: Build and Start Docker Containers

```bash
cd /Users/bau/Projects/sporttia-zero && docker compose -f docker-compose.local.yml up --build -d
```

This will:
1. Build the API, Web, and Admin Docker images
2. Start PostgreSQL database
3. Run database migrations
4. Start all services with hot reloading

### Step 4: Wait for Services to be Ready

```bash
# Wait for services to be healthy
docker compose -f docker-compose.local.yml ps
```

### Step 5: Show Service URLs

Once all services are running, display:

| Service | URL |
|---------|-----|
| Web App | http://localhost:4501 |
| API | http://localhost:4500 |
| Admin Panel | http://localhost:4502 |
| PostgreSQL | localhost:5433 |

## Arguments

The command accepts optional arguments:
- `/run` - Start all services
- `/run --build` - Force rebuild containers before starting
- `/run --logs` - Start and show logs (attached mode)
- `/run stop` - Stop all running containers
- `/run logs` - Show logs from running containers
- `/run restart` - Restart all services

## Stopping Services

To stop all services:
```bash
cd /Users/bau/Projects/sporttia-zero && docker compose -f docker-compose.local.yml down
```

To stop and remove volumes (reset database):
```bash
cd /Users/bau/Projects/sporttia-zero && docker compose -f docker-compose.local.yml down -v
```

## Viewing Logs

```bash
# All services
docker compose -f docker-compose.local.yml logs -f

# Specific service
docker compose -f docker-compose.local.yml logs -f api
docker compose -f docker-compose.local.yml logs -f web
docker compose -f docker-compose.local.yml logs -f admin
```

## Troubleshooting

1. **Port already in use**: Stop other services using ports 4500, 4501, 4502, or 5433
2. **Database connection fails**: Wait for PostgreSQL to be healthy, check with `docker compose ps`
3. **API errors**: Check `.env.local` has valid OPENAI_API_KEY
4. **Hot reload not working**: Ensure source files are mounted correctly

## Notes

- Source code is mounted as read-only volumes for hot reloading
- PostgreSQL data is persisted in a Docker volume (`postgres_data`)
- The API runs database migrations automatically on startup
