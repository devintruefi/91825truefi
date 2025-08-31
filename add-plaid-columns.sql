-- Add plaid_type and plaid_subtype columns to accounts table
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS plaid_type TEXT,
ADD COLUMN IF NOT EXISTS plaid_subtype TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_plaid_type 
ON accounts(plaid_type) 
WHERE plaid_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_plaid_subtype 
ON accounts(plaid_subtype) 
WHERE plaid_subtype IS NOT NULL;