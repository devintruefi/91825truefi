import { NextResponse } from 'next/server'

export async function GET() {
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD ? 'SET' : 'NOT SET',
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'NOT SET (using /api fallback)',
  }
  
  return NextResponse.json({ 
    status: 'success', 
    environment: envVars,
    message: 'Environment variables check'
  })
} 