/**
 * Comprehensive Onboarding Test Suite
 * Run with: npm run test:onboarding
 */

import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';
import * as crypto from 'crypto';
import * as readline from 'readline';

const prisma = new PrismaClient();
const BASE_URL = process.env.TEST_URL || 'http://localhost:3003';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// Test user configurations
const TEST_USERS = {
  basic: {
    email: 'test_basic@example.com',
    firstName: 'Test',
    lastName: 'Basic',
    scenario: 'Basic onboarding without Plaid'
  },
  plaid: {
    email: 'test_plaid@example.com', 
    firstName: 'Test',
    lastName: 'Plaid',
    scenario: 'Onboarding with Plaid connection'
  },
  skip: {
    email: 'test_skip@example.com',
    firstName: 'Test', 
    lastName: 'Skip',
    scenario: 'Onboarding with skipped steps'
  }
};

// Onboarding flow responses for automated testing
const AUTOMATED_RESPONSES = {
  main_goal: 'understand_finances',
  life_stage: 'working',
  dependents: '0',
  jurisdiction: { country: 'US', state: 'CA' },
  household: { partner_income: 0, shared_expenses: 0, household_net_worth: 0 },
  plaid_connection: 'skip', // or 'connected' if simulating Plaid
  income_capture: 'manual',
  manual_income: { amount: 5000, frequency: 'monthly' },
  pay_structure: { frequency: 'biweekly', variable_percent: 0 },
  benefits_equity: { has_401k: true, employer_match: 5, has_rsu: false, has_options: false },
  expenses_capture: 'manual',
  manual_expenses: {
    housing: 30,
    food: 15,
    transport: 10,
    utilities: 5,
    insurance: 5,
    healthcare: 5,
    entertainment: 10,
    personal: 10,
    savings: 10
  },
  quick_accounts: {
    savings: 10000,
    investments: 5000,
    property: 0,
    vehicles: 15000,
    credit_cards: 2000,
    student_loans: 0,
    personal_loans: 0,
    mortgage: 0
  },
  debts_detail: {
    mortgage: 0,
    auto_loan: 12000,
    student_loans: 0,
    credit_cards: 2000,
    personal_loan: 0,
    medical_debt: 0,
    other: 0
  },
  housing: 'rent',
  insurance: { selected: ['health', 'auto'], amounts: {} },
  emergency_fund: 3,
  risk_tolerance: 5,
  risk_capacity: { job_stability: 'stable', income_sources: '1', liquid_assets: '3' },
  preferences_values: { selected: ['domestic'], amounts: {} },
  goals_selection: { selected: ['emergency', 'retirement'], amounts: {} }
};

class OnboardingTester {
  private userId: string = '';
  private token: string = '';
  private sessionId: string = '';
  private currentStep: string = '';
  private interactive: boolean = false;
  private rl?: readline.Interface;

