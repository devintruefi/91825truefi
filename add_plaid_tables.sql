-- Add plaid_connections table if it doesn't exist
CREATE TABLE IF NOT EXISTS plaid_connections (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    item_id TEXT NOT NULL,
    institution_id TEXT,
    institution_name TEXT,
    accounts_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_plaid_connections_user_id ON plaid_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_connections_item_id ON plaid_connections(item_id);

-- Add plaid_accounts table if it doesn't exist
CREATE TABLE IF NOT EXISTS plaid_accounts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    connection_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    name TEXT NOT NULL,
    official_name TEXT,
    type TEXT,
    subtype TEXT,
    mask TEXT,
    current_balance DECIMAL(19, 2),
    available_balance DECIMAL(19, 2),
    iso_currency_code TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (connection_id) REFERENCES plaid_connections(id) ON DELETE CASCADE
);

-- Add indexes for plaid_accounts
CREATE INDEX IF NOT EXISTS idx_plaid_accounts_connection_id ON plaid_accounts(connection_id);
CREATE INDEX IF NOT EXISTS idx_plaid_accounts_account_id ON plaid_accounts(account_id);

-- Add plaid_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS plaid_transactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    account_id TEXT NOT NULL,
    transaction_id TEXT NOT NULL UNIQUE,
    amount DECIMAL(19, 2) NOT NULL,
    iso_currency_code TEXT,
    name TEXT,
    merchant_name TEXT,
    date DATE NOT NULL,
    pending BOOLEAN DEFAULT false,
    category JSONB,
    location JSONB,
    payment_meta JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES plaid_accounts(id) ON DELETE CASCADE
);

-- Add indexes for plaid_transactions
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_account_id ON plaid_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_date ON plaid_transactions(date);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_transaction_id ON plaid_transactions(transaction_id);