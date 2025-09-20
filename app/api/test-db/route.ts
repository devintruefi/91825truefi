import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = "public"
      AND table_name = "plaid_connections"
    `;

    return NextResponse.json({
      database: "connected",
      plaid_connections_exists: tables.length > 0,
      tables: tables
    });
  } catch (error: any) {
    console.error("Database test error:", error);
    return NextResponse.json({
      error: error.message,
      code: error.code
    }, { status: 500 });
  }
}
