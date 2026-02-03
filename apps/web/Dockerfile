# Build stage
FROM node:20-alpine AS builder

# Build arguments for Vite
ARG VITE_APP_ENV=pro

WORKDIR /app

# Copy root package files for workspace setup
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/shared/package*.json ./packages/shared/

# Install all dependencies
RUN npm ci

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Build shared package first, then web
RUN npm run build -w @sporttia-zero/shared
RUN VITE_APP_ENV=${VITE_APP_ENV} npm run build -w @sporttia-zero/web

# Production stage with nginx
FROM nginx:alpine AS production

# Copy custom nginx config
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
