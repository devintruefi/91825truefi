-- Migration to add Plaid-related tables
-- Run this with: psql -U truefi_user -d truefi_app_data -f migration_plaid_tables.sql

-- Create plaid_items table
CREATE TABLE IF NOT EXISTS plaid_items (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    item_id TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create accounts table for Plaid accounts
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plaid_account_id TEXT UNIQUE,
    plaid_item_id TEXT REFERENCES plaid_items(item_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT,
    subtype TEXT,
    balance_current DECIMAL(15,2) DEFAULT 0,
    balance_available DECIMAL(15,2) DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_plaid_items_user_id ON plaid_items(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_plaid_item_id ON accounts(plaid_item_id);

-- Add any missing columns to existing tables if needed
DO $$ 
BEGIN
    -- Add plaid_account_id to accounts if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'plaid_account_id') THEN
        ALTER TABLE accounts ADD COLUMN plaid_account_id TEXT UNIQUE;
    END IF;
    
    -- Add plaid_item_id to accounts if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'plaid_item_id') THEN
        ALTER TABLE accounts ADD COLUMN plaid_item_id TEXT REFERENCES plaid_items(item_id) ON DELETE CASCADE;
    END IF;
END $$; 