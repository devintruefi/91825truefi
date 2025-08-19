// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import jwt from 'jsonwebtoken';
import { 
  ONBOARDING_STEPS, 
  getNextStep, 
  getStepComponent,
  getContextualResponse,
  getMilestoneMessage
} from '@/lib/onboarding/onboarding-manager';

// Sample User's comprehensive financial profile (for unauthenticated users)
const sampleUserProfile = {
  name: "Sample User",
  monthlyBudget: 7500,
  accounts: {
    "Chase Total Checking": 8450.32,
    "Chase Sapphire Preferred": 2341.67,
    "Ally High Yield Savings": 25000,
    "Fidelity 401(k)": 45230.18,
    "Coinbase Pro": 3420.89,
    "Amex Gold Card": 892.34
  },
  budgetBreakdown: {
    "Housing": { amount: 2200, percentage: 29.3 },
    "Transportation": { amount: 650, percentage: 8.7 },
    "Food & Dining": { amount: 800, percentage: 10.7 },
    "Utilities": { amount: 300, percentage: 4.0 },
    "Healthcare": { amount: 400, percentage: 5.3 },
    "Entertainment": { amount: 350, percentage: 4.7 },
    "Shopping": { amount: 500, percentage: 6.7 },
    "Personal Care": { amount: 200, percentage: 2.7 },
    "Insurance": { amount: 450, percentage: 6.0 },
    "Savings": { amount: 1500, percentage: 20.0 },
    "Miscellaneous": { amount: 150, percentage: 2.0 }
  },
  savingsGoals: {
    "Car Purchase": { target: 30000, current: 21900, monthsRemaining: 8, percentage: 73 },
    "Home Purchase": { target: 109000, current: 109000, monthsRemaining: 0, percentage: 100 },
    "Retirement": { target: 2000000, current: 1500000, yearsRemaining: 15, percentage: 75 }
  },
  investmentPortfolio: {
    totalValue: 187000,
    performance: 12,
    holdings: {
      "Company Stock": { value: 92000, performance: 4.2 },
      "Stocks & ETFs": { value: 30000, performance: 2.5 },
      "401(k)": { value: 20000, performance: 1.5 },
      "Cash Savings": { value: 25000, performance: 0.3 }
    },
    individualStocks: {
      "AAPL": { shares: 25, value: 4648, performance: 2.3 },
      "MSFT": { shares: 18, value: 6819.30, performance: 1.8 },
      "GOOGL": { shares: 12, value: 1710.72, performance: -0.9 },
      "TSLA": { shares: 8, value: 1987.36, performance: 4.2 },
      "AMZN": { shares: 15, value: 2338.35, performance: 0.7 },
      "NVDA": { shares: 6, value: 4334.88, performance: 3.1 },
      "SPY": { shares: 45, value: 21520.35, performance: 1.2 },
      "VTI": { shares: 35, value: 8598.45, performance: 0.8 }
    }
  },
  recentTransactions: [
    { date: "2024-01-15", description: "Whole Foods", category: "Food & Dining", amount: -89.32 },
    { date: "2024-01-15", description: "Salary Deposit", category: "Income", amount: 3200.00 },
    { date: "2024-01-14", description: "Shell Gas", category: "Transportation", amount: -45.67 },
    { date: "2024-01-14", description: "Netflix", category: "Entertainment", amount: -15.99 },
    { date: "2024-01-13", description: "Target", category: "Shopping", amount: -127.84 },
    { date: "2024-01-13", description: "Electric Bill", category: "Utilities", amount: -98.45 },
    { date: "2024-01-12", description: "Starbucks", category: "Food & Dining", amount: -12.75 },
    { date: "2024-01-12", description: "Uber", category: "Transportation", amount: -23.50 },
    { date: "2024-01-11", description: "Amazon", category: "Shopping", amount: -67.99 },
    { date: "2024-01-11", description: "Gym", category: "Healthcare", amount: -49.99 }
  ],
  insights: {
    savings: "Ahead of quarterly target by $2,400 — consider increasing car fund",
    spending: "Dining up 15% — consider meal planning",
    investments: "Emergency fund is strong — increase retirement contribution by $200/month",
    goals: "Reach car goal 3 months sooner by increasing monthly savings by $150"
  }
};

