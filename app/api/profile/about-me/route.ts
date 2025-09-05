import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import prisma from '@/lib/db'
import crypto from 'crypto'

// GET /api/profile/about-me - Fetch user profile data
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch data from multiple tables
    const [userData, userIdentity, userDemographics, userPreferences, taxProfile] = await Promise.all([
      prisma.users.findUnique({
        where: { id: user.id },
        select: {
          first_name: true,
          last_name: true,
          email: true,
          country_code: true,
          region_code: true,
          currency_preference: true,
          default_checking_buffer: true,
          auto_allocation_enabled: true,
        }
      }),
      prisma.user_identity.findUnique({
        where: { user_id: user.id },
        select: {
          city: true,
          state: true,
          postal_code: true,
        }
      }),
      prisma.user_demographics.findFirst({
        where: { user_id: user.id },
        select: {
          marital_status: true,
          dependents: true,
        }
      }),
      prisma.user_preferences.findFirst({
        where: { user_id: user.id },
        select: {
          risk_tolerance: true,
          investment_horizon: true,
          financial_goals: true,
          currency: true,
          language: true,
          timezone: true,
          notifications_enabled: true,
        }
      }),
      prisma.tax_profile.findUnique({
        where: { user_id: user.id },
        select: {
          filing_status: true,
          state: true,
        }
      })
    ])

    // Parse financial_goals JSONB
    const financialGoals = userPreferences?.financial_goals as any || {}
    
    // Combine all data
    const profileData = {
      // Identity
      first_name: userData?.first_name,
      last_name: userData?.last_name,
      email: userData?.email,
      
      // Location
      country_code: userData?.country_code || 'US',
      region_code: userData?.region_code || userIdentity?.state,
      state: userIdentity?.state,
      city: userIdentity?.city,
      postal_code: userIdentity?.postal_code,
      
      // Personal
      marital_status: userDemographics?.marital_status,
      dependents: userDemographics?.dependents || 0,
      
      // Financial
      risk_tolerance: userPreferences?.risk_tolerance ? 
        (typeof userPreferences.risk_tolerance === 'string' ? 
          parseInt(userPreferences.risk_tolerance) : 
          userPreferences.risk_tolerance) : 5,
      investment_horizon: userPreferences?.investment_horizon,
      emergency_months: financialGoals.emergency_months || 3,
      engagement_frequency: financialGoals.engagement_frequency,
      
      // Tax
      filing_status: taxProfile?.filing_status,
      tax_state: taxProfile?.state,
      
      // Preferences
      currency: userPreferences?.currency || userData?.currency_preference || 'USD',
      language: userPreferences?.language || 'en',
      timezone: userPreferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      
      // Budgeting fields
      pay_schedule: financialGoals.pay_schedule,
      paycheck_day: financialGoals.pay_days?.[0], // Get first day from array
      budget_framework: financialGoals.budget_framework,
      target_savings_percent: financialGoals.target_savings_percent,
      default_checking_buffer: userData?.default_checking_buffer,
      auto_budget_enabled: financialGoals.auto_budget_enabled,
      
      // Debt & Housing fields
      housing_status: financialGoals.housing?.status,
      monthly_housing_payment: financialGoals.housing?.monthly_payment,
      debt_strategy: financialGoals.debt?.strategy,
      extra_payment_target: financialGoals.debt?.extra_payment_target,
      student_loan_status: financialGoals.student_loans?.status,
      prepay_mortgage: financialGoals.mortgage?.prepay_enabled,
      
      // Investing fields
      investing_style: financialGoals.investing_style,
      account_priority: financialGoals.investing?.account_priority,
      dividend_reinvest: financialGoals.investing?.dividend_reinvest,
      rebalance_frequency: financialGoals.investing?.rebalance_frequency,
      rebalance_threshold: financialGoals.investing?.rebalance_threshold_percent,
      auto_allocation_enabled: userData?.auto_allocation_enabled,
      
      // Risk capacity (optional)
      job_stability: financialGoals.riskCapacity?.jobStability,
      income_sources: financialGoals.riskCapacity?.incomeSources,
      liquid_cushion: financialGoals.riskCapacity?.liquidCushion,
      
      // Investing values (optional)
      esg_investing: financialGoals.investing_values?.esg || false,
      crypto_investing: financialGoals.investing_values?.crypto || false,
      real_estate_investing: financialGoals.investing_values?.real_estate || false,
      domestic_only_investing: financialGoals.investing_values?.domestic_only || false,
      
      // Notifications
      notifications_enabled: userPreferences?.notifications_enabled ?? true,
    }

    return NextResponse.json(profileData)
  } catch (error) {
    console.error('Error fetching profile data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile data' },
      { status: 500 }
    )
  }
}