  constructor(interactive: boolean = false) {
    this.interactive = interactive;
    if (interactive) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }
  }

  private log(message: string, color: string = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
  }

  private async prompt(question: string): Promise<string> {
    if (!this.interactive || !this.rl) {
      return '';
    }
    return new Promise((resolve) => {
      this.rl!.question(`${colors.cyan}${question}${colors.reset} `, resolve);
    });
  }

  async createTestUser(userConfig: any) {
    this.log(`\n📝 Creating test user: ${userConfig.email}`, colors.bright);
    
    this.userId = crypto.randomUUID();
    const testEmail = `${userConfig.email.split('@')[0]}_${Date.now()}@example.com`;
    
    try {
      await prisma.users.create({
        data: {
          id: this.userId,
          email: testEmail,
          password_hash: 'test_password_hash',
          first_name: userConfig.firstName,
          last_name: userConfig.lastName,
          created_at: new Date(),
          updated_at: new Date(),
          is_active: true,
          is_advisor: false
        }
      });
      
      this.token = Buffer.from(JSON.stringify({
        userId: this.userId,
        user_id: this.userId,
        sub: this.userId,
        first_name: userConfig.firstName,
        email: testEmail,
        iat: Date.now(),
        exp: Date.now() + (24 * 60 * 60 * 1000)
      })).toString('base64');
      
      this.log(`✅ User created: ${this.userId}`, colors.green);
      return true;
    } catch (error) {
      this.log(`❌ Failed to create user: ${error}`, colors.red);
      return false;
    }
  }

  async sendChatMessage(message: string, stepId?: string, componentType?: string, responseValue?: any) {
    const body: any = {
      message,
      sessionId: this.sessionId,
      isOnboarding: true
    };

    if (stepId) {
      body.stepId = stepId;
      body.componentType = componentType;
      body.componentResponse = responseValue;
    }

    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Chat API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  async processStep(step: string, component: any) {
    this.log(`\n📍 Step: ${step}`, colors.blue);
    
    if (component?.data?.question) {
      this.log(`   Question: ${component.data.question}`, colors.cyan);
    }

    let response: any;

    if (this.interactive) {
      // Show options and get user input
      if (component?.data?.options) {
        component.data.options.forEach((opt: any, idx: number) => {
          this.log(`   ${idx + 1}. ${opt.label} ${opt.icon || ''}`, colors.yellow);
        });
        
        const choice = await this.prompt('Enter choice number:');
        const optionIdx = parseInt(choice) - 1;
        if (optionIdx >= 0 && optionIdx < component.data.options.length) {
          response = component.data.options[optionIdx].value;
        }
      } else if (component?.type === 'slider') {
        const value = await this.prompt(`Enter value (${component.data.min}-${component.data.max}):`);
        response = parseInt(value);
      } else if (component?.type === 'form') {
        response = {};
        for (const field of component.data.fields || []) {
          const value = await this.prompt(`${field.label}:`);
          response[field.id] = value;
        }
      } else {
        // Default to automated response
        response = AUTOMATED_RESPONSES[step as keyof typeof AUTOMATED_RESPONSES];
      }
    } else {
      // Use automated responses
      response = AUTOMATED_RESPONSES[step as keyof typeof AUTOMATED_RESPONSES];
    }

    if (response === undefined) {
      this.log(`   ⏭️  Skipping step`, colors.yellow);
      response = '__skip__';
    }

    // Send response to chat API
    const result = await this.sendChatMessage(
      `[Component Response: ${component?.type}:${step}] ${JSON.stringify(response)}`,
      step,
      component?.type,
      response
    );

    if (result.component) {
      this.currentStep = result.onboardingProgress?.currentStep || step;
      this.log(`   ✅ Response accepted, next step: ${this.currentStep}`, colors.green);
    }

    return result;
  }

  async runOnboarding() {
    this.log('\n🚀 Starting onboarding flow...', colors.bright);
    
    // Initialize onboarding
    let response = await this.sendChatMessage('Start onboarding');
    
    if (!response.sessionId) {
      this.sessionId = `test_session_${Date.now()}`;
    } else {
      this.sessionId = response.sessionId;
    }

    let stepCount = 0;
    const maxSteps = 30;

    while (response.component && stepCount < maxSteps) {
      const step = response.onboardingProgress?.currentStep || this.currentStep;
      
      // Process the current step
      response = await this.processStep(step, response.component);
      
      // Check if onboarding is complete
      if (response.onboardingProgress?.isComplete || response.onboardingProgress?.currentStep === 'complete') {
        this.log('\n🎉 Onboarding completed successfully!', colors.green);
        break;
      }

      stepCount++;
    }

    if (stepCount >= maxSteps) {
      this.log('\n⚠️ Reached maximum steps limit', colors.yellow);
    }

    // Show final progress
    if (response.onboardingProgress) {
      this.log(`\n📊 Final Progress: ${response.onboardingProgress.percent}%`, colors.magenta);
      this.log(`   Items collected: ${response.onboardingProgress.itemsCollected}`, colors.magenta);
    }
  }

  async cleanup() {
    this.log('\n🧹 Cleaning up test data...', colors.yellow);
    
    try {
      await prisma.user_onboarding_responses.deleteMany({ where: { user_id: this.userId } });
      await prisma.onboarding_progress.deleteMany({ where: { user_id: this.userId } });
      await prisma.chat_sessions.deleteMany({ where: { user_id: this.userId } });
      await prisma.chat_messages.deleteMany({ where: { user_id: this.userId } });
      await prisma.users.delete({ where: { id: this.userId } });
      
      this.log('✅ Cleanup complete', colors.green);
    } catch (error) {
      this.log(`⚠️ Cleanup error: ${error}`, colors.yellow);
    }
    
    if (this.rl) {
      this.rl.close();
    }
    
    await prisma.$disconnect();
  }

  async testOnboardingV2() {
    this.log('\n🔬 Testing Onboarding V2 API directly...', colors.bright);
    
    // Test V2 initialization
    const v2Response = await fetch(`${BASE_URL}/api/onboarding/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({
        action: 'initialize',
        userId: this.userId
      })
    });

    if (v2Response.ok) {
      const data = await v2Response.json();
      this.log(`✅ V2 API initialized: ${data.state?.currentStep}`, colors.green);
      
      // Test submitting a step
      const submitResponse = await fetch(`${BASE_URL}/api/onboarding/v2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          action: 'submit',
          userId: this.userId,
          stepId: data.state?.currentStep,
          instanceId: data.state?.currentInstance?.instanceId,
          nonce: data.state?.currentInstance?.nonce,
          payload: { selection: 'understand_finances' }
        })
      });

      if (submitResponse.ok) {
        const submitData = await submitResponse.json();
        this.log(`✅ V2 step submitted, next: ${submitData.currentStep}`, colors.green);
      } else {
        this.log(`❌ V2 submit failed: ${submitResponse.status}`, colors.red);
      }
    } else {
      this.log(`❌ V2 initialization failed: ${v2Response.status}`, colors.red);
    }
  }
}

// Main test runner
async function runTests() {
  const args = process.argv.slice(2);
  const interactive = args.includes('--interactive') || args.includes('-i');
  const testV2 = args.includes('--v2');
  const quick = args.includes('--quick');
  
  console.log(`${colors.bright}${colors.magenta}
╔══════════════════════════════════════╗
║   TrueFi Onboarding Test Suite      ║
╚══════════════════════════════════════╝
${colors.reset}`);

  if (interactive) {
    console.log(`${colors.cyan}Running in INTERACTIVE mode${colors.reset}`);
  } else {
    console.log(`${colors.yellow}Running in AUTOMATED mode${colors.reset}`);
  }

  const tester = new OnboardingTester(interactive);
  
  try {
    // Create test user
    const userConfig = quick ? TEST_USERS.basic : TEST_USERS.plaid;
    await tester.createTestUser(userConfig);
    
    // Run tests
    if (testV2) {
      await tester.testOnboardingV2();
    } else {
      await tester.runOnboarding();
    }
    
    console.log(`\n${colors.green}${colors.bright}✅ All tests completed successfully!${colors.reset}`);
    
  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}❌ Test failed:${colors.reset}`, error);
  } finally {
    await tester.cleanup();
  }
}

// Run tests
runTests().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});