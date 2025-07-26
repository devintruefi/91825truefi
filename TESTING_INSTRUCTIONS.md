# 🧪 TrueFi Chatbot Testing Instructions

This guide will help you test all the new hybrid chatbot functionality to ensure everything is working correctly.

## 📋 Prerequisites

Before running tests, make sure you have:

1. **Environment Variables Set** in your `.env` file:
   ```env
   DATABASE_URL=your_postgresql_connection_string
   JWT_SECRET=your-secure-secret-key
   OPENAI_API_KEY=your_openai_api_key
   ```

2. **Services Running**:
   - Next.js frontend: `npm run dev` (port 3000)
   - FastAPI backend: `cd TRUEFIBACKEND && uvicorn main:app --reload` (port 8000)

## 🚀 Quick Start Testing

### Option 1: Automated Comprehensive Testing

Run the comprehensive test suite:

```bash
python run_comprehensive_tests.py
```

This will:
- ✅ Check if all services are running
- ✅ Find a suitable test user in your database
- ✅ Test backend functionality
- ✅ Test frontend integration
- ✅ Provide detailed results and next steps

### Option 2: Step-by-Step Testing

#### Step 1: Find a Test User

```bash
cd TRUEFIBACKEND
python find_test_user.py
```

This will show you available users with financial data. Update the `TEST_USER_ID` in `test_backend.py` with a real user ID.

#### Step 2: Test Backend Only

```bash
cd TRUEFIBACKEND
python test_backend.py
```

This tests:
- Database connection
- FastAPI server health
- JWT authentication
- Chat functionality with 5 financial questions
- AI response quality
- Session analysis
- Database writes

#### Step 3: Test Frontend Integration

1. Open `TRUEFIBACKEND/test_frontend.html` in your browser
2. Check the browser console for test results
3. Or run manually in browser console: `window.runFrontendTests()`

## 🔍 Manual Testing

### Test 1: Unauthenticated User (Alex Profile)

1. Visit `http://localhost:3000/chat`
2. Don't log in
3. Ask: "What's my current financial situation?"
4. **Expected**: Response about Alex's finances with streaming text

### Test 2: Authenticated User (Real Data)

1. Log in with a real user account
2. Visit `http://localhost:3000/chat`
3. Ask: "What's my current financial situation?"
4. **Expected**: Response with your real financial data
5. Ask: "Show me a chart of my spending"
6. **Expected**: Response with chart data in `<chart>` tags

### Test 3: Session Analysis

1. As an authenticated user, have a conversation with several messages
2. Click the "📊 End Session & Analyze" button
3. **Expected**: Summary message appears with insights and analysis

## 📊 What to Look For

### Backend Tests Should Show:

```
✅ Database Connection: PASS
✅ FastAPI Health: PASS
✅ JWT Authentication: PASS
✅ Chat Functionality: PASS
✅ AI Response Quality: PASS
✅ Session Analysis: PASS
✅ Database Writes: PASS
```

### AI Responses Should Include:

- **LaTeX Math**: `$ROI = \frac{(Final - Initial)}{Initial} \times 100\%$`
- **Markdown Tables**: `| Category | Amount |`
- **Chart Tags**: `<chart type="line" title="...">`
- **Emoji Headers**: 💡, 📊, 📈, ✅, 💬, 🔁, 🧭
- **Financial Terms**: account, balance, budget, goal, investment, savings

### Database Should Contain:

- `chat_sessions` table: Session records
- `chat_messages` table: Individual messages
- `chat_session_analyses` table: Session analysis results
- `financial_insights` table: Generated insights

## 🐛 Troubleshooting

### Common Issues:

1. **"FastAPI server not accessible"**
   - Make sure FastAPI is running: `cd TRUEFIBACKEND && uvicorn main:app --reload`

2. **"Database connection failed"**
   - Check your `DATABASE_URL` in `.env`
   - Ensure PostgreSQL is running

3. **"JWT authentication failed"**
   - Check your `JWT_SECRET` in `.env`
   - Ensure it matches between frontend and backend

4. **"No test user found"**
   - Run `python find_test_user.py` to see available users
   - Update `TEST_USER_ID` in `test_backend.py`

5. **"AI responses not formatted correctly"**
   - Check your `OPENAI_API_KEY` is valid
   - Ensure the system prompt is being used correctly

### Debug Commands:

```bash
# Check if services are running
curl http://localhost:3000
curl http://localhost:8000/docs

# Check database connection
cd TRUEFIBACKEND
python -c "import psycopg2; print(psycopg2.connect('$DATABASE_URL'))"

# Test FastAPI directly
curl -X POST "http://localhost:8000/chat" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "session_id": "test"}'
```

## 📈 Expected Test Results

### Successful Test Run Should Show:

```
🎉 All tests passed! The chatbot backend is working correctly.

✅ Database Connection: PASS
✅ FastAPI Health: PASS  
✅ JWT Authentication: PASS
✅ Chat Functionality: PASS
✅ AI Response Quality: PASS
✅ Session Analysis: PASS
✅ Database Writes: PASS
```

### Sample AI Response Quality Check:

```
AI Response Quality Checks:
  ✅ LaTeX Math
  ✅ Markdown Tables
  ✅ Chart Tags
  ✅ Emoji Headers
  ✅ Bold Text
  ✅ Financial Terms
```

## 🎯 Next Steps After Testing

1. **If all tests pass**: Your hybrid chatbot is ready for production use!
2. **If some tests fail**: Check the troubleshooting section above
3. **For production**: Consider adding more comprehensive error handling and monitoring

## 📝 Test Data Cleanup

After testing, you may want to clean up test data:

```sql
-- Remove test sessions (replace with actual session IDs)
DELETE FROM chat_sessions WHERE session_id LIKE 'test-session-%';
DELETE FROM chat_messages WHERE session_id LIKE 'test-session-%';
DELETE FROM chat_session_analyses WHERE session_id LIKE 'test-session-%';
DELETE FROM financial_insights WHERE user_id = 'demo-user-id';
```

---

**Need help?** Check the logs in your terminal for detailed error messages and refer to the troubleshooting section above. 