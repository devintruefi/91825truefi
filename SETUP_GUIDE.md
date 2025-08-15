# TrueFi Project Setup Guide
### To get everything running again after restarting Cursor, follow these steps in order. I'll assume you're in PowerShell or Command Prompt at your project root (C:\Users\Devin Patel\Documents\Projects\truefi-71725). If any command fails, share the error.

If pulled in from github:

Bash Run: pnpm install

then:

cd TRUEFIBACKEND

Run: pip install -r requirements.txt

if it doesnt work then:

pip uninstall uvicorn
cd TRUEFIBACKEND
pip install -r requirements.txt --user

it that doesn't work then install each package individually

pip install fastapi==0.104.1 --user

pip install uvicorn==0.24.0 --user

pip install openai==1.3.7 --user

pip install pydantic==2.5.0 --user

# The others should already be installed

1. Authenticate with Google Cloud (gcloud)
Run:

gcloud auth login

This opens a browser to log in with your Google account (devin@truefi.ai). Follow the prompts and copy the verification code back to the terminal.

Then run (if the command above didn't work):

gcloud auth application-default login

This sets default credentials for the proxy.

2. Start the Cloud SQL Proxy
Open a dedicated terminal (keep it open).
Run:

$env:DATABASE_URL = 'postgresql://truefi_user:truefi.ai101$@127.0.0.1:5433/truefi_app_data?sslmode=disable'
cloud-sql-proxy truefi:us-central1:true-fi-db --port=5433

Confirm it says "Ready for new connections." Don't close this terminal.

3. Set DATABASE_URL in Terminal (for Prisma/Studio)
In your main project terminal:
Run:

$env:DATABASE_URL = 'postgresql://truefi_user:truefi.ai101$@127.0.0.1:5433/truefi_app_data?sslmode=disable'

then turn on prisma:


taskkill /f /im node.exe

npx prisma generate

4. Start Prisma Studio (View DB on Localhost:5555)
In the project terminal:
Run:

npx prisma studio

This opens Prisma Studio in your browser at http://localhost:5555. You can browse tables like 'users', 'transactions', 'accounts', etc. Keep the terminal open; Ctrl+C to stop.

5. # Terminal 1: Start FastAPI backend and run in order:

Run:

cd TRUEFIBACKEND

$env:DATABASE_URL = 'postgresql://truefi_user:truefi.ai101$@127.0.0.1:5433/truefi_app_data?sslmode=disable'

uvicorn main:app --reload --host 0.0.0.0 --port 8080


or 5a. Start the Backend (in TRUEFIBACKEND/)
Open a new terminal and cd to TRUEFIBACKEND/ (C:\Users\Devin Patel\Documents\Projects\truefi-71725\TRUEFIBACKEND).
Run:

6. Start frontend

pnpm dev



starts the: node server.js

Confirm "Backend running on http://localhost:4000." Keep open.
6. Start the Frontend (Next.js)
In the project root terminal:
text


pnpm dev
Opens at http://localhost:3000. Log in, test dashboard/chat/Plaid. Keep open.
Everything should now be connected: Proxy for DB, Prisma Studio for viewing, backend for chatbot, frontend for UI. If issues (e.g., connection refused), check if proxy is running or auth succeeded. Test by visiting /dashboard after login—data should pull from DB. Let me know if working!
## Overview
This guide will help you set up the TrueFi project on a new computer, including the Google Cloud SQL PostgreSQL database, Node.js backend, and frontend with the enhanced Penny chat interface.

## Prerequisites

### 1. Install Node.js and npm
Download and install Node.js from [nodejs.org](https://nodejs.org/) (LTS version recommended)
- Verify installation: `node --version` and `npm --version`

### 2. Install Git
Download and install Git from [git-scm.com](https://git-scm.com/)
- Verify installation: `git --version`

### 3. Install Google Cloud CLI
Download and install gcloud CLI from [cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)

## Project Setup

### 1. Clone the Repository
```bash
git clone https://gitlab.com/truefi-mvp/truefi-app.git
cd truefi-app
```

### 2. Install Dependencies
```bash
npm install
# or if using pnpm
pnpm install
```

### 3. Environment Configuration

Create a `.env.local` file in the project root with the following variables:

```env
# Database Configuration
DB_HOST=127.0.0.1
DB_PORT=5433
DB_NAME=truefi_app_data
DB_USER=truefi_user
DB_PASSWORD=truefi.ai101$

# OpenAI API Key (for Penny chat)
OPENAI_API_KEY=your_openai_api_key_here

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=truefi
GOOGLE_CLOUD_PROJECT_NUMBER=118529284371
```

## Google Cloud Setup

### 1. Authenticate with Google Cloud
```bash
gcloud auth login
# Log in with: devin@truefi.ai

gcloud config set account devin@truefi.ai
gcloud config set project truefi
gcloud auth application-default login
gcloud auth application-default set-quota-project truefi
```

### 2. Verify Cloud SQL Instance
```bash
gcloud sql instances describe true-fi-db --format='value(connectionName)'
# Should return: truefi:us-central1:true-fi-db
```

## Database Connection Setup

### 1. Download Cloud SQL Auth Proxy
Download the proxy executable for Windows:
- URL: https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.17.1/cloud-sql-proxy.x64.exe
- Rename to: `cloud-sql-proxy.exe`
- Place in project root directory

### 2. Start the Database Proxy
Open a new terminal window and run:
```bash
.\cloud-sql-proxy truefi:us-central1:true-fi-db --port=5433
```

Expected output:
```
Authorizing with Application Default Credentials
Listening on 127.0.0.1:5433
The proxy has started successfully
```

**Keep this terminal window open while developing!**

### 3. Test Database Connection
Install PostgreSQL client tools (optional but recommended):
- Download from: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
- Add to PATH: `C:\Program Files\PostgreSQL\17\bin`

Test connection:
```bash
psql -h 127.0.0.1 -p 5433 -U truefi_user -d truefi_app_data
# Enter password: truefi.ai101$
```

## Running the Application

### 1. Start the Development Server
```bash
npm run dev
# or
pnpm dev
``
# Terminal 1: Start FastAPI backend
cd TRUEFIBACKEND
uvicorn main:app --reload --host 0.0.0.0 --port 8080


The application will be available at: http://localhost:3000

### 2. Access the Chat Interface
Navigate to: http://localhost:3000/chat

## Project Structure

```
truefi-app/
├── app/
│   ├── chat/
│   │   └── page.tsx              # Chat page
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # Chat API endpoint
│   └── globals.css               # Global styles
├── components/
│   ├── apple-chat-interface.tsx  # Enhanced Penny chat UI
│   ├── hero-section.tsx          # Homepage hero (buttons removed)
│   └── ui/                       # UI components
├── package.json                  # Dependencies
└── .env.local                    # Environment variables
```

## Enhanced Features

### Penny Chat Interface Improvements
- ✅ ReactMarkdown for robust text rendering
- ✅ KaTeX for mathematical expressions
- ✅ Enhanced table rendering with better styling
- ✅ Interactive charts with Recharts
- ✅ Voice input support (Web Speech API)
- ✅ File upload capability
- ✅ Feedback buttons (thumbs up/down)
- ✅ Copy message functionality
- ✅ Download chat history
- ✅ Smooth animations with Framer Motion
- ✅ Responsive design for mobile/desktop
- ✅ Dark mode support
- ✅ Emoji integration for better UX

### Homepage Updates
- ✅ Removed "Chat with Penny" and "View Dashboard" buttons
- ✅ Enhanced "Get Started" button styling
- ✅ Seamless layout without empty spaces

## Troubleshooting

### Common Issues

1. **Node.js not found**
   - Install Node.js from [nodejs.org](https://nodejs.org/)
   - Restart terminal after installation

2. **Database connection failed**
   - Ensure Cloud SQL Auth Proxy is running
   - Check `.env.local` configuration
   - Verify gcloud authentication

3. **Port 5433 already in use**
   - Change port in proxy command: `--port=5434`
   - Update `.env.local` DB_PORT accordingly

4. **OpenAI API errors**
   - Verify OPENAI_API_KEY in `.env.local`
   - Check API key validity and quota

5. **Build errors**
   - Clear cache: `npm cache clean --force`
   - Delete node_modules and reinstall: `rm -rf node_modules && npm install`

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Type checking
npx tsc --noEmit
```

## Database Schema

The application uses a PostgreSQL database with the following key tables:
- `users` - User accounts and profiles
- `transactions` - Financial transactions
- `accounts` - Bank and investment accounts
- `goals` - Financial goals and targets
- `chat_history` - Penny chat conversations

## API Endpoints

- `POST /api/chat` - Penny chat interface
- `GET /api/user` - User profile data
- `GET /api/transactions` - Transaction history
- `GET /api/accounts` - Account balances
- `GET /api/goals` - Financial goals

## Security Notes

- Database proxy provides secure connection to Cloud SQL
- Environment variables keep sensitive data secure
- API keys should never be committed to version control
- Use HTTPS in production

## Next Steps

1. Set up your OpenAI API key for Penny chat
2. Configure additional environment variables as needed
3. Test the chat interface at `/chat`
4. Explore the dashboard at `/dashboard`
5. Customize the application for your needs

## Support

For issues or questions:
- Check the troubleshooting section above
- Review the console logs for error messages
- Ensure all prerequisites are installed correctly
- Verify Google Cloud authentication and permissions 

---

## **Root Cause:**
- In `EnhancedDashboardContent`, you call:
  ```js
  const data = useFinancialData();
  ```
  **But:**  
  `useFinancialData` expects a `userId` argument:
  ```js
  export function useFinancialData(userId: string | null) { ... }
  ```
  If you call it with no argument, `userId` is `undefined`, so it never fetches real data.

---

## **How to Fix:**
You need to pass the logged-in user’s ID to `useFinancialData`:

### **Edit `EnhancedDashboardContent` like this:**
```tsx
import { useUser } from '@/contexts/user-context';
// ... other imports

export function EnhancedDashboardContent() {
  const { user } = useUser(); // <-- get the user from context
  const { data, loading, error, refresh } = useFinancialData(user?.id || null);
  // ...rest of your code
}
```
- Then use `data` instead of just `data = useFinancialData();` everywhere in the component.

---

## **Summary of What’s Happening:**
- **Not logged in:** Dashboard shows dummy data (correct).
- **Logged in:** Dashboard tries to show real data, but never fetches it because `userId` is missing.

---

## **What to Do Next:**
1. Update `EnhancedDashboardContent` to use the user’s ID as shown above.
2. Save and reload your dashboard.
3. You should now see the real user’s data from the database.

---

Would you like the exact code edit for your file? 

## **Step 1: Check if your backend is running**

First, let's verify that your backend is actually running and accessible. Open a new terminal and run:

```bash
curl http://localhost:8080/health
```

If you get a response like `{"status": "ok", "version": "2.0.0"}`, then your backend is running. If you get a connection refused error, then your backend isn't running.

## **Step 2: Start your backend if it's not running**

If the backend isn't running, navigate to the backend directory and start it:

```bash
cd TRUEFIBACKEND
python main.py
```

You should see output like:
```
INFO:     Started server process [xxxx]
INFO:     Waiting for application startup.
INFO:     Uvicorn running on http://127.0.0.1:8080
```

## **Step 3: Check the browser console for debugging info**

With the debugging logs I added, you should now see detailed information in your browser's developer console when you try the Google OAuth flow. 

1. Open your browser's developer tools (F12)
2. Go to the Console tab
3. Try the Google OAuth flow again
4. Look for the debug messages I added

You should see logs like:
- "OAuth init request received for provider: google"
- "Backend URL: http://localhost:8080"
- "Request body to backend: {...}"
- "Backend response status: ..."

## **Step 4: Check the backend logs**

When you try the OAuth flow, check your backend terminal for any error messages or logs.

## **Step 5: Test the backend endpoint directly**

You can test if the backend OAuth endpoint is working by making a direct request:

```bash
curl -X POST http://localhost:8080/api/auth/oauth/init \
  -H "Content-Type: application/json" \
  -d '{"provider": "google", "redirect_uri": "http://localhost:3000/api/auth/callback/google"}'
```

## **Common Issues and Solutions:**

1. **Backend not running**: Start it with `python main.py` in the TRUEFIBACKEND directory
2. **Port conflict**: Make sure nothing else is using port 8080
3. **Environment variables**: Make sure you have the `.env.local` file with `BACKEND_URL=http://localhost:8080`
4. **Frontend not restarted**: Restart your Next.js dev server after adding environment variables

## **Quick Test:**

Try this in your browser console to test the backend directly:

```javascript
<code_block_to_apply_changes_from>
```

**Please try these steps and let me know:**
1. Is your backend running? (What does `curl http://localhost:8080/health` return?)
2. What do you see in the browser console when you try the Google OAuth flow?
3. What do you see in the backend terminal?

This will help me identify exactly where the issue is occurring. 