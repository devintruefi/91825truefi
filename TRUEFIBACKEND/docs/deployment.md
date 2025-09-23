# TrueFi Complete Deployment Guide

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [PostgreSQL Database Setup](#postgresql-database-setup)
4. [Google Cloud Setup](#google-cloud-setup)
5. [Vercel Frontend Deployment](#vercel-frontend-deployment)
6. [Environment Variables Reference](#environment-variables-reference)
7. [Deployment Steps](#deployment-steps)
8. [Testing and Validation](#testing-and-validation)
9. [Troubleshooting](#troubleshooting)
10. [Security Checklist](#security-checklist)

## Overview

TrueFi consists of three main components:
1. **Frontend (Next.js)** - Deployed on Vercel
2. **Backend (FastAPI/Python)** - Deployed on Google Cloud Run
3. **Database (PostgreSQL)** - Google Cloud SQL

## Prerequisites

### Required Accounts
- **Vercel Account**: https://vercel.com/signup
- **Google Cloud Account**: https://console.cloud.google.com
- **GitHub Account**: For repository management
- **Plaid Account**: https://dashboard.plaid.com/signup
- **OpenAI API Account**: https://platform.openai.com/signup

### Required Tools
```bash
# Install gcloud CLI
# Windows: Download from https://cloud.google.com/sdk/docs/install
# Mac: brew install google-cloud-sdk
# Linux: Follow https://cloud.google.com/sdk/docs/install#linux

# Install Vercel CLI
npm install -g vercel

# Install PostgreSQL client (for local testing)
# Windows: Download from https://www.postgresql.org/download/windows/
# Mac: brew install postgresql
# Linux: sudo apt-get install postgresql-client
```

## PostgreSQL Database Setup

### Google Cloud SQL Configuration

#### 1. Create Cloud SQL Instance
```bash
# Set your project ID
export PROJECT_ID="truefi"  # or your actual project ID

# Create PostgreSQL instance
gcloud sql instances create true-fi-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --network=default \
  --no-backup \
  --database-flags=max_connections=100

# Note the instance connection name: truefi:us-central1:true-fi-db
```

#### 2. Create Database and User
```bash
# Create database
gcloud sql databases create truefi_app_data \
  --instance=true-fi-db

# Create user (SAVE THIS PASSWORD!)
# Generate a secure password first
export DB_PASSWORD="YOUR_SECURE_PASSWORD_HERE"  # Replace with actual password

gcloud sql users create truefi_user \
  --instance=true-fi-db \
  --password=$DB_PASSWORD
```

#### 3. Database Connection Details
```yaml
Instance Name: true-fi-db
Connection Name: truefi:us-central1:true-fi-db
Database: truefi_app_data
Username: truefi_user
Password: [YOUR_SECURE_PASSWORD]
```

### Database Schema Setup

#### 1. Connect to Database
```bash
# Using Cloud SQL Proxy (recommended for initial setup)
# Download proxy: https://cloud.google.com/sql/docs/mysql/sql-proxy

# Start proxy
cloud_sql_proxy -instances=truefi:us-central1:true-fi-db=tcp:5432

# In another terminal, connect
psql -h localhost -U truefi_user -d truefi_app_data
```

#### 2. Run Prisma Migrations
```bash
# From the frontend directory
cd /path/to/truefi72625

# Set DATABASE_URL
export DATABASE_URL="postgresql://truefi_user:YOUR_PASSWORD@localhost:5432/truefi_app_data"

# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Verify tables were created
npx prisma studio
```

## Google Cloud Setup

### 1. Project Configuration
```bash
# Create or select project
gcloud projects create truefi --name="TrueFi App"
# OR
gcloud config set project truefi

# Enable required APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### 2. Cloud Run Backend Deployment

#### Create cloudbuild.yaml
```yaml
# TRUEFIBACKEND/cloudbuild.yaml
steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/truefi-backend', '.']

  # Push the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/truefi-backend']

  # Deploy to Cloud Run
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'truefi-backend'
      - '--image=gcr.io/$PROJECT_ID/truefi-backend'
      - '--region=us-central1'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--add-cloudsql-instances=truefi:us-central1:true-fi-db'
      - '--set-env-vars=DB_HOST=/cloudsql/truefi:us-central1:true-fi-db,DB_NAME=truefi_app_data,DB_USER=truefi_user'
      - '--set-secrets=DB_PASSWORD=db-password:latest,OPENAI_API_KEY=openai-api-key:latest'
      - '--memory=512Mi'
      - '--cpu=1'
      - '--timeout=300'
      - '--concurrency=80'
      - '--max-instances=10'

images:
  - 'gcr.io/$PROJECT_ID/truefi-backend'
```

#### Set up Secrets in Secret Manager
```bash
# Store database password
echo -n "YOUR_DB_PASSWORD" | gcloud secrets create db-password --data-file=-

# Store OpenAI API key
echo -n "YOUR_OPENAI_API_KEY" | gcloud secrets create openai-api-key --data-file=-

# Grant Cloud Run access to secrets
gcloud secrets add-iam-policy-binding db-password \
  --member="serviceAccount:$(gcloud projects describe truefi --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding openai-api-key \
  --member="serviceAccount:$(gcloud projects describe truefi --format='value(projectNumber)')-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

#### Deploy Backend
```bash
# From TRUEFIBACKEND directory
cd TRUEFIBACKEND

# Submit build
gcloud builds submit --config cloudbuild.yaml

# Get the backend URL
gcloud run services describe truefi-backend --region=us-central1 --format='value(status.url)'
# Save this URL! Example: https://truefi-backend-abc123-uc.a.run.app
```

## Vercel Frontend Deployment

### 1. Environment Variables Setup

#### Required Environment Variables for Vercel
```env
# Core Database
DATABASE_URL=postgresql://truefi_user:YOUR_PASSWORD@/truefi_app_data?host=/cloudsql/truefi:us-central1:true-fi-db

# Backend URL (from Cloud Run deployment)
BACKEND_URL=https://truefi-backend-abc123-uc.a.run.app

# Public URLs
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_BACKEND_URL=https://truefi-backend-abc123-uc.a.run.app

# Authentication
JWT_SECRET=6f7b0f47c27a44b0a0fc781c2e3e84b50a0f6f7a1c9d8c25b7d0fa492ce2a35b
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Plaid Configuration
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret_key
PLAID_ENV=sandbox  # or development/production

# OpenAI
OPENAI_API_KEY=sk-your_openai_api_key_here

# Polygon (for financial data)
POLYGON_API_KEY=your_polygon_api_key_here

# Environment Settings
ENVIRONMENT=production
NODE_ENV=production

# Feature Flags (optional)
ONBOARDING_V2=true
NEXT_PUBLIC_GUIDED_ONBOARDING=true
BUDGETS_DB_MAPPING=true
TEST_MODE=false
```

### 2. Vercel Deployment Steps

#### Using Vercel CLI
```bash
# From project root
cd /path/to/truefi72625

# Login to Vercel
vercel login

# Link to project (first time only)
vercel link

# Set environment variables
vercel env add DATABASE_URL production
# Paste: postgresql://truefi_user:YOUR_PASSWORD@/truefi_app_data?host=/cloudsql/truefi:us-central1:true-fi-db

vercel env add BACKEND_URL production
# Paste your Cloud Run URL

# Continue for all variables...

# Deploy
vercel --prod
```

#### Using Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Import your GitHub repository
3. Set framework preset to "Next.js"
4. Override build command: `npm run vercel-build`
5. Add all environment variables from the list above
6. Click "Deploy"

### 3. Database Connection for Vercel

#### Option A: Cloud SQL Public IP (Simpler)
```bash
# Enable public IP for Cloud SQL
gcloud sql instances patch true-fi-db --assign-ip

# Get the public IP
gcloud sql instances describe true-fi-db --format='value(ipAddresses[0].ipAddress)'

# Authorize Vercel IPs (get from Vercel support)
gcloud sql instances patch true-fi-db --authorized-networks=0.0.0.0/0  # TEMPORARY for testing

# Update DATABASE_URL in Vercel
DATABASE_URL=postgresql://truefi_user:YOUR_PASSWORD@PUBLIC_IP:5432/truefi_app_data?sslmode=require
```

#### Option B: Cloud SQL Auth Proxy (More Secure)
Use Vercel's Cloud SQL integration or set up a proxy service.

## Environment Variables Reference

### Frontend (.env.local for local development)
```env
# Database
DATABASE_URL=postgresql://truefi_user:password@localhost:5432/truefi_app_data

# Backend
BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=/api

# Auth
JWT_SECRET=6f7b0f47c27a44b0a0fc781c2e3e84b50a0f6f7a1c9d8c25b7d0fa492ce2a35b
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Plaid
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox

# APIs
OPENAI_API_KEY=sk-your_key
POLYGON_API_KEY=your_polygon_key

# Settings
NODE_ENV=development
ENVIRONMENT=development
```

### Backend (.env for local development)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=truefi_app_data
DB_USER=truefi_user
DB_PASSWORD=your_password
DB_SSLMODE=require

# OpenAI
OPENAI_API_KEY=sk-your_key
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.1

# Agent Configuration
MAX_SQL_REVISIONS=1
MAX_MODEL_REVISIONS=1
MAX_SQL_ROWS=1000
PROFILE_PACK_CACHE_MINUTES=60

# Logging
LOG_LEVEL=INFO
LOG_FILE=agent_execution.log
LOG_TO_DB=true

# Server
ENVIRONMENT=development
```

## Deployment Steps

### Step-by-Step Deployment Process

#### 1. Database Setup
```bash
# Create Cloud SQL instance
gcloud sql instances create true-fi-db --database-version=POSTGRES_15 --tier=db-f1-micro --region=us-central1

# Create database
gcloud sql databases create truefi_app_data --instance=true-fi-db

# Create user
gcloud sql users create truefi_user --instance=true-fi-db --password=YOUR_SECURE_PASSWORD

# Run migrations (using Cloud SQL proxy)
cloud_sql_proxy -instances=truefi:us-central1:true-fi-db=tcp:5432 &
export DATABASE_URL="postgresql://truefi_user:YOUR_PASSWORD@localhost:5432/truefi_app_data"
npx prisma db push
```

#### 2. Deploy Backend to Cloud Run
```bash
cd TRUEFIBACKEND

# Create secrets
echo -n "YOUR_DB_PASSWORD" | gcloud secrets create db-password --data-file=-
echo -n "YOUR_OPENAI_KEY" | gcloud secrets create openai-api-key --data-file=-

# Build and deploy
gcloud builds submit --config cloudbuild.yaml

# Get backend URL
BACKEND_URL=$(gcloud run services describe truefi-backend --region=us-central1 --format='value(status.url)')
echo "Backend URL: $BACKEND_URL"
```

#### 3. Deploy Frontend to Vercel
```bash
# Set up environment variables in Vercel dashboard
# Then deploy
vercel --prod
```

## Testing and Validation

### 1. Test Database Connection
```sql
-- Connect to database
psql -h PUBLIC_IP -U truefi_user -d truefi_app_data

-- Check tables
\dt

-- Test query
SELECT COUNT(*) FROM users;
```

### 2. Test Backend API
```bash
# Health check
curl https://your-backend-url.run.app/health

# Test database endpoint
curl https://your-backend-url.run.app/test-db
```

### 3. Test Frontend
```bash
# Check deployment
curl https://your-app.vercel.app/api/health

# Test database connection
curl https://your-app.vercel.app/api/test-db
```

## Troubleshooting

### Common Issues and Solutions

#### Database Connection Issues
```bash
# Error: ECONNREFUSED
# Solution: Check Cloud SQL proxy is running
cloud_sql_proxy -instances=truefi:us-central1:true-fi-db=tcp:5432

# Error: password authentication failed
# Solution: Reset password
gcloud sql users set-password truefi_user --instance=true-fi-db --password=NEW_PASSWORD
```

#### Cloud Run Issues
```bash
# Check logs
gcloud run services logs read truefi-backend --region=us-central1

# Check service status
gcloud run services describe truefi-backend --region=us-central1

# Update environment variables
gcloud run services update truefi-backend --update-env-vars KEY=VALUE
```

#### Vercel Build Failures
```bash
# Check build logs in Vercel dashboard
# Common fixes:

# 1. Prisma generation issue
# Add to package.json scripts:
"vercel-build": "prisma generate && next build"

# 2. Database connection during build
# Ensure DATABASE_URL is set correctly in Vercel env vars

# 3. Module not found
# Clear cache and redeploy
vercel --force
```

### Debug Commands
```bash
# Test database connection from local
psql postgresql://truefi_user:password@PUBLIC_IP:5432/truefi_app_data

# Test backend locally
cd TRUEFIBACKEND
python -m uvicorn main:app --reload --port 8080

# Test frontend locally
cd /path/to/frontend
npm run dev
```

## Security Checklist

### Database Security
- [ ] Use strong password (minimum 16 characters, mixed case, numbers, symbols)
- [ ] Enable SSL for database connections
- [ ] Restrict IP addresses (don't use 0.0.0.0/0 in production)
- [ ] Enable Cloud SQL backups
- [ ] Use private IP if possible

### API Security
- [ ] JWT_SECRET is unique and strong (use: openssl rand -hex 32)
- [ ] HTTPS only (enforced by Cloud Run and Vercel)
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Input validation on all endpoints

### Environment Variables
- [ ] Never commit .env files to git
- [ ] Use Secret Manager for sensitive data
- [ ] Rotate API keys regularly
- [ ] Different keys for dev/staging/production

### Access Control
- [ ] Use IAM roles appropriately
- [ ] Service accounts have minimum required permissions
- [ ] Regular audit of access logs
- [ ] MFA enabled on all admin accounts

## Production Readiness Checklist

### Performance
- [ ] Database indexes created
- [ ] Connection pooling configured
- [ ] CDN enabled (Vercel automatic)
- [ ] Image optimization enabled
- [ ] API response caching where appropriate

### Monitoring
- [ ] Google Cloud Monitoring enabled
- [ ] Vercel Analytics enabled
- [ ] Error tracking (Sentry recommended)
- [ ] Uptime monitoring configured
- [ ] Database query performance monitoring

### Scaling
- [ ] Cloud Run autoscaling configured
- [ ] Database tier appropriate for load
- [ ] Connection pool size optimized
- [ ] Rate limiting in place

### Backup and Recovery
- [ ] Database automated backups enabled
- [ ] Backup retention policy defined
- [ ] Recovery procedure documented
- [ ] Regular backup restoration tests

## Cost Optimization

### Estimated Monthly Costs
```
Cloud SQL (db-f1-micro): ~$15-25/month
Cloud Run: ~$10-50/month (depends on traffic)
Vercel (Pro): $20/month
Total: ~$45-95/month
```

### Cost Saving Tips
1. Use Cloud SQL only when needed (stop during development)
2. Set Cloud Run max instances limit
3. Use Vercel's free tier for development
4. Clean up unused resources regularly

## Support and Resources

### Documentation Links
- Vercel Docs: https://vercel.com/docs
- Google Cloud Run: https://cloud.google.com/run/docs
- Cloud SQL: https://cloud.google.com/sql/docs
- Prisma: https://www.prisma.io/docs
- Next.js: https://nextjs.org/docs

### Getting API Keys

#### OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy immediately (won't be shown again)

#### Plaid Credentials
1. Go to https://dashboard.plaid.com/team/keys
2. Copy Client ID
3. Copy Sandbox/Development/Production secret as needed

#### Google OAuth
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URIs:
   - http://localhost:3000/api/auth/callback/google
   - https://your-app.vercel.app/api/auth/callback/google

#### Polygon API
1. Go to https://polygon.io/dashboard/api-keys
2. Create new API key
3. Copy the key

## Quick Start Commands

### Complete Setup Script
```bash
#!/bin/bash
# Save as setup-truefi.sh

# Variables (CHANGE THESE!)
export PROJECT_ID="truefi"
export DB_PASSWORD="YOUR_SECURE_PASSWORD"
export OPENAI_KEY="sk-YOUR_KEY"
export GITHUB_REPO="https://github.com/yourusername/truefi"

# 1. Setup Google Cloud
gcloud config set project $PROJECT_ID
gcloud services enable cloudbuild.googleapis.com run.googleapis.com sqladmin.googleapis.com

# 2. Create Database
gcloud sql instances create true-fi-db --database-version=POSTGRES_15 --tier=db-f1-micro --region=us-central1
gcloud sql databases create truefi_app_data --instance=true-fi-db
gcloud sql users create truefi_user --instance=true-fi-db --password=$DB_PASSWORD

# 3. Create Secrets
echo -n "$DB_PASSWORD" | gcloud secrets create db-password --data-file=-
echo -n "$OPENAI_KEY" | gcloud secrets create openai-api-key --data-file=-

# 4. Deploy Backend
cd TRUEFIBACKEND
gcloud builds submit --config cloudbuild.yaml

# 5. Get URLs
echo "Backend URL:"
gcloud run services describe truefi-backend --region=us-central1 --format='value(status.url)'

echo "Setup complete! Now deploy frontend to Vercel with the backend URL."
```

## Contact Information

For deployment issues:
- Database issues: Check Cloud SQL logs in Google Cloud Console
- Backend issues: Check Cloud Run logs
- Frontend issues: Check Vercel deployment logs
- Integration issues: Test each component individually first

Remember to keep all credentials secure and never share them publicly!