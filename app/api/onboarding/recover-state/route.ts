import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

// Simple type definitions for onboarding state
interface OnboardingState {
  userId: string;
  currentStep: string;
  completedSteps: string[];
  responses: OnboardingResponses;
  createdAt: Date;
  updatedAt: Date;
}

interface OnboardingResponses {
  [key: string]: any;
}

const prisma = new PrismaClient();

// Recover onboarding state from database
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId');
    
    // Get userId from auth token if not provided
    const authHeader = request.headers.get('authorization');
    if (!userId && authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
        userId = decoded.user_id || decoded.sub;
      } catch (error) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    
    // Fetch all onboarding data in parallel
    const [progress, responses, preferences, plaidConnections, accounts, income] = await Promise.all([
      // Get progress
      prisma.onboarding_progress.findUnique({
        where: { user_id: userId }
      }),
      
      // Get all responses
      prisma.user_onboarding_responses.findMany({
        where: { user_id: userId }
      }),
      
      // Get preferences
      prisma.user_preferences.findUnique({
        where: { user_id: userId }
      }),
      
      // Get Plaid connections
      prisma.plaid_connections.findMany({
        where: { user_id: userId, is_active: true }
      }),
      
      // Get accounts
      prisma.accounts.findMany({
        where: { user_id: userId, is_active: true }
      }),
      
      // Get income
      prisma.recurring_income.findMany({
        where: { user_id: userId }
      })
    ]);
    
    if (!progress) {
      return NextResponse.json({ 
        state: null,
        message: 'No onboarding progress found for user' 
      });
    }
    
    // Reconstruct responses object
    const reconstructedResponses: OnboardingResponses = {};
    
    // Map saved responses back to structured format
    responses.forEach(response => {
      switch (response.question) {
        case 'hasConnectedAccounts':
          reconstructedResponses.hasConnectedAccounts = response.answer === 'true';
          break;
        case 'mainGoal':
          reconstructedResponses.mainGoal = response.answer as any;
          break;
        case 'customGoal':
          reconstructedResponses.customGoal = response.answer;
          break;
        case 'lifeStage':
          reconstructedResponses.lifeStage = response.answer as any;
          break;
        case 'maritalStatus':
          reconstructedResponses.maritalStatus = response.answer as any;
          break;
        case 'dependents':
          reconstructedResponses.dependents = parseInt(response.answer) || 0;
          break;
        case 'monthlyIncome':
          reconstructedResponses.monthlyIncome = parseFloat(response.answer) || 0;
          break;
        case 'monthlyExpenses':
          reconstructedResponses.monthlyExpenses = parseFloat(response.answer) || 0;
          break;
        case 'skipPlaidReason':
          reconstructedResponses.skipPlaidReason = response.answer;
          break;
        case 'confirmedData':
          reconstructedResponses.confirmedData = response.answer === 'true';
          break;
        case 'consentToAnalysis':
          reconstructedResponses.consentToAnalysis = response.answer === 'true';
          break;
        default:
          // Store any other responses as-is
          (reconstructedResponses as any)[response.question] = response.answer;
      }
    });
    
    // Add Plaid connection status
    if (plaidConnections.length > 0) {
      reconstructedResponses.hasConnectedAccounts = true;
      reconstructedResponses.plaidAccountIds = accounts
        .filter(a => a.plaid_account_id)
        .map(a => a.plaid_account_id!);
    }
    
    // Add income data if not in responses
    if (!reconstructedResponses.monthlyIncome && income.length > 0) {
      reconstructedResponses.monthlyIncome = income.reduce((sum, inc) => 
        sum + Number(inc.gross_monthly || 0), 0
      );
    }
    
    // Parse completed steps from progress
    const completedSteps = progress.current_step ? 
      getCompletedStepsUpTo(progress.current_step) : [];
    
    // Construct Plaid connection data if available
    let plaidConnectionData = undefined;
    if (plaidConnections.length > 0 && accounts.length > 0) {
      const primaryConnection = plaidConnections[0];
      const connectionAccounts = accounts.filter(a => 
        a.plaid_connection_id === primaryConnection.id
      );
      
      plaidConnectionData = {
        itemId: primaryConnection.plaid_item_id,
        accessToken: primaryConnection.plaid_access_token,
        accounts: connectionAccounts.map(a => ({
          id: a.plaid_account_id || a.id,
          name: a.name || 'Unknown Account',
          type: a.type || 'depository',
          subtype: a.subtype || 'checking',
          balance: Number(a.balance || 0)
        })),
        institution: {
          id: primaryConnection.plaid_institution_id_text || '',
          name: primaryConnection.institution_name || 'Unknown Institution'
        },
        connectedAt: primaryConnection.created_at
      };
    }
    
    // Reconstruct state
    const recoveredState: OnboardingState = {
      userId,
      currentStep: progress.current_step as any || 'connect_accounts',
      completedSteps,
      responses: reconstructedResponses,
      plaidConnection: plaidConnectionData,
      isComplete: progress.is_complete || false,
      sessionId: `recovered_${Date.now()}`,
      createdAt: progress.created_at || new Date(),
      updatedAt: progress.updated_at || new Date()
    };
    
    return NextResponse.json({
      state: recoveredState,
      message: 'State recovered successfully',
      metadata: {
        responseCount: responses.length,
        hasPlaidConnection: plaidConnections.length > 0,
        accountCount: accounts.length
      }
    });
    
  } catch (error: any) {
    console.error('Error recovering onboarding state:', error);
    return NextResponse.json(
      { error: 'Failed to recover state', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to determine completed steps based on current step
function getCompletedStepsUpTo(currentStep: string): string[] {
  const stepOrder = [
    'connect_accounts',
    'main_goal',
    'life_stage',
    'family_context',
    'income_verification',
    'review_confirm',
    'complete'
  ];
  
  const currentIndex = stepOrder.indexOf(currentStep);
  if (currentIndex === -1) return [];
  
  // Return all steps before current as completed
  return stepOrder.slice(0, currentIndex);
}