// PUT /api/profile/about-me - Update user profile data
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      console.error('PUT /api/profile/about-me - No user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('PUT /api/profile/about-me - User:', user.id)
    const data = await request.json()
    console.log('PUT /api/profile/about-me - Data received:', JSON.stringify(data, null, 2))

    // Start a transaction to update multiple tables
    const transactionResult = await prisma.$transaction(async (tx) => {
      // Update users table
      if (data.country_code !== undefined || data.region_code !== undefined || 
          data.default_checking_buffer !== undefined || data.auto_allocation_enabled !== undefined ||
          data.first_name !== undefined || data.last_name !== undefined ||
          data.allocation_refresh_frequency !== undefined) {
        const updateData: any = { updated_at: new Date() }
        
        // Only include fields that are defined
        if (data.first_name !== undefined) updateData.first_name = data.first_name
        if (data.last_name !== undefined) updateData.last_name = data.last_name
        if (data.country_code !== undefined) updateData.country_code = data.country_code
        if (data.region_code !== undefined) updateData.region_code = data.region_code
        if (data.currency !== undefined) updateData.currency_preference = data.currency
        if (data.default_checking_buffer !== undefined) updateData.default_checking_buffer = data.default_checking_buffer
        if (data.auto_allocation_enabled !== undefined) updateData.auto_allocation_enabled = data.auto_allocation_enabled
        if (data.allocation_refresh_frequency !== undefined) updateData.allocation_refresh_frequency = data.allocation_refresh_frequency
        
        await tx.users.update({
          where: { id: user.id },
          data: updateData
        })
      }

      // Update or create user_identity
      if (data.state !== undefined || data.city !== undefined || data.postal_code !== undefined) {
        const updateData: any = { updated_at: new Date() }
        if (data.state !== undefined) updateData.state = data.state
        if (data.city !== undefined) updateData.city = data.city
        if (data.postal_code !== undefined) updateData.postal_code = data.postal_code
        
        await tx.user_identity.upsert({
          where: { user_id: user.id },
          update: updateData,
          create: {
            user_id: user.id,
            full_name: (user.first_name || '') + ' ' + (user.last_name || ''),
            email_primary: user.email,
            state: data.state || null,
            city: data.city || null,
            postal_code: data.postal_code || null,
            created_at: new Date(),
            updated_at: new Date(),
          }
        })
      }

      // Update or create user_demographics
      if (data.marital_status !== undefined || data.dependents !== undefined) {
        const updateData: any = { updated_at: new Date() }
        if (data.marital_status !== undefined) updateData.marital_status = data.marital_status
        if (data.dependents !== undefined) updateData.dependents = data.dependents
        
        await tx.user_demographics.upsert({
          where: { 
            user_id: user.id  // user_id is the primary key for user_demographics
          },
          update: updateData,
          create: {
            user_id: user.id,
            marital_status: data.marital_status || null,
            dependents: data.dependents || 0,
            created_at: new Date(),
            updated_at: new Date(),
          }
        })
      }

      // Build financial_goals JSONB
      const financialGoals: any = {}
      
      if (data.emergency_months !== undefined) {
        financialGoals.emergency_months = data.emergency_months
      }
      if (data.engagement_frequency !== undefined) {
        financialGoals.engagement_frequency = data.engagement_frequency
      }
      
      // Budgeting fields
      if (data.pay_schedule !== undefined) {
        financialGoals.pay_schedule = data.pay_schedule
      }
      if (data.paycheck_day !== undefined) {
        financialGoals.pay_days = [data.paycheck_day] // Store as array for flexibility
      }
      if (data.budget_framework !== undefined) {
        financialGoals.budget_framework = data.budget_framework
      }
      if (data.target_savings_percent !== undefined) {
        financialGoals.target_savings_percent = data.target_savings_percent
      }
      if (data.auto_budget_enabled !== undefined) {
        financialGoals.auto_budget_enabled = data.auto_budget_enabled
      }
      
      // Debt & Housing fields
      if (data.housing_status || data.monthly_housing_payment !== undefined) {
        financialGoals.housing = {
          status: data.housing_status,
          monthly_payment: data.monthly_housing_payment
        }
      }
      if (data.debt_strategy || data.extra_payment_target !== undefined) {
        financialGoals.debt = {
          strategy: data.debt_strategy,
          extra_payment_target: data.extra_payment_target
        }
      }
      if (data.student_loan_status !== undefined) {
        financialGoals.student_loans = {
          status: data.student_loan_status
        }
      }
      if (data.prepay_mortgage !== undefined) {
        financialGoals.mortgage = {
          prepay_enabled: data.prepay_mortgage
        }
      }
      
      // Investing fields
      if (data.investing_style !== undefined) {
        financialGoals.investing_style = data.investing_style
      }
      if (data.account_priority !== undefined || data.dividend_reinvest !== undefined || 
          data.rebalance_frequency !== undefined || data.rebalance_threshold !== undefined) {
        financialGoals.investing = {
          ...financialGoals.investing,
          account_priority: data.account_priority,
          dividend_reinvest: data.dividend_reinvest,
          rebalance_frequency: data.rebalance_frequency,
          rebalance_threshold_percent: data.rebalance_threshold
        }
      }
      
      // Risk capacity fields
      if (data.job_stability || data.income_sources || data.liquid_cushion) {
        financialGoals.riskCapacity = {
          jobStability: data.job_stability,
          incomeSources: data.income_sources,
          liquidCushion: data.liquid_cushion,
        }
      }
      
      // Investing values fields
      if (data.esg_investing !== undefined || data.crypto_investing !== undefined || 
          data.real_estate_investing !== undefined || data.domestic_only_investing !== undefined) {
        financialGoals.investing_values = {
          esg: data.esg_investing,
          crypto: data.crypto_investing,
          real_estate: data.real_estate_investing,
          domestic_only: data.domestic_only_investing,
        }
      }
      
      // Advice style
      if (data.advice_style !== undefined) {
        financialGoals.advice_style = data.advice_style
      }
      
      // Upcoming expenses
      if (data.upcoming_expenses !== undefined) {
        financialGoals.upcoming_expenses = data.upcoming_expenses
      }
      
      // Retirement settings
      if (data.retirement !== undefined) {
        financialGoals.retirement = data.retirement
      }

      // Update or create user_preferences
      await tx.user_preferences.upsert({
        where: { 
          user_id: user.id  // user_id has a unique constraint in user_preferences
        },
        update: {
          risk_tolerance: data.risk_tolerance?.toString(),
          investment_horizon: data.investment_horizon,
          financial_goals: financialGoals,
          currency: data.currency,
          language: data.language,
          timezone: data.timezone,
          notifications_enabled: data.notifications_enabled,
          email_notifications: data.notification_channels?.email !== undefined ? data.notification_channels.email : undefined,
          push_notifications: data.notification_channels?.push !== undefined ? data.notification_channels.push : undefined,
          updated_at: new Date(),
        },
        create: {
          id: crypto.randomUUID(),
          user_id: user.id,
          risk_tolerance: data.risk_tolerance?.toString(),
          investment_horizon: data.investment_horizon,
          financial_goals: financialGoals,
          currency: data.currency || 'USD',
          language: data.language || 'en',
          timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          theme: 'light', // Required field
          notifications_enabled: data.notifications_enabled ?? true,
          email_notifications: data.notification_channels?.email ?? true,
          push_notifications: data.notification_channels?.push ?? false,
          created_at: new Date(),
          updated_at: new Date(),
        }
      })

      // Update or create tax_profile
      if (data.filing_status !== undefined || data.tax_state !== undefined) {
        await tx.tax_profile.upsert({
          where: { user_id: user.id },
          update: {
            filing_status: data.filing_status,
            state: data.tax_state,
          },
          create: {
            user_id: user.id,
            filing_status: data.filing_status,
            state: data.tax_state,
          }
        })
      }
      
      return { success: true }
    })

    // Check if About Me is complete
    const aboutMeComplete = Boolean(
      data.country_code &&
      data.region_code &&
      data.state &&
      data.marital_status &&
      data.dependents !== undefined &&
      data.risk_tolerance !== undefined &&
      data.investment_horizon &&
      data.emergency_months !== undefined &&
      data.engagement_frequency &&
      data.filing_status &&
      (data.country_code !== 'US' || data.tax_state)
    )

    return NextResponse.json({
      saved: true,
      aboutMeComplete,
      message: 'Profile updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating profile data:', error)
    console.error('Error stack:', error?.stack)
    console.error('Error type:', error?.constructor?.name)
    
    // Handle Prisma-specific errors
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'A record with this data already exists' },
        { status: 400 }
      )
    }
    
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { error: 'Record to update not found' },
        { status: 404 }
      )
    }
    
    // Log the full error for debugging
    const errorDetails = {
      message: error?.message || 'Unknown error',
      code: error?.code,
      meta: error?.meta,
      clientVersion: error?.clientVersion,
    }
    
    console.error('Error details:', JSON.stringify(errorDetails, null, 2))
    
    return NextResponse.json(
      { 
        error: 'Failed to update profile data',
        details: errorDetails.message,
        code: errorDetails.code,
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}