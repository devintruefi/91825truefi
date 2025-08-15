// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import jwt from 'jsonwebtoken';

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
"  - Use $...$ for inline math (e.g., \"The ROI is $ROI = \\\\frac{(Final - Initial)}{Initial} \\\\times 100\\\\%$\")\n" +
"  - Use $$...$$ for display/block math (e.g., \"$$Net\\\\ Gain = Final\\\\ Value - Initial\\\\ Cost$$\")\n" +
"- NEVER output plain text formulas like \"SavingsRate = MonthlySavings / MonthlyIncome * 100\"\n" +
"- NEVER output malformed code blocks with mixed content\n" +
"- ALWAYS use proper LaTeX syntax:\n" +
"  - Fractions: $\\\\frac{numerator}{denominator}$\n" +
"  - Text in math: $\\\\text{Savings Rate}$\n" +
"  - Percentages: $100\\\\%$\n" +
"  - Operators: $\\\\times$, $\\\\div$, $\\\\pm$, $\\\\leq$, $\\\\geq$\n" +
"  - Exponents: $x^2$, $(1 + r)^t$\n" +
"- Examples of CORRECT output:\n" +
"  - \"Your savings rate is $\\\\text{Savings Rate} = \\\\frac{\\\\text{Monthly Savings}}{\\\\text{Monthly Income}} \\\\times 100\\\\%$\"\n" +
"  - \"The compound interest formula is $$A = P(1 + \\\\frac{r}{n})^{nt}$$\"\n" +
"  - \"The ROI formula is $$\\\\text{ROI} = \\\\frac{\\\\text{Final Value} - \\\\text{Initial Value}}{\\\\text{Initial Value}} \\\\times 100\\\\%$$\"\n" +
"- Examples of INCORRECT output:\n" +
"  - \"Savings Rate=Monthly IncomeMonthly Savings*100\" (plain text)\n" +
"  - \"The formula is ROI=(Final-Initial)/Initial*100\" (no delimiters)\n" +
"  - \"```math A-P(1+r/n)nt ```\" (malformed content)\n\n" +
"**STRICT OUTPUT RULES (ENHANCED):**\n" +
"- Always use the sample user's real data for all calculations, tables, and charts. Never use generic numbers if the sample user's data is available.\n" +
"- Output must be clean, readable, and visually structured like ChatGPT:\n" +
"  - Separate paragraphs and sections with clear line breaks and proper sentence spacing.\n" +
"  - Use bold, emoji-labeled section headings for each section (e.g. \"💡 Insight\", \"📊 Table\", \"📈 Chart\", \"�� Recommendation\").\n" +
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
    const isAuthenticated = authHeader?.startsWith('Bearer ');
    
    const { message, conversationHistory, sessionId, endSession } = await request.json();

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

    if (isAuthenticated) {
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
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Prepare conversation history for context
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversationHistory.map((msg: any) => ({
        role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      })),
      { role: 'user' as const, content: message }
    ];

    // Check if client supports streaming
    const acceptHeader = request.headers.get('accept');
    const supportsStreaming = acceptHeader?.includes('text/plain') || acceptHeader?.includes('text/event-stream');

    if (supportsStreaming) {
      // Create streaming response
      const stream = new ReadableStream({
        async start(controller) {
          try {
            console.log('Creating OpenAI completion for unauthenticated user...');
            const completion = await openai.chat.completions.create({
              model: 'gpt-4',
              messages,
              max_tokens: 1800,
              temperature: 0.7,
              presence_penalty: 0.6,
              frequency_penalty: 0.3,
              stream: true,
            });

            for await (const chunk of completion) {
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                controller.enqueue(new TextEncoder().encode(content));
              }
            }
            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            controller.error(error);
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Fallback to regular response
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        max_tokens: 1800,
        temperature: 0.7,
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
      });

      const response = completion.choices[0]?.message?.content;

      if (!response) {
        return NextResponse.json(
          { error: 'Failed to generate response' },
          { status: 500 }
        );
      }

      return NextResponse.json({ response });
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}