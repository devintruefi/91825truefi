// retired: replaced by dashboard-guided onboarding
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

// Sync onboarding state to database
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Chat onboarding has been retired. Please use dashboard-guided onboarding.' },
    { status: 410 }
  );
  /* Retired code below
  try {
    const body = await request.json();
    const { state, version } = body;
    
    if (!state) {
      return NextResponse.json({ error: 'No state provided' }, { status: 400 });
    }
    
    // Get user ID from state or auth token
    let userId = state.userId;
    const authHeader = request.headers.get('authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
        userId = decoded.user_id || decoded.sub || userId;
      } catch (error) {
        // Continue with userId from state
      }
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    
    // Don't save temporary user states to database
    if (userId.startsWith('temp_')) {
      return NextResponse.json({ 
        success: true, 
        message: 'Temporary state not persisted to database' 
      });
    }
    
    // Begin transaction for atomic updates
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update or create onboarding progress
      const progress = await tx.onboarding_progress.upsert({
        where: { user_id: userId },
        update: {
          current_step: state.currentStep,
          is_complete: state.isComplete || false,
          updated_at: new Date()
        },
        create: {
          id: crypto.randomUUID(),
          user_id: userId,
          current_step: state.currentStep,
          is_complete: state.isComplete || false,
          created_at: new Date(),
          updated_at: new Date()
        }
      });
      
      // 2. Save responses to user_onboarding_responses
      const responses = state.responses || {};
      
      // Save each response as a separate record for flexibility
      for (const [question, answer] of Object.entries(responses)) {
        if (answer !== undefined && answer !== null) {
          // Check if response exists
          const existing = await tx.user_onboarding_responses.findFirst({
            where: {
              user_id: userId,
              question: question
            }
          });
          
          if (existing) {
            await tx.user_onboarding_responses.update({
              where: { id: existing.id },
              data: {
                answer: String(answer),
                created_at: new Date()
              }
            });
          } else {
            await tx.user_onboarding_responses.create({
              data: {
                id: crypto.randomUUID(),
                user_id: userId,
                question: question,
                answer: String(answer),
                created_at: new Date()
              }
            });
          }
        }
      }
      
      // 3. Update user preferences based on responses
      if (responses.mainGoal || responses.riskTolerance !== undefined) {
        await tx.user_preferences.upsert({
          where: { user_id: userId },
          update: {
            financial_goals: responses.mainGoal ? JSON.stringify([responses.mainGoal]) : undefined,
            risk_tolerance: responses.riskTolerance ? String(responses.riskTolerance) : undefined,
            investment_horizon: responses.lifeStage === 'retired' ? 'short' :
                               responses.lifeStage === 'student' ? 'long' : 'medium',
            updated_at: new Date()
          },
          create: {
            id: crypto.randomUUID(),
            user_id: userId,
            theme: 'system',
            notifications_enabled: true,
            email_notifications: true,
            push_notifications: true,
            currency: 'USD',
            timezone: 'America/New_York',
            language: 'en',
            financial_goals: responses.mainGoal ? JSON.stringify([responses.mainGoal]) : null,
            risk_tolerance: responses.riskTolerance ? String(responses.riskTolerance) : 'moderate',
            investment_horizon: responses.lifeStage === 'retired' ? 'short' :
                               responses.lifeStage === 'student' ? 'long' : 'medium',
            created_at: new Date(),
            updated_at: new Date()
          }
        });
      }
      
      // 4. Save Plaid connection if present
      if (state.plaidConnection) {
        const plaidData = state.plaidConnection;
        
        // Check if connection exists
        const existingConnection = await tx.plaid_connections.findFirst({
          where: {
            user_id: userId,
            plaid_item_id: plaidData.itemId
          }
        });
        
        if (!existingConnection && plaidData.accessToken) {
          // Create new connection
          const connection = await tx.plaid_connections.create({
            data: {
              id: crypto.randomUUID(),
              user_id: userId,
              plaid_access_token: plaidData.accessToken,
              plaid_item_id: plaidData.itemId,
              plaid_institution_id_text: plaidData.institution.id,
              institution_name: plaidData.institution.name,
              is_active: true,
              last_sync_at: new Date(),
              created_at: new Date(),
              updated_at: new Date()
            }
          });
          
          // Create accounts
          for (const account of plaidData.accounts) {
            await tx.accounts.create({
              data: {
                id: crypto.randomUUID(),
                user_id: userId,
                plaid_account_id: account.id,
                plaid_connection_id: connection.id,
                plaid_item_id: plaidData.itemId,
                name: account.name,
                type: account.type,
                subtype: account.subtype,
                balance: account.balance,
                currency: 'USD',
                institution_name: plaidData.institution.name,
                is_active: true,
                created_at: new Date(),
                updated_at: new Date()
              }
            });
          }
        }
      }
      
      // 5. Save income data if provided
      if (responses.monthlyIncome !== undefined) {
        await tx.recurring_income.upsert({
          where: {
            user_id_source: {
              user_id: userId,
              source: 'Primary Income'
            }
          },
          update: {
            gross_monthly: responses.monthlyIncome,
            updated_at: new Date()
          },
          create: {
            id: crypto.randomUUID(),
            user_id: userId,
            source: 'Primary Income',
            gross_monthly: responses.monthlyIncome,
            frequency: 'monthly',
            next_pay_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            inflation_adj: false,
            created_at: new Date(),
            updated_at: new Date()
          }
        });
      }
      
      return { progress, responseCount: Object.keys(responses).length };
    });
    
    return NextResponse.json({
      success: true,
      message: 'State synchronized successfully',
      progress: result.progress,
      savedResponses: result.responseCount
    });
    
  } catch (error: any) {
    console.error('Error syncing onboarding state:', error);
    
    // Handle specific database errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate data detected', details: error.meta },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to sync state', details: error.message },
      { status: 500 }
    );
  }
  */
}