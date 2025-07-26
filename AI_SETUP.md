# AI Chat Setup Guide

## Overview
Penny is now powered by OpenAI's GPT-4 model to provide real financial advice and wealth management assistance.

## Setup Instructions

### 1. Get OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create an account or sign in
3. Generate a new API key
4. Copy the API key

### 2. Configure Environment Variables

Create a `.env.local` file in your project root with:

```bash
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Customize the AI model (default: gpt-4)
# OPENAI_MODEL=gpt-4-turbo

# Optional: Set maximum tokens for responses (default: 1000)
# OPENAI_MAX_TOKENS=1000
```

### 3. Install Dependencies
```bash
pnpm install
```

### 4. Start Development Server
```bash
pnpm run dev
```

## Features

### Penny's Capabilities
- **Budgeting & Saving**: Create budgets, saving strategies, emergency funds
- **Investment Advice**: Portfolio diversification, risk assessment, retirement planning
- **Debt Management**: Debt payoff strategies, credit score improvement
- **Financial Planning**: Goal setting, retirement planning, tax optimization
- **Market Analysis**: Economic trends, investment opportunities
- **Personal Finance**: Spending habits, financial literacy, money mindset

### Safety Features
- Professional disclaimers included in responses
- Encourages consulting licensed professionals for major decisions
- Risk warnings for investment discussions
- Educational focus on financial literacy

## Deployment

### Vercel Deployment
1. Add your environment variables in Vercel dashboard
2. Connect your GitLab repository
3. Deploy automatically

### Environment Variables for Production
Make sure to add `OPENAI_API_KEY` to your Vercel environment variables.

## Security Notes
- Never commit your `.env.local` file
- API keys are kept secure on the server side
- All AI interactions are logged for monitoring

## Troubleshooting

### Common Issues
1. **"Failed to get response from AI"**: Check your OpenAI API key
2. **Rate limiting**: Upgrade your OpenAI plan if needed
3. **Slow responses**: Consider using a faster model like `gpt-4-turbo`

### Support
If you encounter issues, check:
- OpenAI API status: https://status.openai.com/
- Your API key permissions
- Network connectivity 