/**
 * Test script for AI Budget Generation
 * 
 * This script tests the AI budget generation functionality for logged-in users
 * with different budgeting frameworks.
 */

import { generateAIBudget } from '../lib/ai-budget-generator';
import prisma from '../lib/db';

// Test user ID (replace with an actual test user ID from your database)
const TEST_USER_ID = 'test-user-id-here';

// Budgeting frameworks to test
const FRAMEWORKS = [
  '50-30-20',
  'zero-based',
  'envelope',
  'pay-yourself-first'
];

async function testBudgetGeneration() {
  console.log('🚀 Starting AI Budget Generation Tests\n');
  console.log('=' .repeat(60));
  
  for (const framework of FRAMEWORKS) {
    console.log(`\n📊 Testing ${framework.toUpperCase()} Framework`);
    console.log('-'.repeat(60));
    
    try {
      // Generate budget with specified framework
      const result = await generateAIBudget(TEST_USER_ID, framework);
      
      // Display results
      console.log(`✅ Successfully generated budget`);
      console.log(`   Total Budget: $${result.totalBudget.toLocaleString()}`);
      console.log(`   Categories: ${result.categories.length}`);
      console.log(`   Framework: ${result.framework}`);
      
      // Show category breakdown
      console.log('\n   Category Breakdown:');
      const essentials = result.categories.filter(c => c.priority === 'essential');
      const discretionary = result.categories.filter(c => c.priority === 'discretionary');
      const savings = result.categories.filter(c => c.priority === 'savings');
      
      console.log(`   - Essential: ${essentials.length} categories`);
      if (essentials.length > 0) {
        const essentialTotal = essentials.reduce((sum, c) => sum + c.amount, 0);
        console.log(`     Total: $${essentialTotal.toLocaleString()}`);
        essentials.slice(0, 3).forEach(c => {
          console.log(`     • ${c.category}: $${c.amount}`);
        });
      }
      
      console.log(`   - Discretionary: ${discretionary.length} categories`);
      if (discretionary.length > 0) {
        const discretionaryTotal = discretionary.reduce((sum, c) => sum + c.amount, 0);
        console.log(`     Total: $${discretionaryTotal.toLocaleString()}`);
        discretionary.slice(0, 3).forEach(c => {
          console.log(`     • ${c.category}: $${c.amount}`);
        });
      }
      
      console.log(`   - Savings: ${savings.length} categories`);
      if (savings.length > 0) {
        const savingsTotal = savings.reduce((sum, c) => sum + c.amount, 0);
        console.log(`     Total: $${savingsTotal.toLocaleString()}`);
        const savingsRate = (savingsTotal / result.totalBudget * 100).toFixed(1);
        console.log(`     Savings Rate: ${savingsRate}%`);
        savings.forEach(c => {
          console.log(`     • ${c.category}: $${c.amount}`);
        });
      }
      
      // Display insights
      if (result.insights.length > 0) {
        console.log('\n   Insights:');
        result.insights.forEach(insight => {
          console.log(`   💡 ${insight}`);
        });
      }
      
      // Display warnings
      if (result.warnings && result.warnings.length > 0) {
        console.log('\n   ⚠️  Warnings:');
        result.warnings.forEach(warning => {
          console.log(`   - ${warning}`);
        });
      }
      
    } catch (error) {
      console.error(`❌ Failed to generate budget: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ AI Budget Generation Tests Complete\n');
}

async function testIncomeDetection() {
  console.log('\n💰 Testing Income Detection');
  console.log('-'.repeat(60));
  
  try {
    // Check if user has recurring income defined
    const recurringIncome = await prisma.recurring_income.findMany({
      where: { user_id: TEST_USER_ID }
    });
    
    console.log(`Found ${recurringIncome.length} recurring income sources`);
    recurringIncome.forEach(income => {
      console.log(`  - ${income.source}: $${income.gross_monthly}/month`);
    });
    
    // Check recent income transactions
    const incomeTransactions = await prisma.transactions.count({
      where: {
        user_id: TEST_USER_ID,
        amount: { lt: 0 }, // Negative = income in Plaid
        date: {
          gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) // Last 6 months
        }
      }
    });
    
    console.log(`Found ${incomeTransactions} income transactions in last 6 months`);
    
  } catch (error) {
    console.error('Failed to check income:', error.message);
  }
}

async function testSpendingPatterns() {
  console.log('\n💳 Testing Spending Pattern Analysis');
  console.log('-'.repeat(60));
  
  try {
    // Get spending summary
    const transactions = await prisma.transactions.findMany({
      where: {
        user_id: TEST_USER_ID,
        amount: { gt: 0 }, // Positive = spending in Plaid
        date: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // Last 3 months
        }
      },
      select: {
        category: true,
        amount: true
      }
    });
    
    // Group by category
    const spendingByCategory = new Map<string, number>();
    transactions.forEach(tx => {
      const category = tx.category || 'Uncategorized';
      const current = spendingByCategory.get(category) || 0;
      spendingByCategory.set(category, current + tx.amount);
    });
    
    // Sort by amount
    const sortedCategories = Array.from(spendingByCategory.entries())
      .sort((a, b) => b[1] - a[1]);
    
    console.log(`Found ${transactions.length} transactions across ${sortedCategories.length} categories`);
    console.log('\nTop 5 Spending Categories:');
    sortedCategories.slice(0, 5).forEach(([category, amount]) => {
      const monthly = amount / 3;
      console.log(`  - ${category}: $${monthly.toFixed(2)}/month average`);
    });
    
  } catch (error) {
    console.error('Failed to analyze spending:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║           AI BUDGET GENERATION TEST SUITE                  ║
╚════════════════════════════════════════════════════════════╝
`);
  
  // First check if test user exists
  const user = await prisma.users.findUnique({
    where: { id: TEST_USER_ID }
  });
  
  if (!user) {
    console.error(`❌ Test user with ID '${TEST_USER_ID}' not found.`);
    console.log('Please update TEST_USER_ID with a valid user ID from your database.\n');
    await prisma.$disconnect();
    process.exit(1);
  }
  
  console.log(`Testing with user: ${user.first_name} ${user.last_name} (${user.email})\n`);
  
  // Run income detection test
  await testIncomeDetection();
  
  // Run spending pattern analysis
  await testSpendingPatterns();
  
  // Run budget generation tests
  await testBudgetGeneration();
  
  // Cleanup
  await prisma.$disconnect();
}

// Execute tests
runTests().catch(console.error);