const systemPrompt = "You are Penny, a warm, knowledgeable, emotionally intelligent AI financial advisor for a sample user. You have access to the sample user's full financial data and always use it for all analysis, recommendations, and projections. You remember context between turns unless reset.\n\n" +
"**CRITICAL MATH RENDERING RULES:**\n" +
"- ALL mathematical expressions, formulas, equations, and calculations MUST be wrapped in LaTeX delimiters:\n" +
"  - Use $...$ for inline math (e.g., \"The ROI is $ROI = \\frac{(Final - Initial)}{Initial} \\times 100\\%$\")\n" +
"  - Use $$...$$ for display/block math (e.g., \"$$Net\\ Gain = Final\\ Value - Initial\\ Cost$$\")\n" +
"- NEVER output plain text formulas like \"SavingsRate = MonthlySavings / MonthlyIncome * 100\"\n" +
"- NEVER output malformed code blocks with mixed content\n" +
"- ALWAYS use proper LaTeX syntax:\n" +
"  - Fractions: $\\frac{numerator}{denominator}$\n" +
"  - Text in math: $\\text{Savings Rate}$\n" +
"  - Percentages: $100\\%$\n" +
"  - Operators: $\\times$, $\\div$, $\\pm$, $\\leq$, $\\geq$\n" +
"  - Exponents: $x^2$, $(1 + r)^t$\n" +
"- Examples of CORRECT output:\n" +
"  - \"Your savings rate is $\\text{Savings Rate} = \\frac{\\text{Monthly Savings}}{\\text{Monthly Income}} \\times 100\\%$\"\n" +
"  - \"The compound interest formula is $$A = P(1 + \\frac{r}{n})^{nt}$$\"\n" +
"  - \"The ROI formula is $$\\text{ROI} = \\frac{\\text{Final Value} - \\text{Initial Value}}{\\text{Initial Value}} \\times 100\\%$$\"\n" +
"- Examples of INCORRECT output:\n" +
"  - \"Savings Rate=Monthly IncomeMonthly Savings*100\" (plain text)\n" +
"  - \"The formula is ROI=(Final-Initial)/Initial*100\" (no delimiters)\n" +
"  - \"```math A-P(1+r/n)nt ```\" (malformed content)\n\n" +
"**STRICT OUTPUT RULES (ENHANCED):**\n" +
"- Always use the sample user's real data for all calculations, tables, and charts. Never use generic numbers if the sample user's data is available.\n" +
"- Output must be clean, readable, and visually structured like ChatGPT:\n" +
"  - Separate paragraphs and sections with clear line breaks and proper sentence spacing.\n" +
"  - Use bold, emoji-labeled section headings for each section (e.g. \"💡 Insight\", \"📊 Table\", \"📈 Chart\", \"🚀 Recommendation\").\n" +
"  - Use bullet points and multi-line structure for readability. Avoid dense blocks of text.\n" +
"  - Use **bold** and _italic_ for emphasis (never HTML tags).\n" +
"  - Start every response with the phrase: \"Penny is thinking...\" as a placeholder, but ensure it is replaced entirely by the full response once generated (for streaming/UX purposes).\n\n" +
"- **Tables:**\n" +
"  - Output tables as clean Markdown with | separators and clear headers.\n" +
"  - Example:\n" +
"    | Category | Amount | Percentage |\n" +
"    |----------|--------|------------|\n" +
"    | Housing  | $2200  | 29.3%      |\n" +
"  - Ensure proper alignment, headers, and spacing.\n" +
"  - Use black borders (#000000) in light mode and gray (#4b5563) in dark mode. (The frontend will detect mode and style borders dynamically.)\n\n" +
"- **Charts/Graphs:**\n" +
"  - ALWAYS provide chart data in structured JSON inside <chart> tags.\n" +
"  - For line graphs, use:\n" +
"    <chart type=\"line\" title=\"Savings Growth Over Time\" colors=\"['#0070f3','#10b981']\">[{\"x\": \"Jan\", \"y\": 1000}, {\"x\": \"Feb\", \"y\": 1500}]</chart>\n" +
"  - Use the website's color scheme: primary blue (#0070f3), accent green (#10b981), neutral gray (#6b7280).\n" +
"  - Include clear labels for axes, titles, and data points in the JSON.\n" +
"  - For pie/bar charts, use similar structure and color guidance.\n" +
"  - The frontend will parse and render these using Recharts and next-themes for light/dark mode.\n\n" +
"- For every output, always provide:\n" +
"  - ✅ A clear recommendation\n" +
"  - 💬 The reasoning behind it\n" +
"  - 🔁 A relevant alternative\n" +
"  - 🧭 A follow-up question (e.g. \"Would you like to model a 15-year mortgage instead?\")\n" +
"- Speak directly and supportively to the sample user, never as a system log.\n" +
"- Carry context between turns unless reset.\n\n" +
"**SAMPLE USER'S FINANCIAL PROFILE:**\n" +
JSON.stringify(sampleUserProfile, null, 2) + "\n\n" +
"Always follow these formatting and interaction rules. Use markdown-style tables, **bold** text, _italic_ text, and clear structure. Always use the sample user's real data and speak directly to them. NEVER say you cannot generate graphs - always provide chart data or clear visual descriptions. Make sure all output is theme-aware and ready for frontend rendering as described.";

