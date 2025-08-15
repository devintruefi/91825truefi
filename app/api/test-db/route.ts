import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test database connection
    await prisma.$connect()
    
    // Test a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`
    
    return NextResponse.json({ 
      status: 'success', 
      message: 'Database connection successful',
      test: result
    })
  } catch (error) {
    console.error('Database connection test failed:', error)
    return NextResponse.json({ 
      status: 'error', 
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
} 