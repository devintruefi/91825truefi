import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  // Show what DATABASE_URL Vercel is using (masked for security)
  const dbUrl = process.env.DATABASE_URL || "NOT SET";
  const maskedUrl = dbUrl.replace(/:[^@]+@/, ':****@'); // Hide password

  try {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'plaid_connections'
    `;

    return NextResponse.json({
      status: "success",
      database: "connected",
      database_url: maskedUrl,
      plaid_connections_exists: tables.length > 0,
      tables: tables
    });
  } catch (error: any) {
    console.error("Database test error:", error);

    // More detailed error info
    return NextResponse.json({
      status: "error",
      message: "Database connection failed",
      database_url: maskedUrl,
      error: error.message,
      code: error.code,
      hint: "Make sure DATABASE_URL uses URL-encoded password: Truefi.ai101%24"
    }, { status: 500 });
  }
}
