# Google Cloud Infrastructure Documentation

## Project Overview
- **Project ID**: `truefi`
- **Project Number**: `118529284371`
- **Primary Region**: `us-central1`
- **GitHub Repository**: `devintruefi/91825truefi`
- **Main Branch**: `main`
- **Current Deploy Branch**: `fix-dockerfile`

## Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                         GitHub                              │
│                   devintruefi/91825truefi                   │
└────────────────────┬────────────────────────────────────────┘
                     │ Trigger on push
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cloud Build                              │
│         Trigger: rmgpgab-truefi-backend-*                   │
│              Build → Push → Deploy                          │
└────────────┬───────────────────────────┬────────────────────┘
             │                           │
             ▼                           ▼
┌────────────────────────┐   ┌──────────────────────────────┐
│   Container Registry   │   │      Cloud Run Service       │
│  gcr.io/truefi/*      │   │      truefi-backend          │
└────────────────────────┘   └────────────┬──────────────────┘
                                          │
                                          ▼
                              ┌──────────────────────────────┐
                              │      Cloud SQL               │
                              │   true-fi-db (PostgreSQL)    │
                              └──────────────────────────────┘
```

## 1. Cloud SQL Database

### Instance Details
- **Instance Name**: `true-fi-db`
- **Connection Name**: `truefi:us-central1:true-fi-db`
- **Database Version**: PostgreSQL 15
- **Tier**: `db-f1-micro`
- **Region**: `us-central1`
- **Database Name**: `truefi_app_data`
- **Username**: `truefi_user`

### Connection Methods
```bash
# Via Cloud SQL Proxy (Local Development)
cloud-sql-proxy truefi:us-central1:true-fi-db --port=5433

# Direct Connection String (from Cloud Run)
/cloudsql/truefi:us-central1:true-fi-db

# Public IP Connection (if enabled)
postgresql://truefi_user:PASSWORD@PUBLIC_IP:5432/truefi_app_data
```

## 2. Cloud Run Service

### Service Configuration
- **Service Name**: `truefi-backend`
- **URL**: `https://truefi-backend-jcvbmkv5bq-uc.a.run.app`
- **Region**: `us-central1`
- **Platform**: Managed
- **Authentication**: Allow unauthenticated
- **Port**: 8080

### Resource Allocation
- **Memory**: 1 GiB
- **CPU**: 2 vCPUs
- **CPU Boost**: Enabled
- **Min Instances**: 1
- **Max Instances**: 10
- **Timeout**: 300 seconds
- **Concurrency**: 80
- **Execution Environment**: gen2

### Environment Variables (Set in Cloud Run)
```yaml
# Database Connection
DB_HOST: /cloudsql/truefi:us-central1:true-fi-db
DB_NAME: truefi_app_data
DB_USER: truefi_user
DB_PASSWORD: [Secret from Secret Manager]

# API Keys
OPENAI_API_KEY: [Secret from Secret Manager]
JWT_SECRET: [Secret from Secret Manager]

# Python Settings
PYTHONUNBUFFERED: 1
```

## 3. Cloud Build Configuration

### Build Trigger Details
- **Trigger Name**: `rmgpgab-truefi-backend-us-central1-devintruefi-91825truefi--idi`
- **Trigger ID**: `800b2cf5-3141-48ce-90c6-9856cf4838eb`
- **Source Branch Pattern**: `^main$` (or `fix-dockerfile` for current)
- **Build Config File**: `cloudbuild.yaml`
- **Machine Type**: `e2-highcpu-8`

### Build Steps (from cloudbuild.yaml)
```yaml
steps:
  # Step 1: Build Docker Image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/truefi/truefi-backend:$SHORT_SHA',
           '-t', 'gcr.io/truefi/truefi-backend:latest',
           '-f', 'Dockerfile', '.']

  # Step 2: Push to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', '--all-tags', 'gcr.io/truefi/truefi-backend']

  # Step 3: Deploy to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    args:
      - 'gcloud'
      - 'run'
      - 'deploy'
      - 'truefi-backend'
      - '--image=gcr.io/truefi/truefi-backend:$SHORT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
      - '--add-cloudsql-instances=truefi:us-central1:true-fi-db'
      - '--allow-unauthenticated'
      - '--port=8080'
      - '--memory=1Gi'
      - '--cpu=2'
      - '--min-instances=1'
      - '--max-instances=10'
      - '--timeout=300'
      - '--execution-environment=gen2'
      - '--cpu-boost'
      - '--set-env-vars=PYTHONUNBUFFERED=1,DB_NAME=truefi_app_data,DB_USER=truefi_user'
      - '--set-secrets=DB_PASSWORD=db-password:latest,OPENAI_API_KEY=openai-api-key:latest,JWT_SECRET=jwt-secret:latest'
```

### Build Substitutions Available
```yaml
BRANCH_NAME: fix-dockerfile
BUILD_ID: 7e901bf8-0ce6-4b42-8715-dd1c389468c8
COMMIT_SHA: 316bb9207ccc5ee67df857166fdd3b48c721d8ab
SHORT_SHA: 316bb92
PROJECT_ID: truefi
PROJECT_NUMBER: 118529284371
TRIGGER_NAME: rmgpgab-truefi-backend-*
```

## 4. Container Registry

### Image Locations
```
gcr.io/truefi/truefi-backend:latest
gcr.io/truefi/truefi-backend:316bb92  # Tagged with commit SHA
```

## 5. Secret Manager

### Configured Secrets
| Secret Name | Description | Used By |
|------------|-------------|---------|
| `db-password` | PostgreSQL password for truefi_user | Cloud Run, Cloud Build |
| `openai-api-key` | OpenAI API key for AI features | Cloud Run |
| `jwt-secret` | JWT secret for authentication | Cloud Run |

### Managing Secrets
```bash
# View secrets
gcloud secrets list

# Create/Update a secret
echo -n "NEW_VALUE" | gcloud secrets create SECRET_NAME --data-file=-
echo -n "NEW_VALUE" | gcloud secrets versions add SECRET_NAME --data-file=-

# Grant access to Cloud Run
gcloud secrets add-iam-policy-binding SECRET_NAME \
  --member="serviceAccount:118529284371-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## 6. Service Accounts

### Default Compute Service Account
- **Email**: `118529284371-compute@developer.gserviceaccount.com`
- **Roles**:
  - Cloud SQL Client
  - Secret Manager Secret Accessor
  - Cloud Run Invoker

## 7. APIs Enabled
- Cloud Build API (`cloudbuild.googleapis.com`)
- Cloud Run API (`run.googleapis.com`)
- Cloud SQL Admin API (`sqladmin.googleapis.com`)
- Secret Manager API (`secretmanager.googleapis.com`)
- Container Registry API (`containerregistry.googleapis.com`)

## 8. Monitoring & Logs

### View Logs
```bash
# Cloud Run logs
gcloud run services logs read truefi-backend --region=us-central1

# Cloud Build logs
gcloud builds log BUILD_ID

# Cloud SQL logs
gcloud sql operations list --instance=true-fi-db
```

### Monitoring URLs
- **Cloud Run Console**: https://console.cloud.google.com/run/detail/us-central1/truefi-backend/metrics?project=truefi
- **Cloud Build History**: https://console.cloud.google.com/cloud-build/builds?project=truefi
- **Cloud SQL Console**: https://console.cloud.google.com/sql/instances/true-fi-db/overview?project=truefi

## 9. Common Management Commands

### Deploy Manually
```bash
# Submit build from local
cd TRUEFIBACKEND
gcloud builds submit --config cloudbuild.yaml

# Deploy directly without build
gcloud run deploy truefi-backend \
  --image gcr.io/truefi/truefi-backend:latest \
  --region us-central1
```

### Update Environment Variables
```bash
# Update single env var
gcloud run services update truefi-backend \
  --update-env-vars KEY=VALUE \
  --region us-central1

# Update from .env file
gcloud run services update truefi-backend \
  --env-vars-file .env.gcp \
  --region us-central1
```

### Database Operations
```bash
# Connect to database
gcloud sql connect true-fi-db --user=truefi_user --database=truefi_app_data

# Export database
gcloud sql export sql true-fi-db gs://BUCKET/backup.sql \
  --database=truefi_app_data

# Import database
gcloud sql import sql true-fi-db gs://BUCKET/backup.sql \
  --database=truefi_app_data
```

## 10. Troubleshooting Guide

### Issue: Backend returns 500 errors
```bash
# Check logs
gcloud run services logs read truefi-backend --region=us-central1 --limit=50

# Common causes:
# - Missing environment variables
# - Database connection issues
# - Secret Manager permissions
```

### Issue: Build fails
```bash
# Check build logs
gcloud builds list --limit=5
gcloud builds log LATEST_BUILD_ID

# Common causes:
# - Dockerfile syntax errors
# - Missing dependencies
# - Container registry permissions
```

### Issue: Database connection fails
```bash
# Test connection
gcloud sql connect true-fi-db --user=truefi_user

# Check Cloud SQL proxy
cloud-sql-proxy truefi:us-central1:true-fi-db --port=5433

# Verify Cloud Run has SQL connection
gcloud run services describe truefi-backend --region=us-central1 \
  --format="get(spec.template.metadata.annotations)"
```

### Issue: Secrets not accessible
```bash
# List secrets
gcloud secrets list

# Check permissions
gcloud secrets get-iam-policy SECRET_NAME

# Test access
gcloud secrets versions access latest --secret=SECRET_NAME
```

## 11. Cost Optimization

### Current Estimated Costs
- **Cloud SQL (db-f1-micro)**: ~$15-25/month
- **Cloud Run**: ~$10-50/month (based on traffic)
- **Container Registry**: ~$5/month
- **Secret Manager**: ~$0.06/month
- **Total**: ~$30-80/month

### Cost Saving Tips
1. **Cloud SQL**:
   - Stop instance when not in use for development
   - Use committed use discounts for production

2. **Cloud Run**:
   - Set appropriate max-instances limit
   - Use min-instances=0 for dev environments
   - Monitor and adjust memory/CPU allocation

3. **Container Registry**:
   - Clean up old images regularly
   - Use lifecycle policies

```bash
# Delete old images
gcloud container images list-tags gcr.io/truefi/truefi-backend \
  --filter='-tags:*' --format='get(digest)' | \
  xargs -I {} gcloud container images delete gcr.io/truefi/truefi-backend@{} --quiet
```

## 12. Security Checklist

- [ ] Secrets stored in Secret Manager, not in code
- [ ] Cloud SQL using private IP (optional for better security)
- [ ] Cloud Run service account has minimal permissions
- [ ] Regular rotation of API keys and passwords
- [ ] Cloud SQL backups enabled
- [ ] Monitoring and alerting configured
- [ ] VPC Service Controls (optional for enterprise)

## 13. Disaster Recovery

### Backup Strategy
```bash
# Automated daily backups (configure in console)
gcloud sql instances patch true-fi-db --backup-start-time=03:00

# Manual backup
gcloud sql backups create --instance=true-fi-db

# List backups
gcloud sql backups list --instance=true-fi-db
```

### Recovery Procedures
1. **Database Recovery**:
   ```bash
   # Restore from backup
   gcloud sql backups restore BACKUP_ID --restore-instance=true-fi-db
   ```

2. **Service Recovery**:
   ```bash
   # Rollback to previous version
   gcloud run services update-traffic truefi-backend \
     --to-revisions=PREVIOUS_REVISION=100 \
     --region=us-central1
   ```

## 14. Development vs Production

### Development Setup
- Use Cloud SQL Proxy locally
- Min instances = 0 (scale to zero)
- Use sandbox/development API keys
- Enable verbose logging

### Production Setup
- Min instances = 1 (always warm)
- Production API keys
- Enable Cloud Armor for DDoS protection
- Set up monitoring alerts
- Enable Cloud CDN for static assets

## Quick Reference Card

```bash
# Most Common Commands
# --------------------
# View backend URL
gcloud run services describe truefi-backend --region=us-central1 --format='value(status.url)'

# View recent logs
gcloud run services logs read truefi-backend --region=us-central1 --limit=20

# Trigger new build
gcloud builds submit --config cloudbuild.yaml

# Update secrets
echo -n "NEW_VALUE" | gcloud secrets versions add SECRET_NAME --data-file=-

# Connect to database
cloud-sql-proxy truefi:us-central1:true-fi-db --port=5433

# Check service status
gcloud run services list --region=us-central1
```

## Important URLs
- **Backend API**: https://truefi-backend-jcvbmkv5bq-uc.a.run.app
- **Health Check**: https://truefi-backend-jcvbmkv5bq-uc.a.run.app/health
- **DB Test**: https://truefi-backend-jcvbmkv5bq-uc.a.run.app/test-db
- **GCP Console**: https://console.cloud.google.com/home/dashboard?project=truefi

---
*Last Updated: September 2025*
*Maintained by: TrueFi Development Team*