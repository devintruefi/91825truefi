# Testing Guide: Dynamic Insights and Notifications

## Test Scenarios

### 1. Demo User (Non-authenticated)
- **User ID**: `123e4567-e89b-12d3-a456-426614174000`
- **Expected Behavior**:
  - Shows hardcoded insights in dashboard-content.tsx
  - No API calls to `/api/insights/[userId]`
  - No API calls to `/api/notifications/[userId]`
  - Notifications badge shows 0

### 2. Authenticated Real User
- **User ID**: Any valid UUID except demo user ID
- **Expected Behavior**:
  - Fetches insights from `/api/insights/[userId]`
  - Fetches notifications from `/api/notifications/[userId]`
  - Shows dynamic content from database
  - Notifications badge shows unread count
  - Can mark insights/notifications as read

## How to Test

### Step 1: Test Demo User
1. Login with demo credentials or visit dashboard without auth
2. Navigate to dashboard
3. Open browser DevTools > Network tab
4. Verify NO calls to `/api/insights/` or `/api/notifications/`
5. Verify hardcoded insights are visible:
   - "Food & Dining spending increased 15%..."
   - "You could save an additional $200/month..."
   - "Consider increasing your 401(k) contribution..."

### Step 2: Test Authenticated User
1. Login with real user credentials
2. Navigate to dashboard
3. Open browser DevTools > Network tab
4. Verify API calls:
   - GET `/api/insights/{userId}` - Should return 200
   - GET `/api/notifications/{userId}` - Should return 200
5. Check dynamic content is displayed
6. Click on a notification to mark as read
7. Verify PATCH request to `/api/notifications/{userId}`

### Step 3: Create Test Data
To test with real data, insert test records into the database:

```sql
-- Insert test financial insights for a user
INSERT INTO financial_insights (
  id, user_id, insight_type, title, description, 
  severity, is_read, created_at
) VALUES 
(
  gen_random_uuid(), 
  'YOUR_USER_ID_HERE',
  'spending_alert',
  'Unusual Spending Detected',
  'Your entertainment spending is 40% higher than last month',
  'medium',
  false,
  NOW()
),
(
  gen_random_uuid(),
  'YOUR_USER_ID_HERE', 
  'savings_tip',
  'Savings Opportunity Found',
  'You could save $150/month by switching to a different phone plan',
  'low',
  false,
  NOW()
),
(
  gen_random_uuid(),
  'YOUR_USER_ID_HERE',
  'notification',
  'Account Balance Alert',
  'Your checking account balance is below $500',
  'high',
  false,
  NOW()
);
```

## API Endpoints

### Financial Insights
- **GET** `/api/insights/[userId]` - Fetch unread insights
- **PATCH** `/api/insights/[userId]` - Mark insight as read
  - Body: `{ "insightId": "uuid-here" }`

### Notifications
- **GET** `/api/notifications/[userId]` - Fetch notifications
- **PATCH** `/api/notifications/[userId]` - Mark notification as read
  - Body: `{ "notificationId": "uuid-here" }` or `{ "markAllAsRead": true }`

## Verification Checklist

- [ ] Demo user sees hardcoded insights
- [ ] Demo user makes no API calls
- [ ] Real user sees dynamic insights from database
- [ ] Real user can mark insights as read
- [ ] Real user sees notification count
- [ ] Real user can mark notifications as read
- [ ] Auto-refresh works (5 min for insights, 2 min for notifications)
- [ ] Loading states display correctly
- [ ] Error states handle gracefully
- [ ] No console errors in browser

## Troubleshooting

### No insights showing for real user
1. Check database has records in `financial_insights` table
2. Verify `is_read = false` for test records
3. Check `expires_at` is NULL or future date
4. Verify user_id matches logged-in user

### API returns 404
1. Verify user exists in `users` table
2. Check user ID format is valid UUID
3. Ensure not using demo user ID

### Notifications not updating
1. Check auto-refresh interval (2 minutes)
2. Verify PATCH request succeeds
3. Check database `is_read` field updates