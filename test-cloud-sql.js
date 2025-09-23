const { Client } = require('pg');

// Test with non-encoded password
const client1 = new Client({
  host: '35.184.67.212',
  port: 5432,
  database: 'truefi_app_data',
  user: 'truefi_user',
  password: 'Truefi.ai101$',
  ssl: false
});

// Test with encoded password in connection string
const client2 = new Client({
  connectionString: 'postgresql://truefi_user:Truefi.ai101%24@35.184.67.212:5432/truefi_app_data?sslmode=disable'
});

async function testConnection() {
  console.log('Testing Cloud SQL connection...\n');

  // Test 1: Direct connection with plain password
  try {
    console.log('Test 1: Connecting with plain password...');
    await client1.connect();
    const res = await client1.query('SELECT NOW()');
    console.log('✅ SUCCESS with plain password!');
    console.log('Server time:', res.rows[0].now);
    await client1.end();
  } catch (err) {
    console.log('❌ FAILED with plain password:', err.message);
  }

  console.log('\n---\n');

  // Test 2: Connection string with encoded password
  try {
    console.log('Test 2: Connecting with URL-encoded password...');
    await client2.connect();
    const res = await client2.query('SELECT NOW()');
    console.log('✅ SUCCESS with URL-encoded password!');
    console.log('Server time:', res.rows[0].now);
    await client2.end();
  } catch (err) {
    console.log('❌ FAILED with URL-encoded password:', err.message);
  }

  console.log('\n---\n');
  console.log('If both fail, the password might be wrong in Cloud SQL.');
  console.log('If one works, use that format in Vercel.');
}

testConnection();