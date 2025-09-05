# Onboarding Test Suite

Easy-to-use testing tools for the TrueFi onboarding flow.

## Quick Start

```bash
# Run automated onboarding test (creates user, runs full flow, cleans up)
npm run test:onboarding

# Run quick test (minimal steps)
npm run test:onboarding:quick

# Run interactive test (you choose responses)
npm run test:onboarding:interactive

# Test V2 API directly
npm run test:onboarding:v2

# Clean up test users
npm run reset:test-users
```

## Test Commands

### 1. Automated Testing (Fastest)
```bash
npm run test:onboarding
```
- Creates a test user automatically
- Runs through entire onboarding with predefined responses
- Shows progress for each step
- Cleans up test data automatically
- Takes ~10 seconds

### 2. Interactive Testing
```bash
npm run test:onboarding:interactive
```
- Creates a test user
- Shows each question and lets you choose responses
- Useful for testing specific paths
- Cleans up automatically when done

### 3. Quick Test
```bash
npm run test:onboarding:quick
```
- Runs minimal onboarding flow
- Skips optional steps
- Good for quick validation

### 4. V2 API Test
```bash
npm run test:onboarding:v2
```
- Tests the V2 onboarding API directly
- Useful for debugging V2-specific issues

## Cleanup Commands

### Remove All Test Users
```bash
npm run reset:test-users
```
Removes all users with:
- Email containing "test_"
- Email ending with "@example.com"
- Email ending with "@truefi.ai"

### Remove Specific User
```bash
npm run reset:user beep@truefi.ai
```
Removes specific user and all their data.

## What Gets Tested

The test suite validates:
1. ✅ User creation and authentication
2. ✅ Each onboarding step transitions correctly
3. ✅ Plaid connection step appears (if applicable)
4. ✅ Risk tolerance saves correctly (string type)
5. ✅ All component types render
6. ✅ Progress tracking works
7. ✅ Completion state is reached
8. ✅ Database cleanup works

## Test Output

```
╔══════════════════════════════════════╗
║   TrueFi Onboarding Test Suite      ║
╚══════════════════════════════════════╝

📝 Creating test user: test_basic@example.com
✅ User created: 7b6433c8-dc74-45c5-bdd7-f36ae805d6c1

🚀 Starting onboarding flow...

📍 Step: main_goal
   Question: What's your main financial goal?
   ✅ Response accepted, next step: life_stage

📍 Step: life_stage
   Question: What's your current life stage?
   ✅ Response accepted, next step: dependents

[... continues through all steps ...]

🎉 Onboarding completed successfully!

📊 Final Progress: 100%
   Items collected: 19

🧹 Cleaning up test data...
✅ Cleanup complete

✅ All tests completed successfully!
```

## Troubleshooting

### Test fails with "connection refused"
Make sure the dev server is running:
```bash
npm run dev
```

### Test user already exists
Clean up existing test users:
```bash
npm run reset:test-users
```

### Need to test with specific email
Edit `TEST_USERS` in `test/test-onboarding-full.ts`

### Want to test different responses
Edit `AUTOMATED_RESPONSES` in `test/test-onboarding-full.ts`

## Advanced Usage

### Custom Test Scenarios
Edit `test/test-onboarding-full.ts` and modify:
- `TEST_USERS` - Different user configurations
- `AUTOMATED_RESPONSES` - Different response paths
- `maxSteps` - Maximum steps before timeout

### Test Specific Steps
Run interactive mode and navigate to the step you want to test:
```bash
npm run test:onboarding:interactive
```

### Debug Mode
Add console logs in the test file or API routes to see detailed flow.

## Benefits

1. **No manual user creation** - Automatically creates and cleans up test users
2. **Consistent testing** - Same responses every time for reliable testing
3. **Fast iteration** - Test full flow in ~10 seconds
4. **Multiple modes** - Automated, interactive, or quick testing
5. **Clean database** - Automatic cleanup prevents test data buildup
6. **Easy debugging** - Clear output shows exactly where issues occur