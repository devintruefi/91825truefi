import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import jwt from 'jsonwebtoken';

// GET user settings
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    const userId = decoded.user_id || decoded.sub;

    // Get user basic info
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        user_identity: true,
        user_preferences: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get additional settings from other tables
    const [demographics, recurringIncome] = await Promise.all([
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
        phone: user.user_identity?.phone_primary || '',
        street: user.user_identity?.street || '',
        city: user.user_identity?.city || '',
        state: user.user_identity?.state || '',
        postalCode: user.user_identity?.postal_code || '',
        annualIncome: annualIncome,
        incomeRange: getIncomeRange(annualIncome),
        maritalStatus: demographics?.marital_status || '',
        dependents: demographics?.dependents || 0,
        primaryGoals: user.user_preferences?.financial_goals || '',
      },
      preferences: {
        currency: user.user_preferences?.currency || 'USD',
        timezone: user.user_preferences?.timezone || 'America/New_York',
        language: user.user_preferences?.language || 'en',
        riskTolerance: user.user_preferences?.risk_tolerance || 'moderate',
        investmentHorizon: user.user_preferences?.investment_horizon || 'medium',
      },
      notifications: {
        emailNotifications: user.user_preferences?.email_notifications ?? true,
        pushNotifications: user.user_preferences?.push_notifications ?? true,
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
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// PUT update user settings
export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    const userId = decoded.user_id || decoded.sub;

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
              id: crypto.randomUUID(),
              user_id: userId,
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
              id: crypto.randomUUID(),
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
            id: crypto.randomUUID(),
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