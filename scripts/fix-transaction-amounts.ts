/**
 * Script to fix transaction amounts in the database
 * 
 * Context: Plaid returns positive amounts for debits (expenses) and negative for credits (income)
 * Our convention: negative amounts for expenses, positive for income
 * This script negates all existing transaction amounts to fix the sign convention
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTransactionAmounts() {
  console.log('Starting transaction amount fix...');
  
  try {
    // Get all transactions - we'll filter for Plaid ones
    const allTransactions = await prisma.transactions.findMany({
      select: {
        id: true,
        amount: true,
        name: true,
        category: true,
        plaid_transaction_id: true,
        user_id: true,
        date: true
      }
    });
    
    // Filter for Plaid transactions (those with plaid_transaction_id)
    const plaidTransactions = allTransactions.filter(t => t.plaid_transaction_id !== null && t.plaid_transaction_id !== '');
    
    console.log(`Found ${plaidTransactions.length} Plaid transactions to fix`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    
    for (const transaction of plaidTransactions) {
      // Check if this transaction needs fixing
      // If it's an expense (should be negative) but is positive, or
      // if it's income (should be positive) but is negative based on category
      
      const categoryLower = transaction.category?.toLowerCase() || '';
      const nameLower = transaction.name?.toLowerCase() || '';
      
      // Income detection logic (should be positive in our system)
      const isLikelyIncome = 
        categoryLower.includes('transfer') ||
        categoryLower.includes('deposit') ||
        categoryLower.includes('payroll') ||
        categoryLower.includes('salary') ||
        nameLower.includes('payroll') ||
        nameLower.includes('salary') ||
        nameLower.includes('direct dep') ||
        nameLower.includes('wages');
      
      // Check if sign needs to be flipped
      let needsFix = false;
      
      if (isLikelyIncome) {
        // Income should be positive in our system
        // In Plaid, income is negative, so after negation it should be positive
        // If current amount matches what we expect after fix, it's already fixed
        needsFix = Number(transaction.amount) < 0; // Currently negative (Plaid format), needs to be positive
      } else {
        // Expense should be negative in our system
        // In Plaid, expenses are positive, so after negation they should be negative
        // If current amount matches what we expect after fix, it's already fixed
        needsFix = Number(transaction.amount) > 0; // Currently positive (Plaid format), needs to be negative
      }
      
      if (needsFix) {
        // Negate the amount
        await prisma.transactions.update({
          where: { id: transaction.id },
          data: {
            amount: -Number(transaction.amount)
          }
        });
        
        console.log(`Fixed transaction: ${transaction.name} - ${transaction.category} | ${transaction.amount} -> ${-Number(transaction.amount)}`);
        fixedCount++;
      } else {
        skippedCount++;
      }
    }
    
    console.log(`\nTransaction fix complete!`);
    console.log(`Fixed: ${fixedCount} transactions`);
    console.log(`Already correct: ${skippedCount} transactions`);
    
    // Verify the fix by checking a few examples
    console.log('\nVerifying fix with sample transactions:');
    
    const samples = await prisma.transactions.findMany({
      where: {
        plaid_transaction_id: {
          not: null
        }
      },
      take: 10,
      orderBy: {
        date: 'desc'
      },
      select: {
        name: true,
        amount: true,
        category: true
      }
    });
    
    samples.forEach(s => {
      const sign = Number(s.amount) > 0 ? '+' : '';
      console.log(`  ${s.name}: ${sign}${s.amount} (${s.category || 'no category'})`);
    });
    
  } catch (error) {
    console.error('Error fixing transaction amounts:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixTransactionAmounts()
  .then(() => {
    console.log('\nScript completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript failed:', error);
    process.exit(1);
  });