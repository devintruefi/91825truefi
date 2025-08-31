/**
 * Simple test to verify NO FALLBACK MESSAGE appears in onboarding
 */

import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';
import * as crypto from 'crypto';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3003';

async function testNoFallback() {
  console.log('=== CRITICAL TEST: Verify NO Fallback Messages ===\n');
  
  const testUserId = crypto.randomUUID();
  const testEmail = `test_${Date.now()}@example.com`;
  
  try {
    // Create user
    await prisma.users.create({
      data: {
        id: testUserId,
        email: testEmail,
        password_hash: 'test',
        first_name: 'Test',
        last_name: 'User',
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true,
        is_advisor: false
      }
    });
    
    const testToken = Buffer.from(JSON.stringify({
      userId: testUserId,
      user_id: testUserId,
      sub: testUserId,
      first_name: 'Test',
      email: testEmail,
      iat: Date.now(),
      exp: Date.now() + (24 * 60 * 60 * 1000)
    })).toString('base64');
    
    // Initialize onboarding
    console.log('Initializing onboarding...');
    const initResponse = await fetch(`${BASE_URL}/api/onboarding/v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`
      },
      body: JSON.stringify({
        action: 'initialize',
        userId: testUserId
      })
    });
    
    const initData = await initResponse.json();
    const question = initData.component?.question || 
                    initData.component?.componentData?.question || 
                    JSON.stringify(initData);
    
    console.log('Response status:', initResponse.status);
    console.log('Question received:', question);
    
    // THE CRITICAL CHECK
    if (question.includes("didn't load properly") || 
        question.includes("Looks like that") ||
        question.includes("fallback")) {
      console.error('\n❌❌❌ FAIL: FALLBACK MESSAGE DETECTED! ❌❌❌');
      console.error('This is the exact issue the user complained about!\n');
      return false;
    }
    
    console.log('\n✅✅✅ SUCCESS: NO FALLBACK MESSAGE! ✅✅✅');
    console.log('The onboarding flow is working properly!\n');
    
    // Clean up
    await prisma.user_onboarding_responses.deleteMany({ where: { user_id: testUserId } });
    await prisma.onboarding_progress.deleteMany({ where: { user_id: testUserId } });
    await prisma.users.delete({ where: { id: testUserId } });
    
    return true;
    
  } catch (error) {
    console.error('Test error:', error);
    // Clean up on error
    try {
      await prisma.user_onboarding_responses.deleteMany({ where: { user_id: testUserId } });
      await prisma.onboarding_progress.deleteMany({ where: { user_id: testUserId } });
      await prisma.users.delete({ where: { id: testUserId } });
    } catch {}
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testNoFallback().then(success => {
  if (success) {
    console.log('✅ The fallback issue has been FIXED!');
  } else {
    console.log('❌ The fallback issue still exists!');
  }
  process.exit(success ? 0 : 1);
});