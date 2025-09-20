import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensurePlaidTables() {
  console.log('Ensuring plaid_connections table exists...');

  try {
    // Check if table exists by trying to query it
    await prisma.$queryRaw`SELECT 1 FROM plaid_connections LIMIT 1`;
    console.log('✅ plaid_connections table already exists');
  } catch (error: any) {
    if (error.code === 'P2010' || error.message?.includes('does not exist')) {
      console.log('Creating plaid_connections table...');

      // Create the table
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS plaid_connections (
          id UUID PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          plaid_access_token VARCHAR(255) NOT NULL,
          plaid_item_id VARCHAR(255) UNIQUE NOT NULL,
          plaid_institution_id_text VARCHAR(255) NOT NULL,
          institution_id UUID,
          institution_name TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          last_sync_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;

      // Create indexes
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_plaid_connections_user_id ON plaid_connections(user_id)`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_plaid_connections_item_id ON plaid_connections(plaid_item_id)`;
      await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS idx_plaid_connections_institution ON plaid_connections(plaid_institution_id_text)`;

      console.log('✅ plaid_connections table created successfully');
    } else {
      console.error('Unexpected error:', error);
      throw error;
    }
  }

  await prisma.$disconnect();
}

ensurePlaidTables().catch(console.error);