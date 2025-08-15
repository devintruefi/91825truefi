/**
 * Test Plaid link token creation through the frontend API
 */

const fetch = require('node-fetch');

async function testFrontendPlaid() {
  console.log('========================================');
  console.log('Testing Plaid Through Frontend API');
  console.log('========================================\n');

  // Test the Next.js API route that proxies to backend
  console.log('1. Testing Next.js API route...');
  const plaidResponse = await fetch('http://localhost:3000/api/plaid/link-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: 'e3703e34-0dc7-488a-aff3-47d9751ebb68',
      user_email: 'devinpatel_18@yahoo.com'
    })
  });

  console.log(`  Response status: ${plaidResponse.status}`);
  
  const responseText = await plaidResponse.text();
  console.log('  Raw response:', responseText);

  if (plaidResponse.ok) {
    try {
      const plaidData = JSON.parse(responseText);
      console.log('\n✓ Frontend API route works!');
      console.log(`  Token: ${plaidData.link_token.substring(0, 50)}...`);
    } catch (e) {
      console.error('Failed to parse response:', e);
    }
  } else {
    console.error('\n✗ Frontend API route failed');
    try {
      const errorData = JSON.parse(responseText);
      console.error('  Error:', errorData.error || errorData);
    } catch (e) {
      console.error('  Error:', responseText);
    }
  }

  console.log('\n========================================');
  console.log('Test Complete');
  console.log('========================================');
}

// Run the test
testFrontendPlaid().catch(console.error);