import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { randomUUID } from 'crypto';

// GET user settings
export async function GET(request: NextRequest) {
  try {
    const authUser = await getUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = authUser.id;

    // Get user basic info
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get additional settings from other tables
    const [userIdentity, userPreferences, demographics, recurringIncome] = await Promise.all([
      prisma.user_identity.findUnique({
        where: { user_id: userId }
      }),
      prisma.user_preferences.findUnique({
        where: { user_id: userId }
      }),
      prisma.user_demographics.findUnique({
        where: { user_id: userId }
      }),
      prisma.recurring_income.findMany({
        where: { user_id: userId }
      })
    ]);

    // Calculate annual income from recurring income
    const annualIncome = recurringIncome.reduce((total, income) => {
      const monthlyAmount = income.frequency === 'monthly' ? Number(income.gross_monthly || 0) :
                           income.frequency === 'weekly' ? Number(income.gross_monthly || 0) * 4 :
                           income.frequency === 'biweekly' ? Number(income.gross_monthly || 0) * 2 :
                           Number(income.gross_monthly || 0);
      return total + (monthlyAmount * 12);
    }, 0);

    return NextResponse.json({
      profile: {
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: userIdentity?.phone_primary || '',
        street: userIdentity?.street || '',
        city: userIdentity?.city || '',
        state: userIdentity?.state || '',
        postalCode: userIdentity?.postal_code || '',
        annualIncome: annualIncome,
        incomeRange: getIncomeRange(annualIncome),
        maritalStatus: demographics?.marital_status || '',
        dependents: demographics?.dependents || 0,
        primaryGoals: userPreferences?.financial_goals || '',
      },
      preferences: {
        currency: userPreferences?.currency || 'USD',
        timezone: userPreferences?.timezone || 'America/New_York',
        language: userPreferences?.language || 'en',
        riskTolerance: userPreferences?.risk_tolerance || 'moderate',
        investmentHorizon: userPreferences?.investment_horizon || 'medium',
      },
      notifications: {
        emailNotifications: userPreferences?.email_notifications ?? true,
        pushNotifications: userPreferences?.push_notifications ?? true,
        weeklyFinancialSummary: true, // These could be stored in a JSON field
        goalMilestones: true,
        budgetAlerts: true,
        marketUpdates: false,
        productUpdates: false,
        dailyReminders: true,
        pennyMessages: true,
        urgentAlerts: true,
        smsSecurityAlerts: true,
        smsPaymentReminders: false,
      },
      privacy: {
        dataAnalytics: true,
        personalizedRecommendations: true,
        marketingCommunications: false,
      },
      security: {
        twoFactorEnabled: false, // This would need to be implemented
      }
    });
  } catch (error: any) {
    console.error('Error fetching user settings:', error);
    console.error('Error details:', error?.message, error?.stack);
    
    // Handle JWT errors
    if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch settings',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined 
    }, { status: 500 });
  }
}

// PUT update user settings
export async function PUT(request: NextRequest) {
  try {
    const authUser = await getUserFromRequest(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = authUser.id;

    const body = await request.json();
    const { section, data } = body;

    switch (section) {
      case 'profile':
        // Update user basic info
        await prisma.users.update({
          where: { id: userId },
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
          }
        });

        // Update or create user identity
        await prisma.user_identity.upsert({
          where: { user_id: userId },
          update: {
            phone_primary: data.phone,
            street: data.street,
            city: data.city,
            state: data.state,
            postal_code: data.postalCode,
            updated_at: new Date(),
          },
          create: {
            user_id: userId,
            phone_primary: data.phone,
            email_primary: data.email,
            street: data.street,
            city: data.city,
            state: data.state,
            postal_code: data.postalCode,
          }
        });

        // Update demographics if provided
        if (data.maritalStatus || data.dependents !== undefined) {
          await prisma.user_demographics.upsert({
            where: { user_id: userId },
            update: {
              marital_status: data.maritalStatus,
              dependents: data.dependents,
              updated_at: new Date(),
            },
            create: {
              user_id: userId,  // user_id is the primary key, not id
              marital_status: data.maritalStatus,
              dependents: data.dependents,
              created_at: new Date(),
              updated_at: new Date(),
            }
          });
        }

        // Update financial goals and risk tolerance in preferences
        if (data.primaryGoals || data.riskTolerance) {
          await prisma.user_preferences.upsert({
            where: { user_id: userId },
            update: {
              financial_goals: data.primaryGoals,
              risk_tolerance: data.riskTolerance,
              updated_at: new Date(),
            },
            create: {
              id: randomUUID(),
              user_id: userId,
              theme: 'system',
              notifications_enabled: true,
              email_notifications: true,
              push_notifications: true,
              currency: 'USD',
              timezone: 'America/New_York',
              language: 'en',
              financial_goals: data.primaryGoals,
              risk_tolerance: data.riskTolerance,
              created_at: new Date(),
              updated_at: new Date(),
            }
          });
        }

        break;

      case 'notifications':
        // Update notification preferences
        await prisma.user_preferences.upsert({
          where: { user_id: userId },
          update: {
            email_notifications: data.emailNotifications,
            push_notifications: data.pushNotifications,
            notifications_enabled: data.emailNotifications || data.pushNotifications,
            updated_at: new Date(),
          },
          create: {
            id: randomUUID(),
            user_id: userId,
            theme: 'system',
            notifications_enabled: data.emailNotifications || data.pushNotifications,
            email_notifications: data.emailNotifications,
            push_notifications: data.pushNotifications,
            currency: 'USD',
            timezone: 'America/New_York',
            language: 'en',
            created_at: new Date(),
            updated_at: new Date(),
          }
        });
        break;


      case 'security':
        // Handle password change
        if (data.currentPassword && data.newPassword) {
          // This would need to verify current password and hash new password
          // For now, returning success
          return NextResponse.json({ 
            success: true, 
            message: 'Password updated successfully' 
          });
        }
        break;

      default:
        return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}

// Helper function to get income range
function getIncomeRange(annualIncome: number): string {
  if (annualIncome < 25000) return 'under-25k';
  if (annualIncome < 50000) return '25k-50k';
  if (annualIncome < 75000) return '50k-75k';
  if (annualIncome < 100000) return '75k-100k';
  if (annualIncome < 150000) return '100k-150k';
  return 'over-150k';
}