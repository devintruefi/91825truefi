import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const prisma = new PrismaClient();

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Plaid connection
    const plaidConnection = await prisma.plaid_connections.findFirst({
      where: {
        user_id: user.id,
        is_active: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    if (!plaidConnection) {
      return NextResponse.json({ 
        accounts: [],
        message: 'No connected accounts found' 
      });
    }

    // Fetch accounts from Plaid
    try {
      const accountsResponse = await plaidClient.accountsGet({
        access_token: plaidConnection.plaid_access_token,
      });

      const accounts = accountsResponse.data.accounts.map(account => ({
        id: account.account_id,
        name: account.name,
        type: account.type,
        subtype: account.subtype,
        mask: account.mask,
        balances: {
          available: account.balances.available,
          current: account.balances.current,
          limit: account.balances.limit,
          currency: account.balances.iso_currency_code || 'USD'
        }
      }));

      // Also get accounts from database for additional info
      const dbAccounts = await prisma.accounts.findMany({
        where: {
          user_id: user.id,
          is_active: true
        }
      });

      // Merge Plaid data with database data
      const mergedAccounts = accounts.map(plaidAccount => {
        const dbAccount = dbAccounts.find(
          db => db.plaid_account_id === plaidAccount.id
        );
        
        return {
          ...plaidAccount,
          institution_name: dbAccount?.institution_name || plaidConnection.institution_name,
          is_active: dbAccount?.is_active !== false
        };
      });

      return NextResponse.json({ 
        accounts: mergedAccounts,
        total_accounts: mergedAccounts.length,
        last_sync: plaidConnection.last_sync_at
      });

    } catch (plaidError: any) {
      console.error('Plaid API error:', plaidError);
      
      // Fall back to database accounts if Plaid fails
      const dbAccounts = await prisma.accounts.findMany({
        where: {
          user_id: user.id,
          is_active: true
        },
        orderBy: {
          created_at: 'desc'
        }
      });

      return NextResponse.json({
        accounts: dbAccounts.map(account => ({
          id: account.plaid_account_id,
          name: account.name,
          type: account.type,
          subtype: account.subtype,
          mask: account.mask,
          institution_name: account.institution_name,
          balances: {
            current: Number(account.balance || 0),
            available: Number(account.available_balance || 0),
            limit: Number(account.limit_amount || 0),
            currency: account.currency || 'USD'
          }
        })),
        total_accounts: dbAccounts.length,
        from_cache: true
      });
    }

  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}