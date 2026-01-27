# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files for workspace setup
COPY package*.json ./
COPY apps/admin/package*.json ./apps/admin/
COPY packages/shared/package*.json ./packages/shared/

# Install all dependencies
RUN npm ci

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/admin ./apps/admin

# Build shared package first, then admin
RUN npm run build -w @sporttia-zero/shared
RUN NODE_ENV=production npm run build -w @sporttia-zero/admin

# Production stage with nginx
FROM nginx:alpine AS production

# Copy custom nginx config
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
