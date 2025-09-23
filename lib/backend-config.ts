// lib/backend-config.ts
// Centralized backend URL configuration

export function getBackendUrl(): string {
  // In production, use the Cloud Run backend
  if (process.env.NODE_ENV === 'production') {
    return process.env.BACKEND_URL ||
           process.env.NEXT_PUBLIC_BACKEND_URL ||
           'https://truefi-backend-prod-118529284371.us-central1.run.app';
  }

  // In development, use localhost
  return process.env.BACKEND_URL ||
         process.env.NEXT_PUBLIC_BACKEND_URL ||
         'http://localhost:8080';
}