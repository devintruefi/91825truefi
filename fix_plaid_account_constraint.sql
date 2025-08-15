-- Fix for Plaid account linking error
-- This adds the missing unique constraint on plaid_account_id

-- First, check if the constraint already exists and drop it if it does
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS ix_accounts_plaid_account_id;

-- Add the unique constraint on plaid_account_id
ALTER TABLE accounts ADD CONSTRAINT ix_accounts_plaid_account_id UNIQUE (plaid_account_id);

-- Also ensure the index exists for performance
CREATE INDEX IF NOT EXISTS idx_accounts_plaid_id ON accounts(plaid_account_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);