import { NextRequest, NextResponse } from 'next/server';
import { plaidClient } from '@/lib/plaid';
import prisma from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const { user_id, public_token, institution_id } = await req.json();
    
    if (!user_id || !public_token) {
      return NextResponse.json({ error: 'Missing user_id or public_token' }, { status: 400 });
    }

    // Exchange public_token for access_token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({ public_token });
    const access_token = exchangeResponse.data.access_token;
    const item_id = exchangeResponse.data.item_id;

    // Fetch institution info
    const itemResponse = await plaidClient.itemGet({ access_token });
    const plaid_institution_id = itemResponse.data.item.institution_id || institution_id;

    // Store in 'plaid_connections' table
    const plaidConnection = await prisma.plaid_connections.create({
      data: {
        id: randomUUID(),
        user_id: user_id,
        plaid_access_token: access_token,
        plaid_item_id: item_id,
        plaid_institution_id_text: plaid_institution_id,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Fetch accounts and store in 'accounts' table
    const accountsResponse = await plaidClient.accountsGet({ access_token });
    const accounts = accountsResponse.data.accounts;
    
    let accountsCount = 0;
    for (const account of accounts) {
      // First check if account exists
      const existingAccount = await prisma.accounts.findFirst({
        where: { plaid_account_id: account.account_id }
      });

      if (existingAccount) {
        // Update existing account
        await prisma.accounts.update({
          where: { id: existingAccount.id },
          data: {
            name: account.name,
            type: account.type,
            subtype: account.subtype,
            mask: account.mask,
            institution_name: account.official_name || account.name,
            balance: account.balances.current,
            available_balance: account.balances.available,
            currency: account.balances.iso_currency_code,
            plaid_item_id: item_id,  // Update plaid_item_id
            plaid_connection_id: plaidConnection.id,  // Link to connection
            is_active: true,
            updated_at: new Date(),
          }
        });
      } else {
        // Create new account
        await prisma.accounts.create({
          data: {
            id: randomUUID(),
            user_id: user_id,
            plaid_account_id: account.account_id,
            plaid_item_id: item_id,  // Include plaid_item_id
            plaid_connection_id: plaidConnection.id,  // Link to connection
            name: account.name,
            type: account.type,
            subtype: account.subtype,
            mask: account.mask,
            institution_name: account.official_name || account.name,
            balance: account.balances.current,
            available_balance: account.balances.available,
            currency: account.balances.iso_currency_code,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          }
        });
      }
      accountsCount++;
    }

    // Fetch transactions and store in 'transactions' table
    const transactionsResponse = await plaidClient.transactionsGet({
      access_token,
      start_date: '2020-01-01',
      end_date: new Date().toISOString().split('T')[0],
    });
    const transactions = transactionsResponse.data.transactions;
    
    for (const tx of transactions) {
      // Find the account record for this transaction
      const account = await prisma.accounts.findFirst({
        where: { 
          plaid_account_id: tx.account_id,
          user_id: user_id 
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
              category: tx.category ? tx.category.join(', ') : undefined,
              name: tx.name,
              merchant_name: tx.merchant_name || undefined,
              pending: tx.pending,
              currency_code: tx.iso_currency_code,
            }
          });
        } else {
          // Create new transaction
          await prisma.transactions.create({
            data: {
              id: randomUUID(),
              user_id: user_id,
              account_id: account.id, // Use the account's UUID, not Plaid account_id
              plaid_transaction_id: tx.transaction_id,
              amount: tx.amount,
              date: new Date(tx.date),
              category: tx.category ? tx.category.join(', ') : undefined,
              name: tx.name,
              merchant_name: tx.merchant_name || undefined,
              pending: tx.pending,
              created_at: new Date(),
              currency_code: tx.iso_currency_code,
            }
          });
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Account linked successfully',
      accounts_count: accountsCount 
    });
  } catch (error) {
    console.error('Plaid link error:', error);
    return NextResponse.json({ 
      error: 'Failed to link account',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 