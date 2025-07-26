import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import { Products, CountryCode } from 'plaid';

export async function POST(req: NextRequest) {
  try {
    const { user_id, user_email } = await req.json();
    if (!user_id || !user_email) {
      return NextResponse.json({ error: 'Missing user_id or user_email' }, { status: 400 });
    }
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user_id },
      client_name: 'TrueFi',
      products: [Products.Auth, Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    });
    return NextResponse.json({ link_token: response.data.link_token });
  } catch (err: any) {
    console.error('Failed to create Plaid link token:', err?.response?.data || err?.message || err);
    return NextResponse.json({ error: 'Failed to create link token' }, { status: 500 });
  }
} 