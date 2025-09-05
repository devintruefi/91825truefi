import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getUserFromRequest } from '@/lib/auth';
import { plaidClient } from '@/lib/plaid';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.userId;
    if (!userId || userId !== user.id) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Get all Plaid connections for this user
    const plaidConnections = await prisma.plaid_connections.findMany({
      where: {
        user_id: userId,
        is_active: true
      }
    });

    if (plaidConnections.length === 0) {
      return NextResponse.json({ 
        error: "No connected accounts found. Please connect a brokerage account first." 
      }, { status: 400 });
    }

    let totalImported = 0;
    const importedHoldings = [];

    for (const connection of plaidConnections) {
      try {
        // Get accounts for this connection
        const accountsResponse = await plaidClient.accountsGet({ 
          access_token: connection.plaid_access_token 
        });
        
        // Filter for investment accounts
        const investmentAccounts = accountsResponse.data.accounts.filter(account => 
          account.type === 'investment' || 
          account.subtype && ['401k', '403b', '457b', 'ira', 'roth', 'brokerage', 'hsa'].includes(account.subtype)
        );

        for (const account of investmentAccounts) {
          try {
            // Get holdings for this investment account
            const holdingsResponse = await plaidClient.investmentsHoldingsGet({
              access_token: connection.plaid_access_token,
              account_ids: [account.account_id]
            });

            for (const holding of holdingsResponse.data.holdings) {
              const security = holdingsResponse.data.securities.find(
                sec => sec.security_id === holding.security_id
              );

              if (!security) continue;

              // Find or create the account record
              let accountRecord = await prisma.accounts.findFirst({
                where: { 
                  plaid_account_id: account.account_id,
                  user_id: userId
                }
              });

              if (!accountRecord) {
                // Create account record if it doesn't exist
                accountRecord = await prisma.accounts.create({
                  data: {
                    id: crypto.randomUUID(),
                    user_id: userId,
                    name: account.name || 'Investment Account',
                    type: account.type || 'investment',
                    subtype: account.subtype,
                    plaid_account_id: account.account_id,
                    plaid_item_id: connection.plaid_item_id,
                    plaid_connection_id: connection.id,
                    institution_name: account.official_name || 'Investment Broker',
                    balance: parseFloat(account.balances?.current?.toString() || '0'),
                    available_balance: account.balances?.available ? parseFloat(account.balances.available.toString()) : null,
                    currency: account.balances?.iso_currency_code || 'USD',
                    is_active: true,
                    created_at: new Date(),
                    updated_at: new Date()
                  }
                });
              }

              // Create or find security record
              let securityRecord = await prisma.securities.findFirst({
                where: { 
                  ticker: security.ticker_symbol,
                  security_type: security.type
                }
              });

              if (!securityRecord) {
                securityRecord = await prisma.securities.create({
                  data: {
                    name: security.name,
                    ticker: security.ticker_symbol,
                    security_type: security.type,
                    cusip: security.cusip,
                    isin: security.isin,
                    currency: security.iso_currency_code || 'USD',
                    plaid_security_id: security.security_id,
                    created_at: new Date()
                  }
                });
              }

              // Check for existing holding to prevent duplicates
              const existingHolding = await prisma.holdings.findFirst({
                where: {
                  security_id: securityRecord.id,
                  account_id: accountRecord.id
                }
              });

              if (existingHolding) {
                // Update existing holding
                await prisma.holdings.update({
                  where: { id: existingHolding.id },
                  data: {
                    quantity: holding.quantity,
                    institution_price: holding.institution_price,
                    institution_value: holding.institution_value,
                    cost_basis: holding.cost_basis,
                    updated_at: new Date(),
                    institution_price_datetime: new Date(),
                    position_iso_currency_code: holding.iso_currency_code
                  }
                });
              } else {
                // Create new holding
                await prisma.holdings.create({
                  data: {
                    security_id: securityRecord.id,
                    account_id: accountRecord.id,
                    quantity: holding.quantity,
                    institution_price: holding.institution_price,
                    institution_value: holding.institution_value,
                    cost_basis: holding.cost_basis,
                    created_at: new Date(),
                    updated_at: new Date(),
                    institution_price_datetime: new Date(),
                    position_iso_currency_code: holding.iso_currency_code
                  }
                });
                totalImported++;
              }

              importedHoldings.push({
                name: security.name,
                symbol: security.ticker_symbol,
                quantity: holding.quantity,
                value: holding.institution_value
              });
            }
          } catch (holdingsError) {
            console.error(`Failed to import holdings for account ${account.account_id}:`, holdingsError);
            // Continue with other accounts
          }
        }
      } catch (connectionError) {
        console.error(`Failed to process connection ${connection.id}:`, connectionError);
        // Continue with other connections
      }
    }

    // Mark investments onboarding as complete after successful import
    if (totalImported > 0) {
      try {
        await prisma.onboarding_progress.upsert({
          where: { user_id: userId },
          update: {},
          create: { user_id: userId }
        });
        
        const progressData = await prisma.onboarding_progress.findUnique({
          where: { user_id: userId }
        });
        
        if (progressData) {
          const currentData = typeof progressData.data === 'object' ? progressData.data as any : {};
          await prisma.onboarding_progress.update({
            where: { user_id: userId },
            data: {
              data: {
                ...currentData,
                investments_completed: true
              },
              updated_at: new Date()
            }
          });
        }
      } catch (onboardingError) {
        console.error('Failed to update onboarding:', onboardingError);
      }
    }

    return NextResponse.json({
      success: true,
      imported_count: totalImported,
      total_holdings: importedHoldings.length,
      holdings: importedHoldings,
      message: totalImported > 0 
        ? `Successfully imported ${totalImported} new holdings`
        : 'All holdings were already up to date'
    });

  } catch (error) {
    console.error("Error importing Plaid holdings:", error);
    return NextResponse.json(
      { error: "Failed to import holdings", details: error.message || 'Unknown error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}