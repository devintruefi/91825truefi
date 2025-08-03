# Onboarding Implementation Guide

## Overview
This document explains how the onboarding system works and how Penny can access user onboarding data.

## Database Schema

### Tables Created
1. **user_onboarding_responses** - Stores individual question responses
   - `id` (auto-increment)
   - `user_id` (UUID, foreign key to users)
   - `question` (text) - The question ID (e.g., "monthly_income")
   - `answer` (text) - The user's response
   - `created_at` (timestamp)

2. **onboarding_progress** - Tracks onboarding completion status
   - `id` (auto-increment)
   - `user_id` (UUID, unique, foreign key to users)
   - `current_step` (text) - Current step in onboarding
   - `is_complete` (boolean) - Whether onboarding is finished
   - `updated_at` (timestamp)

## API Endpoints

### POST /api/onboarding
Saves onboarding responses to the database.

**Request Body:**
```json
{
  "answers": {
    "monthly_income": "5000",
    "monthly_spending": "I spend about $3000 on rent, food, and utilities",
    "debt_situation": "[\"Credit card debt\", \"Student loans\"]",
    // ... all 15 questions
  },
  "userId": "user-uuid-or-demo-user-id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Onboarding responses saved successfully"
}
```

### GET /api/onboarding/[userId]
Retrieves onboarding responses for a user.

**Response:**
```json
{
  "responses": {
    "monthly_income": "5000",
    "monthly_spending": "I spend about $3000 on rent, food, and utilities",
    "debt_situation": "[\"Credit card debt\", \"Student loans\"]",
    // ... all responses
  }
}
```

## Frontend Integration

### Get Started Page
The onboarding flow is implemented in `app/get-started/page.tsx`. When users complete all 15 questions:

1. Answers are collected in the `answers` state
2. `saveOnboardingData()` is called automatically
3. Data is sent to `/api/onboarding`
4. User is redirected to `/chat` or `/auth`

### React Hook
Use the `useOnboardingData` hook to access onboarding data in components:

```typescript
import { useOnboardingData } from '@/hooks/use-onboarding-data';

function MyComponent() {
  const { onboardingData, loading } = useOnboardingData();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      <p>Monthly Income: {onboardingData.monthly_income}</p>
      <p>Life Goals: {onboardingData.life_goals}</p>
    </div>
  );
}
```

## Penny Integration

### Utility Functions
Use the utility functions in `lib/onboarding-utils.ts` to access onboarding data:

```typescript
import { 
  getUserOnboardingData, 
  getOnboardingContextForPenny,
  hasCompletedOnboarding 
} from '@/lib/onboarding-utils';

// Get all onboarding data
const data = await getUserOnboardingData(userId);

// Get structured data for Penny's context
const context = await getOnboardingContextForPenny(userId);

// Check if user completed onboarding
const completed = await hasCompletedOnboarding(userId);
```

### Penny's Context Structure
The `getOnboardingContextForPenny()` function returns structured data:

```typescript
{
  financialSnapshot: {
    monthlyIncome?: string;
    monthlySpending?: string;
    debtSituation?: string;
    savingsInvestments?: string;
    budgetingHabits?: string;
  },
  lifeGoals: {
    lifeGoals?: string;
    retirementTimeline?: string;
    lifeEvents?: string;
    financialIndependence?: string;
    financialFreedomVision?: string;
  },
  personality: {
    moneyVolatilityFeelings?: string;
    adviceStylePreference?: string;
    investmentApproach?: string;
    coachingStyle?: string;
    financialSafety?: string;
  }
}
```

## The 15 Onboarding Questions

1. **monthly_income** - Current income after taxes each month
2. **monthly_spending** - Monthly spending breakdown
3. **debt_situation** - Types of debt (multiselect)
4. **savings_investments** - Current savings and investments
5. **budgeting_habits** - Budgeting approach (radio)
6. **life_goals** - Top 3 financial goals
7. **retirement_timeline** - Retirement preferences (radio)
8. **life_events** - Planned major life events (multiselect)
9. **financial_independence** - Importance of financial independence (slider 1-10)
10. **financial_freedom_vision** - What financial freedom means
11. **money_volatility_feelings** - Reaction to market changes (radio)
12. **advice_style_preference** - Preferred advice style (radio)
13. **investment_approach** - Investment risk tolerance (radio)
14. **coaching_style** - Preferred coaching approach (radio)
15. **financial_safety** - What makes them feel financially secure

## Testing

To test the onboarding system:

1. Navigate to `/get-started`
2. Complete all 15 questions
3. Check the database for saved responses:
   ```sql
   SELECT * FROM user_onboarding_responses WHERE user_id = 'your-user-id';
   SELECT * FROM onboarding_progress WHERE user_id = 'your-user-id';
   ```
4. Test the API endpoint:
   ```bash
   curl -X GET http://localhost:3000/api/onboarding/your-user-id
   ```

## Security Notes

- The system supports both authenticated users and demo users
- Demo users use the ID 'demo-user-id'
- All API endpoints validate user access
- Onboarding data is tied to specific user IDs

## Next Steps for Penny

Your cofounder can now:

1. Use `getOnboardingContextForPenny(userId)` to get structured user data
2. Access specific answers with `getOnboardingAnswer(userId, questionId)`
3. Check completion status with `hasCompletedOnboarding(userId)`
4. Integrate this data into Penny's decision-making process
5. Use the personality data to customize Penny's communication style
6. Reference financial goals and situation for personalized advice 