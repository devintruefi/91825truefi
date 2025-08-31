import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { randomUUID } from 'crypto';
import { detectFinancialProfile } from '@/lib/plaid-detection';
import { plaidSyncAndSuggest, generateTestModeSuggestions } from '@/lib/plaid/sync-and-suggest';

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { public_token } = await req.json();
  
  if (!public_token) {
    return NextResponse.json({ error: 'Missing public_token' }, { status: 400 });
  }
  
  try {
    // Exchange public_token for access_token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({ public_token });
    const access_token = exchangeResponse.data.access_token;
    const item_id = exchangeResponse.data.item_id;

    // Fetch institution info
    const itemResponse = await plaidClient.itemGet({ access_token });
    const institution_id = itemResponse.data.item.institution_id || null;

    // Store in 'plaid_connections' table
    const plaidConnection = await prisma.plaid_connections.create({
      data: {
        id: randomUUID(),
        user_id: user.id,
        plaid_access_token: access_token,
        plaid_item_id: item_id,
        plaid_institution_id_text: institution_id,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Fetch accounts and store in 'accounts' table
    const accountsResponse = await plaidClient.accountsGet({ access_token });
    const accounts = accountsResponse.data.accounts;
    for (const account of accounts) {
      try {
        // Use upsert for idempotent operation
        await prisma.accounts.upsert({
          where: { 
            plaid_account_id: account.account_id 
          },
          update: {
            user_id: user.id,
            name: account.name || 'Linked Account',
            type: account.type || 'unknown',
            subtype: account.subtype || null,
            mask: account.mask || null,
            institution_name: account.official_name || account.name || 'Unknown Institution',
            balance: account.balances?.current || 0,
            available_balance: account.balances?.available || null,
            currency: account.balances?.iso_currency_code || 'USD',
            plaid_item_id: item_id,
            plaid_connection_id: plaidConnection.id,
            is_active: true,
            updated_at: new Date(),
            balances_last_updated: new Date(),
            unofficial_currency_code: account.balances?.unofficial_currency_code || null,
          },
          create: {
            id: randomUUID(),
            user_id: user.id,
            plaid_account_id: account.account_id,
            plaid_item_id: item_id,
            plaid_connection_id: plaidConnection.id,
            name: account.name || 'Linked Account',
            type: account.type || 'unknown',
            subtype: account.subtype || null,
            mask: account.mask || null,
            institution_name: account.official_name || account.name || 'Unknown Institution',
            balance: account.balances?.current || 0,
            available_balance: account.balances?.available || null,
            currency: account.balances?.iso_currency_code || 'USD',
            unofficial_currency_code: account.balances?.unofficial_currency_code || null,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
            balances_last_updated: new Date(),
          }
        });
      } catch (accountError) {
        console.error('Failed to upsert account:', account.account_id, accountError);
        // Continue processing other accounts even if one fails
      }
    }

    // Fetch transactions and store in 'transactions' table
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6); // Get 6 months of data
    
    const transactionsResponse = await plaidClient.transactionsGet({
      access_token,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate,
    });
    const transactions = transactionsResponse.data.transactions;
    
    for (const tx of transactions) {
      // Find the account record for this transaction
      const account = await prisma.accounts.findFirst({
        where: { 
          plaid_account_id: tx.account_id,
          user_id: user.id
        }
      });
      
      if (account) {
        // Check if transaction exists
        const existingTransaction = await prisma.transactions.findFirst({
          where: { plaid_transaction_id: tx.transaction_id }
        });

        if (existingTransaction) {
          // Update existing transaction
          await prisma.transactions.update({
            where: { id: existingTransaction.id },
            data: {
              amount: tx.amount,
              date: new Date(tx.date),
              category: tx.category ? tx.category.join(', ') : null,
              name: tx.name,
              merchant_name: tx.merchant_name,
              pending: tx.pending,
              currency_code: tx.iso_currency_code,
            }
          });
        } else {
          // Create new transaction
          await prisma.transactions.create({
            data: {
              id: randomUUID(),
              user_id: user.id,
              account_id: account.id, // Use the account's UUID, not Plaid account_id
              plaid_transaction_id: tx.transaction_id,
              amount: tx.amount,
              date: new Date(tx.date),
              category: tx.category ? tx.category.join(', ') : null,
              name: tx.name,
              merchant_name: tx.merchant_name,
              pending: tx.pending,
              created_at: new Date(),
              currency_code: tx.iso_currency_code,
            }
          });
        }
      }
    }

    // Auto-detect financial profile from the connected data
    console.log('Starting financial profile detection for user:', user.id);
    const detectedProfile = await detectFinancialProfile(user.id);
    
    console.log('Detected financial profile:', {
      income: detectedProfile.monthlyIncome,
      netWorth: detectedProfile.netWorth,
      expenseCategories: Object.keys(detectedProfile.monthlyExpenses).length,
      budgetSuggestions: Object.keys(detectedProfile.suggestedBudget).length
    });

    // Kick off async sync and suggest
    if (process.env.TEST_MODE === 'true') {
      // In test mode, use deterministic suggestions
      const suggestions = generateTestModeSuggestions();
      // Store them immediately for testing
      const activeSession = await prisma.chat_sessions.findFirst({
        where: {
          user_id: user.id,
          is_active: true
        }
      });
      if (activeSession) {
        await prisma.chat_messages.create({
          data: {
            id: randomUUID(),
            session_id: activeSession.id,
            user_id: user.id,
            message_type: 'system',
            content: 'Test mode suggestions generated',
            rich_content: { suggestions },
            turn_number: 0,
            created_at: new Date()
          }
        });
      }
    } else {
      // Trigger async sync and suggest
      plaidSyncAndSuggest(user.id).catch(err => {
        console.error('Background Plaid sync failed:', err);
      });
    }

    return NextResponse.json({ 
      success: true,
      accounts_count: accounts.length,
      message: `Successfully linked ${accounts.length} accounts`,
      detected: {
        income: detectedProfile.monthlyIncome,
        netWorth: detectedProfile.netWorth,
        hasExpenses: Object.keys(detectedProfile.monthlyExpenses).length > 0,
        hasBudget: Object.keys(detectedProfile.suggestedBudget).length > 0
      }
    });
  } catch (error: any) {
    console.error('PLAID_EXCHANGE_ERROR:', error?.message || error);
    console.error('Error code:', error?.code);
    console.error('Error type:', error?.type);
    
    // More specific error handling
    if (error?.code === 'P2022') {
      return NextResponse.json({ 
        error: 'Database schema mismatch. Please contact support.',
        details: 'Column reference error in database'
      }, { status: 502 });
    }
    
    if (error?.code === 'INVALID_PUBLIC_TOKEN') {
      return NextResponse.json({ 
        error: 'Invalid or expired token. Please try connecting again.' 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to exchange token or fetch data',
      message: error?.message || 'Unknown error occurred'
    }, { status: 500 });
  }
} 