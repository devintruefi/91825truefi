import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // Optionally, you can process onboarding data here
  return NextResponse.json({ success: true });
} 