export async function POST(request: NextRequest) {
  try {
    console.log('Chat API called');
    
    // Check authentication
    const authHeader = request.headers.get('authorization');
    const isAuthenticated = !!(authHeader && authHeader.startsWith('Bearer '));
    
    const { 
      message, 
      conversationHistory, 
      sessionId, 
      endSession,
      isOnboarding = false,
      onboardingPhase = 'welcome',
      onboardingProgress = {}
    } = await request.json();

    if (!message && !endSession) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Handle session end and analysis
    if (endSession && sessionId && isAuthenticated) {
      const token = authHeader!.replace('Bearer ', '');
      
      try {
        // Call FastAPI backend for analysis
        const analysisResponse = await fetch('http://localhost:8080/end-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ session_id: sessionId }),
        });
        
        if (analysisResponse.ok) {
          const analysis = await analysisResponse.json();
          return NextResponse.json(analysis);
        } else {
          console.error('FastAPI end-session error:', analysisResponse.status, await analysisResponse.text());
          throw new Error('Failed to analyze session');
        }
      } catch (error) {
        console.error('Error calling FastAPI end-session:', error);
        return NextResponse.json(
          { error: 'Failed to analyze session' },
          { status: 500 }
        );
      }
    }

    // Handle onboarding mode for authenticated users
    if (isAuthenticated && isOnboarding) {
      console.log('=== ONBOARDING MODE ACTIVE ===');
      console.log('Full request body:', { message, isOnboarding, onboardingProgress });
      console.log('Message:', message);
      console.log('Current step:', onboardingProgress.currentStep);
      console.log('Progress:', onboardingProgress);
      console.log('isOnboarding flag:', isOnboarding);
      
      // Get user info from token
      const token = authHeader!.replace('Bearer ', '');
      let userId = '';
      let userFirstName = 'there';
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
        userId = decoded.user_id || decoded.sub;
        userFirstName = decoded.first_name || 'there';
      } catch (error) {
        console.error('Error decoding token:', error);
      }
      
      // Import comprehensive onboarding manager
      const { OnboardingManager, ONBOARDING_FLOW } = await import('@/lib/onboarding/comprehensive-onboarding');
      
      // Parse component response value from message
      let componentValue = null;
      let isComponentResponse = false;
      if (message.includes('[Component Response:')) {
        isComponentResponse = true;
        const match = message.match(/\[Component Response: [^\]]+\] (.+)/);
        if (match) {
          try {
            componentValue = JSON.parse(match[1]);
          } catch {
            componentValue = match[1];
          }
        }
      }
      
      // Determine current and next steps
      // If currentStep is null and we have completed steps, check if onboarding is done
      let currentStep = onboardingProgress.currentStep;
      if (!currentStep && onboardingProgress.completedSteps?.includes('GOALS_SELECTION')) {
        // Onboarding is already complete
        return NextResponse.json({
          message: `Welcome back, ${userFirstName}! Your onboarding is complete. How can I help you today?`,
          onboardingUpdate: {
            phase: null,
            progress: { ...onboardingProgress, currentStep: null },
            complete: true
          },
          session_id: sessionId
        });
      }
      currentStep = currentStep || 'MAIN_GOAL';
      
      let nextStep = currentStep;
      let responseMessage = '';
      
      // Only advance to next step if this was a component response
      if (isComponentResponse) {
        // User selected something, move to next step
        nextStep = OnboardingManager.getNextStep(currentStep, componentValue, onboardingProgress);
        responseMessage = OnboardingManager.getFollowUp(currentStep, componentValue, userFirstName);
        
        // If user just connected Plaid, analyze their income
        if (currentStep === 'PLAID_CONNECTION' && componentValue?.publicToken) {
          try {
            // Analyze transactions to detect income
            const analysisResponse = await fetch('http://localhost:3000/api/onboarding/analyze-plaid', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                publicToken: componentValue.publicToken,
                metadata: componentValue.metadata,
                accounts: componentValue.metadata?.accounts || []
              })
            });
            
            if (analysisResponse.ok) {
              const analysis = await analysisResponse.json();
              onboardingProgress.detectedIncome = analysis.monthlyIncome || 5000;
              onboardingProgress.monthlyIncome = analysis.monthlyIncome || 5000; // Also set monthlyIncome
              onboardingProgress.detectedExpenses = analysis.expenses || {};
              
              // Store detected assets and liabilities
              if (analysis.detectedAssets) {
                onboardingProgress.detectedAssets = analysis.detectedAssets;
                onboardingProgress.totalAssets = analysis.detectedAssets.total;
              }
              if (analysis.detectedLiabilities) {
                onboardingProgress.detectedLiabilities = analysis.detectedLiabilities;
                onboardingProgress.totalLiabilities = analysis.detectedLiabilities.total;
              }
              onboardingProgress.netWorth = analysis.netWorth || 0;
              
              console.log('Full analysis:', analysis);
            }
          } catch (error) {
            console.error('Error analyzing Plaid data:', error);
            // Set default income if analysis fails
            onboardingProgress.detectedIncome = 5000;
            onboardingProgress.monthlyIncome = 5000;
          }
          
          // Move to AUTO_ANALYSIS step
          nextStep = 'AUTO_ANALYSIS';
        }
        
        // Handle income confirmation
        if (currentStep === 'INCOME_CONFIRMATION' || currentStep === 'income_confirmation') {
          if (componentValue === 'confirmed') {
            // User confirmed the detected income
            onboardingProgress.monthlyIncome = onboardingProgress.detectedIncome || 5000;
          } else if (typeof componentValue === 'number') {
            // User provided a different amount
            onboardingProgress.monthlyIncome = componentValue;
          }
        }
        
        // If getNextStep returns null or undefined, try to determine next step
        if (!nextStep) {
          console.log('WARNING: getNextStep returned null, determining next step manually');
          // Fallback logic for main goal selection
          if (currentStep === 'MAIN_GOAL') {
            nextStep = 'LIFE_STAGE';
          }
        }
        
      } else {
        // User typed something - just acknowledge and show the current step again
        responseMessage = "I see you're eager to move forward! Let me guide you through the process step by step. 😊";
        // Keep the current step
        nextStep = currentStep;
      }
      
      // Get the flow step configuration for the next step
      const flowStep = ONBOARDING_FLOW[nextStep as keyof typeof ONBOARDING_FLOW];
      // Always get the component for the current/next step
      let componentToShow = flowStep?.component;
      
      // If we're showing dashboard preview, populate it with actual data
      if (nextStep === 'DASHBOARD_PREVIEW' && componentToShow?.type === 'dashboardPreview') {
        // Try to get account data if user has connected Plaid
        let accountData = { 
          netWorth: 0, 
          monthlyIncome: onboardingProgress.monthlyIncome || onboardingProgress.detectedIncome || 5000, 
          monthlyExpenses: onboardingProgress.monthlyExpenses || 0,
          accounts: 0,
          goals: [],
          savingsRate: 0
        };
        
        if (onboardingProgress.hasConnectedAccounts && userId) {
          try {
            // Fetch user's Plaid account balances
            const accountsResponse = await fetch(`http://localhost:3000/api/plaid/accounts`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (accountsResponse.ok) {
              const accountsData = await accountsResponse.json();
              // Calculate total balance from all accounts
              const totalBalance = accountsData.accounts?.reduce((sum: number, account: any) => {
                return sum + (account.balances?.current || 0);
              }, 0) || 0;
              
              // For credit cards and loans, balances are negative (debts)
              const assets = accountsData.accounts?.filter((acc: any) => 
                acc.type === 'depository' || acc.type === 'investment'
              ).reduce((sum: number, acc: any) => sum + (acc.balances?.current || 0), 0) || 0;
              
              const liabilities = accountsData.accounts?.filter((acc: any) => 
                acc.type === 'credit' || acc.type === 'loan'
              ).reduce((sum: number, acc: any) => sum + Math.abs(acc.balances?.current || 0), 0) || 0;
              
              accountData = {
                netWorth: assets - liabilities,
                monthlyIncome: onboardingProgress.monthlyIncome || onboardingProgress.detectedIncome || 0,
                monthlyExpenses: onboardingProgress.monthlyExpenses || onboardingProgress.detectedExpenses?.total || 
                                (onboardingProgress.monthlyIncome || 0) * 0.7,
                accounts: accountsData.accounts?.length || 0,
                goals: onboardingProgress.selectedGoals?.map((g: string) => ({ 
                  name: g, 
                  progress: Math.floor(Math.random() * 60) + 20 
                })) || []
              };
            }
          } catch (error) {
            console.error('Error fetching account data for preview:', error);
            // Use manual assets/liabilities if available
            if (onboardingProgress.manualAssets || onboardingProgress.manualLiabilities) {
              const totalAssets = Object.values(onboardingProgress.manualAssets || {})
                .reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
              const totalLiabilities = Object.values(onboardingProgress.manualLiabilities || {})
                .reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
              
              accountData.netWorth = totalAssets - totalLiabilities;
            }
          }
        } else if (onboardingProgress.manualAssets || onboardingProgress.manualLiabilities) {
          // Use manual entries if no Plaid connection
          const totalAssets = Object.values(onboardingProgress.manualAssets || {})
            .reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
          const totalLiabilities = Object.values(onboardingProgress.manualLiabilities || {})
            .reduce((sum: number, val: any) => sum + (Number(val) || 0), 0);
          
          accountData.netWorth = totalAssets - totalLiabilities;
          accountData.monthlyExpenses = onboardingProgress.monthlyExpenses || 
                                        (onboardingProgress.monthlyIncome || 0) * 0.7;
        }
        
        // Calculate savings rate
        const income = accountData.monthlyIncome;
        const expenses = accountData.monthlyExpenses;
        accountData.savingsRate = income > 0 ? Math.max(0, ((income - expenses) / income) * 100) : 0;
        
        componentToShow = {
          type: 'dashboardPreview',
          data: accountData
        };
      }
      
      // If we're still on the same step and not a component response, show the current step's component
      if (!isComponentResponse && currentStep === nextStep) {
        const currentFlowStep = ONBOARDING_FLOW[currentStep as keyof typeof ONBOARDING_FLOW];
        componentToShow = currentFlowStep?.component;
      }
      
      console.log('=== COMPONENT DEBUG ===');
      console.log('Current step:', currentStep);
      console.log('Next step:', nextStep);
      console.log('Flow step:', flowStep);
      console.log('Component to show:', componentToShow);
      console.log('Is component response:', isComponentResponse);
      
      // Add the next question/prompt based on the next step
      if (nextStep && nextStep !== 'COMPLETE' && isComponentResponse && flowStep) {
        // Use the message from the flow configuration
        const message = typeof flowStep.message === 'function' 
          ? flowStep.message(userFirstName, onboardingProgress)
          : flowStep.message;
        responseMessage = responseMessage + "\n\n" + message;
        
        // Make sure we set the component for the next step
        if (!componentToShow && flowStep.component) {
          componentToShow = flowStep.component;
        }
      }
      
      // Update progress with the next step
      const updatedProgress = {
        ...onboardingProgress,
        currentStep: nextStep === 'COMPLETE' ? null : nextStep
      };
      
      // Handle completion state - check if we just reached COMPLETE
      if ((nextStep === 'COMPLETE' || nextStep === ONBOARDING_STEPS.COMPLETE || currentStep === 'DASHBOARD_PREVIEW' && isComponentResponse) && isComponentResponse) {
        responseMessage = `🎉 Congratulations ${userFirstName}! You've completed your financial profile setup!\n\nYour personalized dashboard is ready with:\n• ${onboardingProgress.hasConnectedAccounts ? '✅' : '⏳'} Bank accounts connected\n• ✅ Risk profile established\n• ✅ Financial goals identified\n• ${onboardingProgress.monthlyIncome || onboardingProgress.detectedIncome ? '✅' : '⏳'} Income verified\n• ${onboardingProgress.manualAssets ? '✅' : '⏳'} Assets recorded\n• ${onboardingProgress.manualLiabilities ? '✅' : '⏳'} Liabilities tracked\n\nI'm now ready to give you tailored financial advice. You can:\n• 📊 View your full dashboard for detailed insights\n• 💬 Continue chatting with me for financial guidance\n• ⚙️ Update your profile anytime\n\nWhat would you like to explore first?`;
        componentToShow = null;
        nextStep = null; // Clear the next step to prevent looping
        updatedProgress.currentStep = null; // Mark as complete
        
        // Mark onboarding as complete in the database
        try {
          await fetch('http://localhost:3000/api/onboarding/complete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userId, completedAt: new Date() })
          });
        } catch (error) {
          console.error('Error marking onboarding complete:', error);
        }
      }
      
      // If current step is COMPLETE but no component response, we're already done
      if (currentStep === 'COMPLETE' && !isComponentResponse) {
        return NextResponse.json({
          message: `Welcome back, ${userFirstName}! Your onboarding is complete. How can I help you with your financial goals today?`,
          onboardingUpdate: {
            phase: null,
            progress: { ...onboardingProgress, currentStep: null },
            complete: true
          },
          session_id: sessionId
        });
      }
      
      console.log('=== RETURNING ONBOARDING RESPONSE ===');
      console.log('Next step:', nextStep);
      console.log('Component to show:', componentToShow);
      console.log('Response message:', responseMessage);
      
      const finalResponse = {
        message: responseMessage,
        component: componentToShow,  // Always include the component
        onboardingUpdate: {
          phase: nextStep === 'COMPLETE' ? null : nextStep,
          progress: updatedProgress,
          complete: nextStep === 'COMPLETE' || nextStep === ONBOARDING_STEPS.COMPLETE
        },
        session_id: sessionId
      };
      
      console.log('=== FINAL RESPONSE OBJECT ===');
      console.log('Final response:', JSON.stringify(finalResponse, null, 2));
      
      return NextResponse.json(finalResponse);
    }

    // Non-onboarding chat handling
    console.log('=== REGULAR CHAT MODE ===');
    console.log('Why not onboarding? isAuthenticated:', isAuthenticated, 'isOnboarding:', isOnboarding);
    console.log('Full request:', { message, isOnboarding, onboardingProgress });
    
    if (isAuthenticated && !isOnboarding) {
      // Handle authenticated user chat
      const token = authHeader!.replace('Bearer ', '');
      
      try {
        // Call FastAPI backend for authenticated chat
        const chatResponse = await fetch('http://localhost:8080/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            message,
            session_id: sessionId,
            conversation_history: conversationHistory || []
          }),
        });
        
        if (chatResponse.ok) {
          const chatData = await chatResponse.json();
          return NextResponse.json(chatData);
        } else {
          console.error('FastAPI chat error:', chatResponse.status, await chatResponse.text());
          throw new Error('Failed to get chat response from backend');
        }
      } catch (error) {
        console.error('Error calling FastAPI chat:', error);
        return NextResponse.json(
          { error: 'Backend service unavailable' },
          { status: 503 }
        );
      }
    }

    // Handle unauthenticated user (existing Sample User profile logic)
    console.log('Using dummy chatbot for unauthenticated user');
    
    // Use environment variable for API key
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.map((msg: any) => ({
        role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      })),
      { role: 'user' as const, content: message }
    ];

    console.log('Calling OpenAI with messages:', messages.length);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      max_tokens: 1500,
      temperature: 0.7,
      stream: true,
    });

    // Stream the response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });

  } catch (error) {
    console.error('Chat API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'An error occurred processing your request', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}