# PRODUCTION environment configuration for Sporttia ZERO
# Deploy to: sporttia-hub as .env.pro
# Docker: docker compose -f docker-compose.pro.yml up -d

# Server Configuration
PORT=4500
NODE_ENV=production
LOG_LEVEL=info

# Database (PostgreSQL) - Cloud SQL sporttia-db-hub-pro (PRO)
# Private IP 10.63.50.14 accessible from GCP VPC
DATABASE_URL=postgresql://sporttia:Trebujena1!@10.63.50.14:5432/sporttia_zero?sslmode=require

# OpenAI
OPENAI_API_KEY=CHANGE_ME
OPENAI_MODEL=gpt-4o-mini

# Sporttia API - PRODUCTION
SPORTTIA_API_URL=https://api.sporttia.com/v7

# Sporttia MySQL Database (for ZeroService) - PRODUCTION
SPORTTIA_DB_HOST=10.63.48.5
SPORTTIA_DB_PORT=3306
SPORTTIA_DB_USER=sporttia
SPORTTIA_DB_PASSWORD=trebujena
SPORTTIA_DB_NAME=sporttia

# Resend (Email)
RESEND_API_KEY=re_BAtPJMTa_81LDsAj3RR5KmTtuVpPknw2M
EMAIL_FROM=Sporttia ZERO <zero@sporttia.com>

# Google Places API (for city lookup)
GOOGLE_PLACES_API_KEY=CHANGE_ME

# Admin credentials (for /backoffice)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=CHANGE_ME

# CORS - Production URL
CORS_ORIGIN=https://zero.sporttia.com
