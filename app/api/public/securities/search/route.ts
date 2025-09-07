import { NextRequest, NextResponse } from 'next/server';
import { getMockSecurities } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toUpperCase() || '';
  const limit = parseInt(searchParams.get('limit') || '8');
  
  // Filter mock securities based on query
  const allSecurities = getMockSecurities();
  const filtered = query 
    ? allSecurities.filter(s => 
        s.symbol.includes(query) || 
        s.name.toUpperCase().includes(query)
      )
    : allSecurities;
  
  // Limit results
  const results = filtered.slice(0, limit);
  
  return NextResponse.json(results);
}