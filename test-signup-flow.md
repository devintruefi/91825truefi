# Test Signup to Onboarding Flow

## Setup
1. Clear browser localStorage and cookies
2. Ensure backend is running on http://localhost:8080
3. Ensure frontend is running on http://localhost:3000

## Test Steps

### 1. Sign Up Flow
1. Navigate to http://localhost:3000/auth
2. Click on "Register" tab
3. Fill in the form:
   - First Name: Test
   - Last Name: User
   - Email: testuser@example.com (use a unique email)
   - Password: TestPass123!
   - Confirm Password: TestPass123!
   - Check "I agree to Terms and Conditions"
4. Click "Create Account"

### 2. Expected Behavior
After successful registration:
- User should be automatically logged in
- User data should be stored in localStorage (check with browser dev tools)
- Should redirect to `/chat?onboarding=true`
- Chat interface should show personalized welcome message with user's first name
- Should NOT show "Sample User" message
- Should show onboarding flow questions

### 3. Verify User Context
Open browser console and check:
```javascript
// Check localStorage
localStorage.getItem('current_user_id') // Should be a valid UUID
localStorage.getItem('current_user_data') // Should contain user info
localStorage.getItem('auth_token') // Should have auth token if backend is running
localStorage.getItem('demo_user_id') // Should be null or undefined
```

### 4. Common Issues and Fixes

#### Issue: Still seeing "Sample User"
- Clear all localStorage data
- Hard refresh the page (Ctrl+Shift+R)
- Check that user context is properly loading

#### Issue: Not redirecting to onboarding
- Check browser console for errors
- Verify backend is running and accessible
- Check network tab for failed API calls

#### Issue: User not persisting after refresh
- Check if auth_token is stored in localStorage
- Verify backend /api/auth/validate endpoint is working
- Check CORS configuration on backend

## Cleanup
After testing, clear test data:
```javascript
localStorage.clear()
```