/**
 * Test income detection and budget calculation
 */

import { PrismaClient } from '@prisma/client';
import { detectMonthlyIncomeV2 } from '../lib/income-detection-v2';
import { calculateBudgetV2 } from '../lib/budget-calculator-v2';

const prisma = new PrismaClient();

async function testIncomeAndBudget() {
  console.log('🧪 Testing Income Detection and Budget Calculation\n');
  console.log('═══════════════════════════════════════════════════\n');
  
  const testUserId = 'a1b2c3d4-e5f6-7890-abcd-' + Date.now().toString().slice(-12).padStart(12, '0');
  let budgetUserId = ''; // Declare here for cleanup
  let passed = 0;
  let failed = 0;
  
  try {
    // Test 1: No income detection with no transactions
    console.log('Test 1: No income detection with empty transactions');
    const noIncome = await detectMonthlyIncomeV2(testUserId);
    
    if (noIncome === null) {
      console.log('✅ Correctly returns null for no transactions\n');
      passed++;
    } else {
      console.log('❌ Should return null but got:', noIncome, '\n');
      failed++;
    }
    
    // Test 2: Create mock income transactions
    console.log('Test 2: Creating mock payroll transactions');
    
    // First create a test user in the users table
    await prisma.users.create({
      data: {
        id: testUserId,
        email: 'test@example.com',
        password_hash: 'test_hash_not_used',
        first_name: 'Test',
        last_name: 'User',
        is_active: true,
        is_advisor: false,
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    
    // Create an account for the user
    const accountId = crypto.randomUUID();
    await prisma.accounts.create({
      data: {
        id: accountId,
        user_id: testUserId,
        plaid_account_id: 'test-account-' + Date.now(),
        name: 'Test Checking',
        type: 'depository',
        subtype: 'checking',
        balance: 10000,
        currency: 'USD',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    
    const biweeklyAmount = 2500;
    const dates = [
      new Date('2024-08-15'),
      new Date('2024-08-01'),
      new Date('2024-07-18'),
      new Date('2024-07-04'),
      new Date('2024-06-20'),
      new Date('2024-06-06')
    ];
    
    for (const date of dates) {
      await prisma.transactions.create({
        data: {
          id: crypto.randomUUID(),
          user_id: testUserId,
          account_id: accountId, // Use the created account
          plaid_transaction_id: 'test-' + date.getTime(),
          amount: -biweeklyAmount, // Negative = income in Plaid
          currency_code: 'USD',
          date,
          name: 'EMPLOYER PAYROLL DIRECT DEPOSIT',
          category: 'TRANSFER',
          pending: false,
          created_at: new Date()
        }
      });
    }
    console.log('✅ Created 6 biweekly payroll transactions\n');
    
    // Test 3: Detect income from transactions
    console.log('Test 3: Detecting income from transactions');
    const detection = await detectMonthlyIncomeV2(testUserId);
    
    if (detection && detection.monthlyIncome > 0) {
      console.log('✅ Income detected successfully:');
      console.log(`   Monthly: $${detection.monthlyIncome.toLocaleString()}`);
      console.log(`   Confidence: ${detection.confidence}%`);
      console.log(`   Source: ${detection.source}`);
      
      // Expected monthly: $2500 * 26 / 12 = ~$5416
      const expectedMonthly = Math.round(biweeklyAmount * 26 / 12);
      if (Math.abs(detection.monthlyIncome - expectedMonthly) < 100) {
        console.log(`   ✅ Amount matches expected (~$${expectedMonthly})\n`);
        passed++;
      } else {
        console.log(`   ❌ Amount doesn't match expected (~$${expectedMonthly})\n`);
        failed++;
      }
    } else {
      console.log('❌ Failed to detect income\n');
      failed++;
    }
    
    // Test 4: Budget with no income
    console.log('Test 4: Budget calculation with no income');
    const noIncomeBudget = await calculateBudgetV2('b2c3d4e5-f6a7-8901-bcde-' + Date.now().toString().slice(-12).padStart(12, '0'));
    
    if (noIncomeBudget.isPlaceholder && noIncomeBudget.totalPercentage === 0) {
      console.log('✅ Returns placeholder budget when no income');
      console.log(`   Message: "${noIncomeBudget.message}"\n`);
      passed++;
    } else {
      console.log('❌ Should return placeholder budget\n');
      failed++;
    }
    
    // Test 5: Create user with income for budget test
    console.log('Test 5: Budget calculation with income');
    budgetUserId = 'c3d4e5f6-a7b8-9012-cdef-' + Date.now().toString().slice(-12).padStart(12, '0');
    const monthlyIncome = 6000;
    
    // Create user first
    await prisma.users.create({
      data: {
        id: budgetUserId,
        email: 'budget@example.com',
        password_hash: 'test_hash_not_used',
        first_name: 'Budget',
        last_name: 'Test',
        is_active: true,
        is_advisor: false,
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    
    await prisma.user_preferences.create({
      data: {
        id: crypto.randomUUID(),
        user_id: budgetUserId,
        theme: 'system',
        notifications_enabled: true,
        email_notifications: true,
        push_notifications: false,
        currency: 'USD',
        timezone: 'America/New_York',
        language: 'en',
        financial_goals: {
          monthlyIncome
        },
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    
    const budget = await calculateBudgetV2(budgetUserId);
    
    if (!budget.isPlaceholder && budget.totalPercentage === 100) {
      console.log('✅ Budget calculated correctly:');
      console.log(`   Monthly Income: $${budget.monthlyIncome.toLocaleString()}`);
      console.log(`   Total Percentage: ${budget.totalPercentage}%`);
      console.log('   Categories:');
      
      let hasCorrectSplit = true;
      budget.categories.forEach(cat => {
        console.log(`   - ${cat.label}: $${cat.amount.toLocaleString()} (${cat.percentage}%)`);
        
        // Check 50/30/20 split
        if (cat.id === 'needs' && cat.percentage !== 50) hasCorrectSplit = false;
        if (cat.id === 'wants' && cat.percentage !== 30) hasCorrectSplit = false;
        if (cat.id === 'savings' && cat.percentage !== 20) hasCorrectSplit = false;
      });
      
      if (hasCorrectSplit) {
        console.log('   ✅ 50/30/20 split is correct\n');
        passed++;
      } else {
        console.log('   ❌ 50/30/20 split is incorrect\n');
        failed++;
      }
    } else {
      console.log('❌ Budget calculation failed');
      console.log(`   Is Placeholder: ${budget.isPlaceholder}`);
      console.log(`   Total Percentage: ${budget.totalPercentage}%\n`);
      failed++;
    }
    
    // Test 6: Budget with expense transactions
    console.log('Test 6: Budget with detected expenses');
    
    // Create an account for expense transactions
    const expenseAccountId = crypto.randomUUID();
    await prisma.accounts.create({
      data: {
        id: expenseAccountId,
        user_id: budgetUserId,
        plaid_account_id: 'test-expense-account-' + Date.now(),
        name: 'Expense Account',
        type: 'depository',
        subtype: 'checking',
        balance: 5000,
        currency: 'USD',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    
    // Add some expense transactions
    const expenses = [
      { name: 'RENT PAYMENT', amount: 2000, category: 'MORTGAGE_AND_RENT' },
      { name: 'GROCERY STORE', amount: 150, category: 'FOOD_AND_DRINK' },
      { name: 'ELECTRIC BILL', amount: 100, category: 'BILLS_AND_UTILITIES' },
      { name: 'GAS STATION', amount: 60, category: 'TRANSPORTATION' }
    ];
    
    for (const expense of expenses) {
      await prisma.transactions.create({
        data: {
          id: crypto.randomUUID(),
          user_id: budgetUserId,
          account_id: expenseAccountId, // Use the created account
          plaid_transaction_id: 'exp-' + Date.now() + Math.random(),
          amount: expense.amount, // Positive = expense in Plaid
          currency_code: 'USD',
          date: new Date(),
          name: expense.name,
          category: expense.category,
          pending: false,
          created_at: new Date()
        }
      });
    }
    
    // Create Plaid connection to trigger detected budget
    await prisma.plaid_connections.create({
      data: {
        id: crypto.randomUUID(),
        user_id: budgetUserId,
        plaid_access_token: 'test-token',
        plaid_item_id: 'test-item-' + Date.now(),
        plaid_institution_id_text: 'test-institution',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    });
    
    const detectedBudget = await calculateBudgetV2(budgetUserId);
    
    if (detectedBudget.categories.length > 0) {
      console.log('✅ Budget includes detected expenses:');
      detectedBudget.categories.forEach(cat => {
        console.log(`   - ${cat.label}: $${cat.amount.toLocaleString()}`);
      });
      console.log('');
      passed++;
    } else {
      console.log('❌ Failed to detect expenses in budget\n');
      failed++;
    }
    
  } catch (error) {
    console.error('❌ Test crashed:', error);
    failed++;
  } finally {
    // Cleanup test data
    const usersToClean = [testUserId];
    if (budgetUserId) usersToClean.push(budgetUserId);
    
    await prisma.transactions.deleteMany({
      where: { 
        user_id: { in: usersToClean }
      }
    });
    await prisma.accounts.deleteMany({
      where: { 
        user_id: { in: usersToClean }
      }
    });
    await prisma.user_preferences.deleteMany({
      where: { 
        user_id: { in: usersToClean }
      }
    });
    await prisma.plaid_connections.deleteMany({
      where: { 
        user_id: { in: usersToClean }
      }
    });
    await prisma.users.deleteMany({
      where: { 
        id: { in: usersToClean }
      }
    });
    await prisma.$disconnect();
  }
  
  // Summary
  console.log('═══════════════════════════════════════════════════');
  console.log('\n📊 Income & Budget Test Results:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Total: ${passed + failed}`);
  console.log(`   Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%\n`);
  
  if (failed === 0) {
    console.log('🎉 Income detection and budget calculation working perfectly!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Review the implementation.\n');
    process.exit(1);
  }
}

// Run the test
testIncomeAndBudget().catch(console.error);