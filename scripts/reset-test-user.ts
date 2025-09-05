/**
 * Reset/cleanup test users from the database
 * Usage: npm run reset:test-users [email]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetTestUsers(emailPattern?: string) {
  try {
    console.log('🧹 Cleaning up test users...\n');
    
    // Find test users
    const whereClause = emailPattern 
      ? { email: { contains: emailPattern } }
      : { 
          OR: [
            { email: { contains: 'test_' } },
            { email: { contains: '@example.com' } },
            { email: { contains: '@truefi.ai' } }
          ]
        };
    
    const testUsers = await prisma.users.findMany({
      where: whereClause,
      select: { id: true, email: true }
    });
    
    if (testUsers.length === 0) {
      console.log('No test users found.');
      return;
    }
    
    console.log(`Found ${testUsers.length} test user(s):`);
    testUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.id})`);
    });
    
    console.log('\nDeleting related data...');
    
    for (const user of testUsers) {
      // Delete in order of dependencies
      await prisma.chat_messages.deleteMany({ where: { user_id: user.id } });
      await prisma.chat_sessions.deleteMany({ where: { user_id: user.id } });
      await prisma.user_onboarding_responses.deleteMany({ where: { user_id: user.id } });
      await prisma.onboarding_progress.deleteMany({ where: { user_id: user.id } });
      await prisma.user_preferences.deleteMany({ where: { user_id: user.id } });
      await prisma.user_identity.deleteMany({ where: { user_id: user.id } });
      await prisma.user_demographics.deleteMany({ where: { user_id: user.id } });
      await prisma.budgets.deleteMany({ where: { user_id: user.id } });
      await prisma.goals.deleteMany({ where: { user_id: user.id } });
      await prisma.plaid_items.deleteMany({ where: { user_id: user.id } });
      await prisma.plaid_accounts.deleteMany({ where: { user_id: user.id } });
      await prisma.assets.deleteMany({ where: { user_id: user.id } });
      await prisma.liabilities.deleteMany({ where: { user_id: user.id } });
      
      // Finally delete the user
      await prisma.users.delete({ where: { id: user.id } });
      
      console.log(`  ✅ Deleted: ${user.email}`);
    }
    
    console.log('\n✨ Cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
const emailPattern = process.argv[2];
resetTestUsers(emailPattern).then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});